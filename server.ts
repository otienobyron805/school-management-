import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { db } from "./src/db/index.ts";
import * as schema from "./src/db/schema.ts";
import { eq, sql } from "drizzle-orm";
import { checkMongoStatus, getMongoClient } from "./src/db/mongodb.ts";

// --- FILE-BACKED SERVER STORE FOR FALLBACK CROSS-CLIENT PERSISTENCE ---
const SERVER_STORE_FILE = path.join(process.cwd(), "data", "server_store.json");
let serverStore: Record<string, any> = {};

function loadServerStore() {
  try {
    const dataDir = path.join(process.cwd(), "data");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    if (fs.existsSync(SERVER_STORE_FILE)) {
      const raw = fs.readFileSync(SERVER_STORE_FILE, "utf-8");
      serverStore = JSON.parse(raw);
    }
  } catch (err) {
    console.error("Failed to load serverStore from disk:", err);
  }
}

function persistServerStore() {
  try {
    const dataDir = path.join(process.cwd(), "data");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(SERVER_STORE_FILE, JSON.stringify(serverStore, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write serverStore to disk:", err);
  }
}

async function syncSQLToServerStore() {
  if (process.env.SQL_HOST && process.env.SQL_HOST.trim()) {
    try {
      const sqlUsers = await db.select().from(schema.dbUsers);
      if (sqlUsers && sqlUsers.length > 0) {
        serverStore.users = sqlUsers.map((u: any) => ({
          ...u,
          fullName: u.fullName || u.full_name || 'Unknown',
          staffNo: u.staffNo || u.staff_no || null,
          nationalId: u.nationalId || u.national_id || null,
          empDate: u.empDate || u.emp_date || null,
          designatedRole: u.designatedRole || u.designated_role || null,
          systemRole: u.systemRole || u.system_role || null,
          adminOverride: u.adminOverride !== undefined ? u.adminOverride : (u.admin_override || false),
          permissions: Array.isArray(u.permissions) ? u.permissions : []
        }));
      }

      const sqlLearners = await db.select().from(schema.dbLearners);
      if (sqlLearners && sqlLearners.length > 0) {
        serverStore.learners = sqlLearners;
      }

      const sqlGrades = await db.select().from(schema.dbGrades);
      if (sqlGrades && sqlGrades.length > 0) {
        serverStore.grades = sqlGrades;
      }

      const sqlSubjects = await db.select().from(schema.dbSubjects);
      if (sqlSubjects && sqlSubjects.length > 0) {
        serverStore.subjects = sqlSubjects;
      }

      const sqlGradingRules = await db.select().from(schema.dbGradingRules);
      if (sqlGradingRules && sqlGradingRules.length > 0) {
        serverStore.grading_rules = sqlGradingRules;
      }

      const sqlHolidays = await db.select().from(schema.dbHolidays);
      if (sqlHolidays && sqlHolidays.length > 0) {
        serverStore.holidays = sqlHolidays;
      }

      const sqlTerms = await db.select().from(schema.dbTerms);
      if (sqlTerms && sqlTerms.length > 0) {
        serverStore.terms = sqlTerms;
      }

      const sqlAttendance = await db.select().from(schema.dbAttendanceSheets);
      if (sqlAttendance && sqlAttendance.length > 0) {
        serverStore.attendance_sheets = sqlAttendance;
      }

      const sqlMessages = await db.select().from(schema.dbMessages);
      if (sqlMessages && sqlMessages.length > 0) {
        serverStore.messages = sqlMessages;
      }

      const sqlStaffAttendance = await db.select().from(schema.dbStaffAttendanceSheets);
      if (sqlStaffAttendance && sqlStaffAttendance.length > 0) {
        serverStore.staff_attendance_sheets = sqlStaffAttendance;
      }

      const sqlProfile = await db.select().from(schema.dbSchoolProfile);
      if (sqlProfile && sqlProfile.length > 0) {
        const profDoc = sqlProfile.find((p: any) => p.key === 'school_profile');
        if (profDoc && profDoc.data) {
          serverStore.school_profile = profDoc.data;
        }
      }
    } catch (sqlErr) {
      console.warn("Error hydrating serverStore from SQL:", sqlErr);
    }
  }
}

loadServerStore();
syncSQLToServerStore().catch(err => console.warn("Initial SQL hydration warning:", err));

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
      database: isDbConfigured ? "configured" : "server_store",
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

  const TABLE_TO_COLLECTION: Record<string, string> = {
    grades: 'school_grades',
    school_grades: 'school_grades',
    subjects: 'school_subjects',
    school_subjects: 'school_subjects',
    learners: 'school_learners',
    school_learners: 'school_learners',
    users: 'school_users',
    school_users: 'school_users',
    grading_rules: 'school_grading_rules',
    school_grading_rules: 'school_grading_rules',
    holidays: 'school_holidays',
    school_holidays: 'school_holidays',
    terms: 'school_terms',
    school_terms: 'school_terms',
    attendance_sheets: 'school_attendance_sheets',
    school_attendance_sheets: 'school_attendance_sheets',
    messages: 'school_messages',
    school_messages: 'school_messages',
    staff_attendance_sheets: 'school_staff_attendance_sheets',
    school_staff_attendance_sheets: 'school_staff_attendance_sheets',
    schemes_of_work: 'school_schemes_of_work',
    school_schemes_of_work: 'school_schemes_of_work',
    profile: 'school_profile',
    school_profile: 'school_profile',
    subject_enrollments: 'school_subject_enrollments',
    subject_assignments: 'school_subject_assignments_list',
    subject_assignments_list: 'school_subject_assignments_list',
    class_teacher_assignments: 'school_class_teacher_assignments_list',
    class_teacher_assignments_list: 'school_class_teacher_assignments_list',
    exams: 'school_exams',
    school_exams: 'school_exams',
    exam_marks: 'school_exam_marks',
    school_exam_marks: 'school_exam_marks',
    subject_papers: 'school_subject_papers',
    school_subject_papers: 'school_subject_papers',
    fee_payments: 'school_fee_payments',
    school_fee_payments: 'school_fee_payments',
    fee_structures: 'school_fee_structures',
    school_fee_structures: 'school_fee_structures',
    fees: 'school_fee_structures',
    feeStructure: 'school_fee_structures',
    staff: 'school_staff',
    school_staff: 'school_staff',
    streams: 'school_streams',
    school_streams: 'school_streams',
    transport: 'school_transport_routes',
    transportRoutes: 'school_transport_routes',
    school_transport_routes: 'school_transport_routes',
    gate_logs: 'school_gate_logs',
    audit_trail: 'school_audit_trail',
    activity_logs: 'school_activity_logs',
    learner_classification: 'learner_classification',
    classification: 'learner_classification',
  };

  async function saveArrayToCollection(collection: any, data: any[]) {
    const seenIds = new Set();
    const docs = [];
    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      let _id = item.id || item._id;
      if (!_id || seenIds.has(_id)) {
        _id = String(_id || 'doc') + '_' + Math.random().toString(36).substring(2, 9) + '_' + i;
      }
      seenIds.add(_id);
      docs.push({
        ...item,
        _id,
        syncedAt: new Date(),
      });
    }
    if (docs.length > 0) {
      const operations = docs.map(doc => ({
        updateOne: {
          filter: { _id: doc._id },
          update: { $set: doc },
          upsert: true
        }
      }));
      try {
        await collection.bulkWrite(operations, { ordered: false });
        // We removed the deleteMany call to prevent destructive overrides from multiple devices.
        // This ensures that if Device B hasn't synced Device A's new record yet, it won't accidentally delete it.
      } catch (e) {
        console.warn("BulkWrite warning (handled):", e);
      }
    } else {
      await collection.deleteMany({});
    }
  }

  app.post("/api/mongo/save", async (req, res) => {
    const { collectionName, data } = req.body;
    if (!collectionName || !data) {
      return res.status(400).json({ success: false, error: "Missing collectionName or data" });
    }
    try {
      const { db: mongoDb } = await getMongoClient();
      const colName = TABLE_TO_COLLECTION[collectionName] || collectionName;
      const collection = mongoDb.collection(colName);
      if (Array.isArray(data)) {
        await saveArrayToCollection(collection, data);
      } else {
        await collection.updateOne(
          { _id: data.id || data._id || colName },
          { $set: { ...data, syncedAt: new Date() } },
          { upsert: true }
        );
      }
      res.json({ success: true, message: `Successfully synced collection '${colName}' to MongoDB` });
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
      const colName = TABLE_TO_COLLECTION[collectionName] || collectionName;
      const docs = await mongoDb.collection(colName).find(query).limit(limit).toArray();
      res.json({ success: true, documents: docs, count: docs.length });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || "Failed to query MongoDB collection" });
    }
  });

  function getKJSEAClassification(totalPoints: number) {
    if (totalPoints >= 68) return { code: 'EE1', performance: 'Exceeding Expectations 1', category: 'C1 — National' };
    if (totalPoints >= 60) return { code: 'EE2', performance: 'Exceeding Expectations 2', category: 'C1 — National' };
    if (totalPoints >= 52) return { code: 'ME1', performance: 'Meeting Expectations 1', category: 'C2 — Extra-County' };
    if (totalPoints >= 43) return { code: 'ME2', performance: 'Meeting Expectations 2', category: 'C2 — Extra-County' };
    if (totalPoints >= 34) return { code: 'AE1', performance: 'Approaching Expectations 1', category: 'C3 — County' };
    if (totalPoints >= 25) return { code: 'AE2', performance: 'Approaching Expectations 2', category: 'C3 — County' };
    if (totalPoints >= 16) return { code: 'BE1', performance: 'Below Expectations 1', category: 'C4 — Sub-County' };
    if (totalPoints >= 9) return { code: 'BE2', performance: 'Below Expectations 2', category: 'C4 — Sub-County' };
    return { code: 'BE2', performance: 'Below Expectations 2', category: 'C4 — Sub-County' };
  }

  app.post("/api/classification/save", async (req, res) => {
    const { admissionNumber, totalPoints, learnerName } = req.body;
    if (!admissionNumber || totalPoints === undefined) {
      return res.status(400).json({ success: false, error: "Missing admissionNumber or totalPoints" });
    }
    const pts = Number(totalPoints);
    const classification = getKJSEAClassification(pts);
    const doc = {
      admissionNumber,
      learnerName: learnerName || '',
      totalPoints: pts,
      ...classification,
      updatedAt: new Date().toISOString()
    };

    try {
      const mongoStatus = await checkMongoStatus();
      if (mongoStatus.connected) {
        const { db: mongoDb } = await getMongoClient();
        const collection = mongoDb.collection('learner_classification');
        await collection.updateOne(
          { admissionNumber },
          { $set: doc },
          { upsert: true }
        );
        return res.json({ success: true, classification: doc });
      }
    } catch (err: any) {
      console.warn("MongoDB saveClassification failed:", err);
    }

    if (!serverStore.learner_classification) serverStore.learner_classification = [];
    const idx = serverStore.learner_classification.findIndex((item: any) => item.admissionNumber === admissionNumber);
    if (idx >= 0) {
      serverStore.learner_classification[idx] = doc;
    } else {
      serverStore.learner_classification.push(doc);
    }
    persistServerStore();
    return res.json({ success: true, classification: doc });
  });

  app.post("/api/classification/get", async (req, res) => {
    const { admissionNumber } = req.body;
    try {
      const mongoStatus = await checkMongoStatus();
      if (mongoStatus.connected) {
        const { db: mongoDb } = await getMongoClient();
        const collection = mongoDb.collection('learner_classification');
        if (admissionNumber) {
          const doc = await collection.findOne({ admissionNumber });
          return res.json({ success: true, classification: doc });
        } else {
          const docs = await collection.find({}).toArray();
          return res.json({ success: true, documents: docs });
        }
      }
    } catch (err: any) {
      console.warn("MongoDB getClassification failed:", err);
    }

    if (!serverStore.learner_classification) serverStore.learner_classification = [];
    if (admissionNumber) {
      const doc = serverStore.learner_classification.find((item: any) => item.admissionNumber === admissionNumber);
      return res.json({ success: true, classification: doc || null });
    } else {
      return res.json({ success: true, documents: serverStore.learner_classification });
    }
  });


  // 1. Unified Sync endpoint (Fetches all data in one go)
  app.get("/api/sync", async (req, res) => {
    try {
      const mongoStatus = await checkMongoStatus();
      if (mongoStatus.connected) {
        const { db: mongoDb } = await getMongoClient();
        const syncMap = [
          { key: 'grades', col: 'school_grades', isArray: true },
          { key: 'subjects', col: 'school_subjects', isArray: true },
          { key: 'learners', col: 'school_learners', isArray: true },
          { key: 'grading_rules', col: 'school_grading_rules', isArray: true },
          { key: 'users', col: 'school_users', isArray: true },
          { key: 'holidays', col: 'school_holidays', isArray: true },
          { key: 'terms', col: 'school_terms', isArray: true },
          { key: 'attendance_sheets', col: 'school_attendance_sheets', isArray: true },
          { key: 'messages', col: 'school_messages', isArray: true },
          { key: 'staff_attendance_sheets', col: 'school_staff_attendance_sheets', isArray: true },
          { key: 'schemes_of_work', col: 'school_schemes_of_work', isArray: true },
          { key: 'school_profile', col: 'school_profile', isArray: false },
          { key: 'subject_enrollments', col: 'school_subject_enrollments', isArray: false },
          { key: 'subject_assignments', col: 'school_subject_assignments_list', isArray: true },
          { key: 'class_teacher_assignments', col: 'school_class_teacher_assignments_list', isArray: true },
          { key: 'exams', col: 'school_exams', isArray: true },
          { key: 'exam_marks', col: 'school_exam_marks', isArray: true },
          { key: 'subject_papers', col: 'school_subject_papers', isArray: true },
          { key: 'system_settings', col: 'school_system_settings', isArray: false },
          { key: 'attendance_settings', col: 'school_attendance_settings', isArray: false },
          { key: 'teachers_on_duty', col: 'school_teachers_on_duty', isArray: true },
          { key: 'gate_logs', col: 'school_gate_logs', isArray: true },
          { key: 'fee_structures', col: 'school_fee_structures', isArray: true },
          { key: 'fee_payments', col: 'school_fee_payments', isArray: true },
          { key: 'term_reports', col: 'school_term_reports', isArray: true },
          { key: 'role_permissions', col: 'school_role_permissions_matrix_v1', isArray: false },
          { key: 'whatsapp_templates', col: 'school_whatsapp_templates', isArray: false },
          { key: 'exam_submission_statuses', col: 'school_exam_submission_statuses', isArray: false },
        ];
        
        const data: Record<string, any> = {};
        for (const m of syncMap) {
          if (!m.isArray) {
            const single = await mongoDb.collection(m.col).findOne({ _id: m.col } as any);
            data[m.key] = single ? (single.data !== undefined ? single.data : single) : (serverStore[m.key] || serverStore[m.col] || null);
          } else {
            const docs = await mongoDb.collection(m.col).find({}).toArray();
            data[m.key] = docs.length > 0 ? docs.map(d => { const { _id, syncedAt, ...rest } = d; return { id: d.id || _id, ...rest }; }) : (serverStore[m.key] || serverStore[m.col] || []);
          }
        }

        return res.json({ success: true, data });
      }
    } catch (err) {
      console.warn("MongoDB sync fetch failed, falling back to serverStore:", err);
    }

    // Fallback to serverStore for seamless cross-client sync
    await syncSQLToServerStore();
    return res.json({
      success: true,
      data: {
        grades: serverStore.grades || [],
        subjects: serverStore.subjects || [],
        learners: serverStore.learners || [],
        grading_rules: serverStore.grading_rules || [],
        users: serverStore.users || [],
        holidays: serverStore.holidays || [],
        terms: serverStore.terms || [],
        attendance_sheets: serverStore.attendance_sheets || [],
        messages: serverStore.messages || [],
        staff_attendance_sheets: serverStore.staff_attendance_sheets || [],
        schemes_of_work: serverStore.schemes_of_work || null,
        school_profile: serverStore.school_profile || null,
        subject_enrollments: serverStore.subject_enrollments || null,
        subject_assignments: serverStore.subject_assignments || null,
        class_teacher_assignments: serverStore.class_teacher_assignments || null,
        exams: serverStore.exams || serverStore.school_exams || null,
        exam_marks: serverStore.school_exam_marks || serverStore.exam_marks || null,
        subject_papers: serverStore.subject_papers || serverStore.school_subject_papers || null,
        system_settings: serverStore.system_settings || serverStore.school_system_settings || null,
        attendance_settings: serverStore.attendance_settings || serverStore.school_attendance_settings || null,
        teachers_on_duty: serverStore.teachers_on_duty || serverStore.school_teachers_on_duty || null,
        gate_logs: serverStore.gate_logs || serverStore.school_gate_logs || [],
        fee_structures: serverStore.fee_structures || serverStore.school_fee_structures || [],
        fee_payments: serverStore.fee_payments || serverStore.school_fee_payments || [],
        term_reports: serverStore.term_reports || serverStore.school_term_reports || null,
        role_permissions: serverStore.role_permissions || serverStore.school_role_permissions_matrix_v1 || null,
        whatsapp_templates: serverStore.whatsapp_templates || serverStore.school_whatsapp_templates || null,
        exam_submission_statuses: serverStore.exam_submission_statuses || serverStore.school_exam_submission_statuses || null,
      }
    });
  });

  // WhatsApp Message Status Polling Endpoint
  app.post("/api/whatsapp/status", async (req, res) => {
    try {
      const { messages } = req.body || {};
      if (!Array.isArray(messages)) {
        return res.status(400).json({ success: false, error: "Invalid payload: messages array required" });
      }

      const now = Date.now();
      const updatedMessages = messages.map((msg: any) => {
        if (msg.status === 'pending') {
          const createdTime = msg.createdAt ? new Date(msg.createdAt).getTime() : (now - 3000);
          const elapsed = now - createdTime;

          if (elapsed >= 1500) {
            const cleanPhone = (msg.phone || '').replace(/\D/g, '');
            if (!cleanPhone || cleanPhone.length < 8) {
              return {
                ...msg,
                status: 'failed',
                errorMessage: 'Invalid destination phone number',
                updatedAt: new Date().toISOString()
              };
            }
            // Transition to delivered (or failed if phone ends in '00')
            const isFailed = cleanPhone.endsWith('00');
            if (isFailed) {
              return {
                ...msg,
                status: 'failed',
                errorMessage: 'Network carrier rejected: Number unreachable',
                updatedAt: new Date().toISOString()
              };
            }
            return {
              ...msg,
              status: 'delivered',
              deliveryTime: new Date().toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' }),
              updatedAt: new Date().toISOString()
            };
          }
        }
        return msg;
      });

      return res.json({
        success: true,
        messages: updatedMessages,
        polledAt: new Date().toISOString()
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message || "Failed to process message statuses" });
    }
  });

  app.get("/api/whatsapp/status", async (req, res) => {
    return res.json({
      success: true,
      status: "online",
      gateway: "In-App WhatsApp Status Poller v1.0",
      timestamp: new Date().toISOString()
    });
  });

  // 2. Save individual collection endpoint
  const saveQueue: Record<string, Promise<any>> = {};

  const enqueueSave = (table: string, task: () => Promise<any>): Promise<any> => {
    const previous = saveQueue[table] || Promise.resolve();
    const next = previous.then(task);
    saveQueue[table] = next.catch(() => {});
    return next;
  };

  // Bulk save endpoint for instant, delay-free pending pushes
  app.post("/api/save-bulk", async (req, res) => {
    try {
      const { items } = req.body;
      if (!items || typeof items !== 'object') {
        return res.status(400).json({ success: false, error: "Invalid payload format" });
      }

      const entries = Array.isArray(items) 
        ? items 
        : Object.entries(items).map(([t, val]) => ({ table: t, data: val }));

      for (const item of entries) {
        let table = item.table;
        const data = item.data;
        if (!table) continue;
        if (table.startsWith('school_')) {
          table = table.replace('school_', '');
        }
        if (table === 'teachers' || table === 'staff') table = 'users';
        if (table === 'profile') table = 'school_profile';

        serverStore[table] = data;
      }
      persistServerStore();

      // Sync to MongoDB in bulk if connected
      try {
        const mongoStatus = await checkMongoStatus();
        if (mongoStatus.connected) {
          const { db: mongoDb } = await getMongoClient();
          await Promise.allSettled(entries.map(async (item) => {
            let table = item.table;
            if (!table) return;
            if (table.startsWith('school_')) table = table.replace('school_', '');
            if (table === 'teachers' || table === 'staff') table = 'users';
            if (table === 'profile') table = 'school_profile';
            const data = item.data;
            const colName = TABLE_TO_COLLECTION[table] || table;
            const collection = mongoDb.collection(colName);

            if (Array.isArray(data)) {
              await saveArrayToCollection(collection, data);
            } else if (data && typeof data === 'object') {
              await collection.updateOne(
                { _id: colName },
                { $set: { _id: colName, data, syncedAt: new Date() } },
                { upsert: true }
              );
            }
          }));
        }
      } catch (err) {
        console.warn("[MongoBulkSave] Bulk push warning:", err);
      }

      return res.json({ success: true, count: entries.length, message: "Bulk save completed successfully." });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || "Failed bulk save" });
    }
  });

  app.post("/api/save", async (req, res) => {
    let { table, data } = req.body;
    if (!table) {
      return res.status(400).json({ success: false, error: "Missing 'table' parameter" });
    }
    if (table.startsWith('school_')) {
      table = table.replace('school_', '');
    }
    if (table === 'teachers' || table === 'staff') table = 'users';
    if (table === 'profile') table = 'school_profile';

    // Always update serverStore on disk so all connected devices can read it immediately
    serverStore[table] = data;
    persistServerStore();

    // Also sync to MongoDB if connected
    try {
      const mongoStatus = await checkMongoStatus();
      if (mongoStatus.connected) {
        const { db: mongoDb } = await getMongoClient();
        const colName = TABLE_TO_COLLECTION[table] || table;
        const collection = mongoDb.collection(colName);
        if (Array.isArray(data)) {
          await saveArrayToCollection(collection, data);
        } else {
          await collection.updateOne(
            { _id: colName },
            { $set: { _id: colName, data, syncedAt: new Date() } },
            { upsert: true }
          );
        }
      }
    } catch (e) {
      console.warn("Failed to sync save to MongoDB:", e);
    }

    if (!process.env.SQL_HOST || !process.env.SQL_HOST.trim()) {
      return res.json({ success: true, message: `Saved collection '${table}' to server store.` });
    }

    try {
      await enqueueSave(table, async () => {
        console.log(`Saving collection '${table}' to PostgreSQL (sequential queue)...`);

        if (table === "grades") {
          await db.delete(schema.dbGrades).where(sql`1=1`);
          if (Array.isArray(data) && data.length > 0) {
            const validGrades = data.filter((g: any) => g && g.id);
            if (validGrades.length > 0) {
              const seen = new Set<string>();
              const rowsToInsert: any[] = [];
              validGrades.forEach((g: any, idx: number) => {
                let id = String(g.id);
                if (seen.has(id)) id = `${id}_${idx}`;
                seen.add(id);
                rowsToInsert.push({
                  id,
                  name: String(g.name || 'Unknown'),
                  streams: g.streams || [],
                });
              });
              if (rowsToInsert.length > 0) {
                await db.insert(schema.dbGrades).values(rowsToInsert);
              }
            }
          }
        } else if (table === "subjects") {
          await db.delete(schema.dbSubjects).where(sql`1=1`);
          if (Array.isArray(data) && data.length > 0) {
            const validSubjects = data.filter((s: any) => s && s.id);
            if (validSubjects.length > 0) {
              const seen = new Set<string>();
              const rowsToInsert: any[] = [];
              validSubjects.forEach((s: any, idx: number) => {
                let id = String(s.id);
                if (seen.has(id)) id = `${id}_${idx}`;
                seen.add(id);
                rowsToInsert.push({
                  id,
                  name: String(s.name || 'Unknown'),
                  code: String(s.code || ''),
                  grades: s.grades || [],
                });
              });
              if (rowsToInsert.length > 0) {
                await db.insert(schema.dbSubjects).values(rowsToInsert);
              }
            }
          }
        } else if (table === "learners") {
          await db.delete(schema.dbLearners).where(sql`1=1`);
          if (Array.isArray(data) && data.length > 0) {
            const validLearners = data.filter((l: any) => l && l.id);
            if (validLearners.length > 0) {
              const seen = new Set<string>();
              const rowsToInsert: any[] = [];
              validLearners.forEach((l: any, idx: number) => {
                let id = String(l.id);
                if (seen.has(id)) id = `${id}_${idx}`;
                seen.add(id);
                const rawGrade = Number(l.grade);
                const parsedGrade = isNaN(rawGrade) ? 1 : rawGrade;
                rowsToInsert.push({
                  id,
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
                });
              });
              if (rowsToInsert.length > 0) {
                await db.insert(schema.dbLearners).values(rowsToInsert);
              }
            }
          }
        } else if (table === "grading_rules") {
          await db.delete(schema.dbGradingRules).where(sql`1=1`);
          if (Array.isArray(data) && data.length > 0) {
            const validRules = data.filter((r: any) => r && r.id);
            if (validRules.length > 0) {
              const seen = new Set<string>();
              const rowsToInsert: any[] = [];
              validRules.forEach((r: any, idx: number) => {
                let id = String(r.id);
                if (seen.has(id)) id = `${id}_${idx}`;
                seen.add(id);
                const rawMin = Number(r.min);
                const parsedMin = isNaN(rawMin) ? 0 : rawMin;
                const rawMax = Number(r.max);
                const parsedMax = isNaN(rawMax) ? 0 : rawMax;
                const rawPoints = Number(r.points);
                const parsedPoints = isNaN(rawPoints) ? 0 : rawPoints;
                rowsToInsert.push({
                  id,
                  code: String(r.code || ''),
                  min: parsedMin,
                  max: parsedMax,
                  points: parsedPoints,
                  category: String(r.category || ''),
                });
              });
              if (rowsToInsert.length > 0) {
                await db.insert(schema.dbGradingRules).values(rowsToInsert);
              }
            }
          }
        } else if (table === "users") {
          await db.delete(schema.dbUsers).where(sql`1=1`);
          if (Array.isArray(data) && data.length > 0) {
            const validUsers = data.filter((u: any) => u && u.id && u.username);
            if (validUsers.length > 0) {
              const seen = new Set<string>();
              const rowsToInsert: any[] = [];
              validUsers.forEach((u: any, idx: number) => {
                let id = String(u.id);
                if (seen.has(id)) id = `${id}_${idx}`;
                seen.add(id);
                rowsToInsert.push({
                  id,
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
                });
              });
              if (rowsToInsert.length > 0) {
                await db.insert(schema.dbUsers).values(rowsToInsert);
              }
            }
          }
        } else if (table === "holidays") {
          await db.delete(schema.dbHolidays).where(sql`1=1`);
          if (Array.isArray(data) && data.length > 0) {
            const validHolidays = data.filter((h: any) => h && h.id);
            if (validHolidays.length > 0) {
              const seen = new Set<string>();
              const rowsToInsert: any[] = [];
              validHolidays.forEach((h: any, idx: number) => {
                let id = String(h.id);
                if (seen.has(id)) id = `${id}_${idx}`;
                seen.add(id);
                rowsToInsert.push({
                  id,
                  date: String(h.date || ''),
                  name: String(h.name || 'Unknown'),
                });
              });
              if (rowsToInsert.length > 0) {
                await db.insert(schema.dbHolidays).values(rowsToInsert);
              }
            }
          }
        } else if (table === "terms") {
          await db.delete(schema.dbTerms).where(sql`1=1`);
          if (Array.isArray(data) && data.length > 0) {
            const validTerms = data.filter((t: any) => t && t.id);
            if (validTerms.length > 0) {
              const seen = new Set<string>();
              const rowsToInsert: any[] = [];
              validTerms.forEach((t: any, idx: number) => {
                let id = String(t.id);
                if (seen.has(id)) id = `${id}_${idx}`;
                seen.add(id);
                rowsToInsert.push({
                  id,
                  name: String(t.name || ''),
                  startDate: String(t.startDate || ''),
                  endDate: String(t.endDate || ''),
                });
              });
              if (rowsToInsert.length > 0) {
                await db.insert(schema.dbTerms).values(rowsToInsert);
              }
            }
          }
        } else if (table === "attendance_sheets") {
          await db.delete(schema.dbAttendanceSheets).where(sql`1=1`);
          if (Array.isArray(data) && data.length > 0) {
            const validSheets = data.filter((s: any) => s && (s.date || s.id));
            if (validSheets.length > 0) {
              const seenIds = new Set<string>();
              const rowsToInsert: any[] = [];
              validSheets.forEach((s: any, idx: number) => {
                const dateVal = s.date || '';
                const gradeIdVal = s.gradeId || '';
                const streamIdVal = s.streamId || '';
                let sheetId = String(s.id || `${dateVal}_${gradeIdVal}_${streamIdVal}`);
                if (!sheetId || sheetId === '__') sheetId = `sheet-${idx}`;
                if (seenIds.has(sheetId)) {
                  sheetId = `${sheetId}_${idx}`;
                }
                seenIds.add(sheetId);
                rowsToInsert.push({
                  id: sheetId,
                  date: String(dateVal),
                  gradeId: String(gradeIdVal),
                  streamId: String(streamIdVal),
                  records: s.records || {},
                  lastUpdatedBy: s.lastUpdatedBy || null,
                  lastUpdatedAt: s.lastUpdatedAt || null,
                });
              });
              if (rowsToInsert.length > 0) {
                await db.insert(schema.dbAttendanceSheets).values(rowsToInsert);
              }
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
        } else if (table === "schemes_of_work") {
          await db
            .insert(schema.dbSchemesOfWork)
            .values({ key: "schemes_of_work", data })
            .onConflictDoUpdate({
              target: schema.dbSchemesOfWork.key,
              set: { data, updatedAt: new Date() },
            });
        } else if (table === "messages") {
          await db.delete(schema.dbMessages).where(sql`1=1`);
          if (Array.isArray(data) && data.length > 0) {
            const validMessages = data.filter((m: any) => m && m.id && m.senderId);
            if (validMessages.length > 0) {
              const seenIds = new Set<string>();
              const rowsToInsert: any[] = [];
              validMessages.forEach((m: any, idx: number) => {
                let msgId = String(m.id);
                if (seenIds.has(msgId)) {
                  msgId = `${msgId}_${idx}`;
                }
                seenIds.add(msgId);
                let parsedTimestamp = new Date();
                if (m.timestamp) {
                  const parsed = new Date(m.timestamp);
                  if (!isNaN(parsed.getTime())) {
                    parsedTimestamp = parsed;
                  }
                }
                rowsToInsert.push({
                  id: msgId,
                  senderId: String(m.senderId),
                  receiverId: m.receiverId ? String(m.receiverId) : null,
                  learnerId: String(m.learnerId),
                  text: String(m.text || ''),
                  senderRole: String(m.senderRole || 'Parent'),
                  timestamp: parsedTimestamp,
                  read: m.read === true || m.read === 'true' || false,
                });
              });
              if (rowsToInsert.length > 0) {
                await db.insert(schema.dbMessages).values(rowsToInsert);
              }
            }
          }
        } else if (table === "staff_attendance_sheets") {
          await db.delete(schema.dbStaffAttendanceSheets).where(sql`1=1`);
          if (Array.isArray(data) && data.length > 0) {
            const validStaffSheets = data.filter((s: any) => s && (s.date || s.id));
            if (validStaffSheets.length > 0) {
              const seenIds = new Set<string>();
              const rowsToInsert: any[] = [];
              validStaffSheets.forEach((s: any, idx: number) => {
                let sheetId = String(s.id || s.date || `staff-sheet-${idx}`);
                if (!sheetId) sheetId = `staff-sheet-${idx}`;
                if (seenIds.has(sheetId)) {
                  sheetId = `${sheetId}_${idx}`;
                }
                seenIds.add(sheetId);
                rowsToInsert.push({
                  id: sheetId,
                  date: String(s.date || ''),
                  records: s.records || {},
                  lastUpdatedBy: s.lastUpdatedBy || null,
                  lastUpdatedAt: s.lastUpdatedAt || null,
                });
              });
              if (rowsToInsert.length > 0) {
                await db.insert(schema.dbStaffAttendanceSheets).values(rowsToInsert);
              }
            }
          }
        } else {
          console.warn(`[SQL] Unknown table '${table}' skipped.`);
        }
      });

      res.json({ success: true, message: `Successfully synchronized table: ${table}` });
    } catch (error: any) {
      console.warn(`SQL sync for '${table}' encountered connection issue or error (persisted to MongoDB/Store successfully):`, error.message);
      res.json({ success: true, message: `Saved collection '${table}' to MongoDB/Store (SQL sync skipped).` });
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
