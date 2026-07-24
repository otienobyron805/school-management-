import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { db } from "./src/db/index.ts";
import * as schema from "./src/db/schema.ts";
import { eq } from "drizzle-orm";
import { checkMongoStatus, getMongoClient } from "./src/db/mongodb.ts";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for parsing JSON requests with higher limit (since we send entire tables in bulk)
  app.use(express.json({ limit: '10mb' }));

  // API endpoints FIRST

  app.get("/api/health", async (req, res) => {
    const isDbConfigured = !!(process.env.SQL_HOST && process.env.SQL_DB_NAME);
    const mongoStatus = await checkMongoStatus();
    res.json({ 
      status: "ok", 
      database: isDbConfigured ? "configured" : "missing",
      mongodb: mongoStatus,
      timestamp: new Date().toISOString()
    });
  });

  // --- MONGODB ENDPOINTS ---
  app.get("/api/mongo/status", async (req, res) => {
    try {
      const status = await checkMongoStatus();
      res.json(status);
    } catch (error: any) {
      res.status(500).json({ connected: false, message: error.message });
    }
  });

  app.get("/api/mongo/collections", async (req, res) => {
    try {
      const { db: mongoDb } = await getMongoClient();
      const collections = await mongoDb.listCollections().toArray();
      const result = [];
      for (const col of collections) {
        const count = await mongoDb.collection(col.name).countDocuments();
        result.push({ name: col.name, count });
      }
      res.json({ success: true, collections: result, dbName: mongoDb.databaseName });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || "Failed to list MongoDB collections" });
    }
  });

  app.post("/api/mongo/save", async (req, res) => {
    const { collectionName, data } = req.body;
    if (!collectionName || !data) {
      return res.status(400).json({ success: false, error: "Missing collectionName or data" });
    }
    try {
      const { db: mongoDb } = await getMongoClient();
      const collection = mongoDb.collection(collectionName);
      if (Array.isArray(data)) {
        await collection.deleteMany({});
        if (data.length > 0) {
          const docs = data.map((item: any) => ({
            ...item,
            _id: item.id || item._id || undefined,
            syncedAt: new Date(),
          }));
          await collection.insertMany(docs);
        }
      } else {
        await collection.updateOne(
          { _id: data.id || data._id || 'default' },
          { $set: { ...data, syncedAt: new Date() } },
          { upsert: true }
        );
      }
      res.json({ success: true, message: `Successfully synced collection '${collectionName}' to MongoDB` });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || "Failed to save data to MongoDB" });
    }
  });

  app.post("/api/mongo/query", async (req, res) => {
    const { collectionName, query = {}, limit = 50 } = req.body;
    if (!collectionName) {
      return res.status(400).json({ success: false, error: "Missing collectionName parameter" });
    }
    try {
      const { db: mongoDb } = await getMongoClient();
      const docs = await mongoDb.collection(collectionName).find(query).limit(limit).toArray();
      res.json({ success: true, documents: docs, count: docs.length });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || "Failed to query MongoDB collection" });
    }
  });


  // 1. Unified Sync endpoint (Fetches all data in one go)
  app.get("/api/sync", async (req, res) => {
    if (!process.env.SQL_HOST) {
      console.warn("Sync requested but SQL_HOST is not set. Returning empty data.");
      return res.json({ success: true, data: {}, message: "Database not configured" });
    }
    try {
      console.log("Sync requested from database...");
      
      const grades = await db.select().from(schema.dbGrades);
      const subjects = await db.select().from(schema.dbSubjects);
      const learners = await db.select().from(schema.dbLearners);
      const gradingRules = await db.select().from(schema.dbGradingRules);
      const users = await db.select().from(schema.dbUsers);
      const holidays = await db.select().from(schema.dbHolidays);
      const terms = await db.select().from(schema.dbTerms);
      const attendanceSheets = await db.select().from(schema.dbAttendanceSheets);
      const messages = await db.select().from(schema.dbMessages);
      const staffAttendanceSheets = await db.select().from(schema.dbStaffAttendanceSheets);

      const schoolProfileRes = await db.select().from(schema.dbSchoolProfile).where(eq(schema.dbSchoolProfile.key, 'school_profile'));
      const subjectEnrollmentsRes = await db.select().from(schema.dbSubjectEnrollments).where(eq(schema.dbSubjectEnrollments.key, 'subject_enrollments'));
      const subjectAssignmentsRes = await db.select().from(schema.dbSubjectAssignments).where(eq(schema.dbSubjectAssignments.key, 'subject_assignments_list'));
      const classTeacherAssignmentsRes = await db.select().from(schema.dbClassTeacherAssignments).where(eq(schema.dbClassTeacherAssignments.key, 'class_teacher_assignments_list'));
      const examsRes = await db.select().from(schema.dbExams).where(eq(schema.dbExams.key, 'exams'));
      const examMarksRes = await db.select().from(schema.dbExamMarks).where(eq(schema.dbExamMarks.key, 'school_exam_marks'));
      const subjectPapersRes = await db.select().from(schema.dbSubjectPapers).where(eq(schema.dbSubjectPapers.key, 'school_subject_papers'));

      res.json({
        success: true,
        data: {
          grades,
          subjects,
          learners,
          gradingRules,
          users,
          holidays,
          terms,
          attendanceSheets,
          messages,
          staffAttendanceSheets,
          schoolProfile: schoolProfileRes[0]?.data || null,
          subjectEnrollments: subjectEnrollmentsRes[0]?.data || null,
          subjectAssignments: subjectAssignmentsRes[0]?.data || null,
          classTeacherAssignments: classTeacherAssignmentsRes[0]?.data || null,
          exams: examsRes[0]?.data || null,
          examMarks: examMarksRes[0]?.data || null,
          subjectPapers: subjectPapersRes[0]?.data || null,
        }
      });
    } catch (error: any) {
      console.error("Sync GET failed:", error);
      res.status(500).json({ success: false, error: error.message || "Failed to sync database" });
    }
  });

  // 2. Save individual collection endpoint
  const saveQueue: Record<string, Promise<any>> = {};

  const enqueueSave = (table: string, task: () => Promise<any>): Promise<any> => {
    const previous = saveQueue[table] || Promise.resolve();
    const next = previous.then(task);
    saveQueue[table] = next.catch(() => {});
    return next;
  };

  app.post("/api/save", async (req, res) => {
    if (!process.env.SQL_HOST) {
      return res.status(503).json({ success: false, error: "Database not configured" });
    }
    const { table, data } = req.body;
    if (!table) {
      return res.status(400).json({ success: false, error: "Missing 'table' parameter" });
    }

    try {
      await enqueueSave(table, async () => {
        console.log(`Saving collection '${table}' to Cloud SQL (sequential queue)...`);

        if (table === "grades") {
          await db.delete(schema.dbGrades);
          if (Array.isArray(data) && data.length > 0) {
            const validGrades = data.filter((g: any) => g && g.id);
            if (validGrades.length > 0) {
              await db.insert(schema.dbGrades).values(
                validGrades.map((g: any) => ({
                  id: String(g.id),
                  name: String(g.name || 'Unknown'),
                  streams: g.streams || [],
                }))
              );
            }
          }
        } else if (table === "subjects") {
          await db.delete(schema.dbSubjects);
          if (Array.isArray(data) && data.length > 0) {
            const validSubjects = data.filter((s: any) => s && s.id);
            if (validSubjects.length > 0) {
              await db.insert(schema.dbSubjects).values(
                validSubjects.map((s: any) => ({
                  id: String(s.id),
                  name: String(s.name || 'Unknown'),
                  code: String(s.code || ''),
                  grades: s.grades || [],
                }))
              );
            }
          }
        } else if (table === "learners") {
          await db.delete(schema.dbLearners);
          if (Array.isArray(data) && data.length > 0) {
            const validLearners = data.filter((l: any) => l && l.id);
            if (validLearners.length > 0) {
              await db.insert(schema.dbLearners).values(
                validLearners.map((l: any) => {
                  const rawGrade = Number(l.grade);
                  const parsedGrade = isNaN(rawGrade) ? 1 : rawGrade;
                  return {
                    id: String(l.id),
                    name: String(l.name || 'Unknown Learner'),
                    admNo: String(l.admNo || ''),
                    grade: parsedGrade,
                    stream: String(l.stream || ''),
                    firstName: l.firstName || null,
                    secondName: l.secondName || null,
                    otherName: l.otherName || null,
                    assessNo: l.assessNo || null,
                    gradeLabel: l.gradeLabel || null,
                    gender: l.gender || null,
                    type: l.type || null,
                    status: l.status || null,
                    parentPhone: l.parentPhone || null,
                  };
                })
              );
            }
          }
        } else if (table === "grading_rules") {
          await db.delete(schema.dbGradingRules);
          if (Array.isArray(data) && data.length > 0) {
            const validRules = data.filter((r: any) => r && r.id);
            if (validRules.length > 0) {
              await db.insert(schema.dbGradingRules).values(
                validRules.map((r: any) => {
                  const rawMin = Number(r.min);
                  const parsedMin = isNaN(rawMin) ? 0 : rawMin;
                  const rawMax = Number(r.max);
                  const parsedMax = isNaN(rawMax) ? 0 : rawMax;
                  const rawPoints = Number(r.points);
                  const parsedPoints = isNaN(rawPoints) ? 0 : rawPoints;
                  return {
                    id: String(r.id),
                    code: String(r.code || ''),
                    min: parsedMin,
                    max: parsedMax,
                    points: parsedPoints,
                    category: String(r.category || ''),
                  };
                })
              );
            }
          }
        } else if (table === "users") {
          await db.delete(schema.dbUsers);
          if (Array.isArray(data) && data.length > 0) {
            const validUsers = data.filter((u: any) => u && u.id && u.username);
            if (validUsers.length > 0) {
              await db.insert(schema.dbUsers).values(
                validUsers.map((u: any) => ({
                  id: String(u.id),
                  username: String(u.username),
                  fullName: String(u.fullName || 'Unknown'),
                  role: String(u.role || 'Staff'),
                  created: String(u.created || new Date().toISOString().split('T')[0]),
                  status: String(u.status || 'Active'),
                  password: u.password || null,
                  staffNo: u.staffNo || null,
                  nationalId: u.nationalId || null,
                  phone: u.phone || null,
                  email: u.email || null,
                  empDate: u.empDate || null,
                  designatedRole: u.designatedRole || null,
                  department: u.department || null,
                  systemRole: u.systemRole || null,
                  adminOverride: u.adminOverride === true || u.adminOverride === 'true' || false,
                  permissions: u.permissions || [],
                }))
              );
            }
          }
        } else if (table === "holidays") {
          await db.delete(schema.dbHolidays);
          if (Array.isArray(data) && data.length > 0) {
            const validHolidays = data.filter((h: any) => h && h.id);
            if (validHolidays.length > 0) {
              await db.insert(schema.dbHolidays).values(
                validHolidays.map((h: any) => ({
                  id: String(h.id),
                  date: String(h.date || ''),
                  name: String(h.name || 'Unknown'),
                }))
              );
            }
          }
        } else if (table === "terms") {
          await db.delete(schema.dbTerms);
          if (Array.isArray(data) && data.length > 0) {
            const validTerms = data.filter((t: any) => t && t.id);
            if (validTerms.length > 0) {
              await db.insert(schema.dbTerms).values(
                validTerms.map((t: any) => ({
                  id: String(t.id),
                  name: String(t.name || ''),
                  startDate: String(t.startDate || ''),
                  endDate: String(t.endDate || ''),
                }))
              );
            }
          }
        } else if (table === "attendance_sheets") {
          await db.delete(schema.dbAttendanceSheets);
          if (Array.isArray(data) && data.length > 0) {
            const validSheets = data.filter((s: any) => s && s.date);
            if (validSheets.length > 0) {
              await db.insert(schema.dbAttendanceSheets).values(
                validSheets.map((s: any) => {
                  const dateVal = s.date || '';
                  const gradeIdVal = s.gradeId || '';
                  const streamIdVal = s.streamId || '';
                  return {
                    id: String(s.id || `${dateVal}_${gradeIdVal}_${streamIdVal}`),
                    date: String(dateVal),
                    gradeId: String(gradeIdVal),
                    streamId: String(streamIdVal),
                    records: s.records || {},
                    lastUpdatedBy: s.lastUpdatedBy || null,
                    lastUpdatedAt: s.lastUpdatedAt || null,
                  };
                })
              );
            }
          }
        } else if (table === "school_profile") {
          await db
            .insert(schema.dbSchoolProfile)
            .values({ key: "school_profile", data })
            .onConflictDoUpdate({
              target: schema.dbSchoolProfile.key,
              set: { data, updatedAt: new Date() },
            });
        } else if (table === "subject_enrollments") {
          await db
            .insert(schema.dbSubjectEnrollments)
            .values({ key: "subject_enrollments", data })
            .onConflictDoUpdate({
              target: schema.dbSubjectEnrollments.key,
              set: { data, updatedAt: new Date() },
            });
        } else if (table === "subject_assignments") {
          await db
            .insert(schema.dbSubjectAssignments)
            .values({ key: "subject_assignments_list", data })
            .onConflictDoUpdate({
              target: schema.dbSubjectAssignments.key,
              set: { data, updatedAt: new Date() },
            });
        } else if (table === "class_teacher_assignments") {
          await db
            .insert(schema.dbClassTeacherAssignments)
            .values({ key: "class_teacher_assignments_list", data })
            .onConflictDoUpdate({
              target: schema.dbClassTeacherAssignments.key,
              set: { data, updatedAt: new Date() },
            });
        } else if (table === "exams") {
          await db
            .insert(schema.dbExams)
            .values({ key: "exams", data })
            .onConflictDoUpdate({
              target: schema.dbExams.key,
              set: { data, updatedAt: new Date() },
            });
        } else if (table === "school_exam_marks") {
          await db
            .insert(schema.dbExamMarks)
            .values({ key: "school_exam_marks", data })
            .onConflictDoUpdate({
              target: schema.dbExamMarks.key,
              set: { data, updatedAt: new Date() },
            });
        } else if (table === "subject_papers") {
          await db
            .insert(schema.dbSubjectPapers)
            .values({ key: "school_subject_papers", data })
            .onConflictDoUpdate({
              target: schema.dbSubjectPapers.key,
              set: { data, updatedAt: new Date() },
            });
        } else if (table === "messages") {
          await db.delete(schema.dbMessages);
          if (Array.isArray(data) && data.length > 0) {
            const validMessages = data.filter((m: any) => m && m.id && m.senderId);
            if (validMessages.length > 0) {
              await db.insert(schema.dbMessages).values(
                validMessages.map((m: any) => {
                  let parsedTimestamp = new Date();
                  if (m.timestamp) {
                    const parsed = new Date(m.timestamp);
                    if (!isNaN(parsed.getTime())) {
                      parsedTimestamp = parsed;
                    }
                  }
                  return {
                    id: String(m.id),
                    senderId: String(m.senderId),
                    receiverId: m.receiverId ? String(m.receiverId) : null,
                    learnerId: String(m.learnerId),
                    text: String(m.text || ''),
                    senderRole: String(m.senderRole || 'Parent'),
                    timestamp: parsedTimestamp,
                    read: m.read === true || m.read === 'true' || false,
                  };
                })
              );
            }
          }
        } else if (table === "staff_attendance_sheets") {
          await db.delete(schema.dbStaffAttendanceSheets);
          if (Array.isArray(data) && data.length > 0) {
            const validStaffSheets = data.filter((s: any) => s && s.date);
            if (validStaffSheets.length > 0) {
              await db.insert(schema.dbStaffAttendanceSheets).values(
                validStaffSheets.map((s: any) => ({
                  id: String(s.id || s.date || ''),
                  date: String(s.date || ''),
                  records: s.records || {},
                  lastUpdatedBy: s.lastUpdatedBy || null,
                  lastUpdatedAt: s.lastUpdatedAt || null,
                }))
              );
            }
          }
        } else {
          throw new Error(`Unsupported collection table: ${table}`);
        }
      });

      res.json({ success: true, message: `Successfully synchronized table: ${table}` });
    } catch (error: any) {
      console.error(`Save POST failed for '${table}':`, error);
      const statusCode = error.message?.includes("Unsupported") ? 400 : 500;
      res.status(statusCode).json({ success: false, error: error.message || `Failed to save ${table}` });
    }
  });

  // Vite middleware for asset serving / compilation
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
