/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Award, 
  FileText, 
  Printer, 
  Download, 
  ChevronRight, 
  HelpCircle, 
  Sparkles, 
  User, 
  BookOpen, 
  X,
  Users,
  TrendingUp,
  School,
  Calendar,
  CheckCircle,
  Clock
} from 'lucide-react';
import { 
  getLearners, 
  getGrades, 
  getSubjects, 
  getSchoolProfile, 
  getGradingRules, 
  secureGet,
  Learner,
  Grade,
  Subject,
  GradingRule
} from '../utils/db';
import { VerificationQRCode } from './VerificationQRCode';
import { PrintHeader } from './PrintHeader';
import { getKJSEAClassification } from '../utils/kjsea';

// Fallback Mock Exams if none exist in secure storage
const FALLBACK_EXAMS: any[] = [];

// Fallback Mock Learners to ensure immediate visual success
const FALLBACK_LEARNERS: Learner[] = [];

// Fallback Mock Subjects
const FALLBACK_SUBJECTS: Subject[] = [];

export default function GenerateReport() {
  // Database States
  const [exams, setExams] = useState<any[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [learners, setLearners] = useState<Learner[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [gradingRules, setGradingRules] = useState<GradingRule[]>([]);
  const [schoolProfile, setSchoolProfile] = useState<any>({});
  const [dbMarks, setDbMarks] = useState<any[]>([]);

  // Filter & Selector States
  const [selectedYear, setSelectedYear] = useState<string>('All Years');
  const [selectedTerm, setSelectedTerm] = useState<string>('All Terms');
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [selectedGradingScheme, setSelectedGradingScheme] = useState<string>('academic_setup');

  // Specific Report filter states
  const [summaryGrade, setSummaryGrade] = useState<string>('All Grades');
  const [gradeReportGrade, setGradeReportGrade] = useState<string>('');
  const [streamReportStream, setStreamReportStream] = useState<string>('');
  const [subjectReportSubject, setSubjectReportSubject] = useState<string>('');

  // Summary Report visual customization states
  const [summaryFontFamily, setSummaryFontFamily] = useState<string>("'Segoe UI', Roboto, Arial, sans-serif");
  const [summaryFontSize, setSummaryFontSize] = useState<number>(14);
  const [summaryThemeColor, setSummaryThemeColor] = useState<string>('blue');
  const [summaryCustomiseOpen, setSummaryCustomiseOpen] = useState<boolean>(false);

  // Grade Report visual customization states
  const [gradeReportTitle, setGradeReportTitle] = useState<string>('');
  const [gradeReportSchoolName, setGradeReportSchoolName] = useState<string>('');
  const [gradeReportFontFamily, setGradeReportFontFamily] = useState<string>("'Segoe UI', Roboto, Arial, sans-serif");
  const [gradeReportFontSize, setGradeReportFontSize] = useState<number>(12);
  const [gradeReportTextColor, setGradeReportTextColor] = useState<string>('#1E293B');
  const [gradeReportHeaderColor, setGradeReportHeaderColor] = useState<string>('#1E3A8A');
  const [gradeReportCustomiseOpen, setGradeReportCustomiseOpen] = useState<boolean>(false);
  const [gradeReportFormat, setGradeReportFormat] = useState<'full' | 'marks' | 'points' | 'grades'>('full');

  // Learner Reports (Tabs and step indicator states)
  const [learnerTab, setLearnerTab] = useState<'all' | 'individual'>('all');
  const [learnerGrade, setLearnerGrade] = useState<string>('');
  const [learnerIndividualId, setLearnerIndividualId] = useState<string>('');

  // Modal Report Display States
  const [activeReportModal, setActiveReportModal] = useState<{
    type: 'summary' | 'grade' | 'stream' | 'subject' | 'learner_all' | 'learner_single';
    title: string;
    data: any;
  } | null>(null);

  // Load Data
  useEffect(() => {
    // 1. Load Exams
    const storedExams = secureGet('exams');
    const loadedExams = storedExams ? JSON.parse(storedExams) : [];
    setExams(loadedExams);

    // 2. Load Grades
    const loadedGrades = getGrades();
    setGrades(loadedGrades);

    // 3. Load Learners
    const loadedLearners = getLearners();
    setLearners(loadedLearners);

    // 4. Load Subjects
    const loadedSubjects = getSubjects();
    setSubjects(loadedSubjects);

    // 5. Load Grading Rules
    setGradingRules(getGradingRules());

    // 6. Load School Profile
    setSchoolProfile(getSchoolProfile());

    // 7. Load Student Exam Marks
    const storedMarks = secureGet('school_exam_marks');
    setDbMarks(storedMarks ? JSON.parse(storedMarks) : []);
  }, []);

  // Set default Selected Exam on load
  useEffect(() => {
    if (exams.length > 0 && !selectedExamId) {
      setSelectedExamId(exams[0].id);
    }
  }, [exams]);

  // Sync default options for Report-specific selectors
  useEffect(() => {
    if (grades.length > 0) {
      if (!gradeReportGrade) setGradeReportGrade(grades[0].name);
      if (!learnerGrade) setLearnerGrade(grades[0].name);
      
      const firstStream = `${grades[0].name} - ${grades[0].streams[0]?.name || 'Alpha'}`;
      if (!streamReportStream) setStreamReportStream(firstStream);
    }
    if (subjects.length > 0 && !subjectReportSubject) {
      setSubjectReportSubject(subjects[0].name);
    }
  }, [grades, subjects]);

  // Set default learner when learnerGrade or tab changes
  useEffect(() => {
    const matchingLearners = learners.filter(l => l.gradeLabel === learnerGrade || `Grade ${l.grade}` === learnerGrade);
    if (matchingLearners.length > 0) {
      setLearnerIndividualId(matchingLearners[0].id);
    } else {
      setLearnerIndividualId('');
    }
  }, [learnerGrade, learnerTab, learners]);

  // Unique Years & Terms for filtration
  const availableYears = Array.from(new Set(exams.map(e => e.academicYear || e.year))).filter(Boolean);
  const availableTerms = Array.from(new Set(exams.map(e => e.term))).filter(Boolean);

  // Filter Exams list based on Year & Term
  const filteredExams = exams.filter(e => {
    const yearMatches = selectedYear === 'All Years' || (e.academicYear || e.year) === selectedYear;
    const termMatches = selectedTerm === 'All Terms' || e.term === selectedTerm;
    return yearMatches && termMatches;
  });

  const activeExamObj = (exams.find(e => e.id === selectedExamId) || exams[0]) || null;

  // SECURE / DYNAMIC SCORE RETRIEVER
  const getScore = (learnerId: string, subjectCode: string, examId: string): number | null => {
    const match = dbMarks.find(
      m => m.examId === examId && m.learnerId === learnerId && m.subjectCode === subjectCode
    );
    if (match && match.score !== '' && match.score !== undefined && match.score !== null) {
      return Number(match.score);
    }
    return null;
  };

  // Get Grade Code from Score
  const getGradeCode = (score: number | null): { code: string; points: number; category: string; description: string } => {
    if (score === null || score === undefined || isNaN(score)) {
      return { code: '—', points: 0, category: '', description: 'Pending Score' };
    }
    const match = gradingRules.find(r => score >= r.min && score <= r.max);
    if (match) {
      let desc = 'Meets Expectations';
      if (match.category === 'ee') desc = 'Exceeds Expectations';
      if (match.category === 'ae') desc = 'Approaching Expectations';
      if (match.category === 'be') desc = 'Below Expectations';
      return { 
        code: match.code, 
        points: match.points, 
        category: match.category,
        description: desc
      };
    }
    // default fallbacks
    if (score >= 80) return { code: 'EE1', points: 8, category: 'ee', description: 'Exceeds Expectations' };
    if (score >= 60) return { code: 'ME1', points: 6, category: 'me', description: 'Meets Expectations' };
    if (score >= 40) return { code: 'AE1', points: 4, category: 'ae', description: 'Approaching Expectations' };
    return { code: 'BE2', points: 1, category: 'be', description: 'Below Expectations' };
  };

  const getSubjectTeacherRemark = (subjectCode: string, score: number): string => {
    const hashes = subjectCode.charCodeAt(0) + score;
    const eeRemarks = [
      'Outstanding comprehension and critical thinking skills.',
      'Exceptional display of analytical competence and accuracy.',
      'Pristine conceptual mastery. Keeps expanding limits.',
      'Incredible performance. Consistently leads the cohort.'
    ];
    const meRemarks = [
      'Good understanding. Learner is focused and consistent.',
      'Steady work ethic shown. Displays comfortable proficiency.',
      'Well-developed competency skills. Keeps active class interest.',
      'Maintains good progress. Promising subject comprehension.'
    ];
    const aeRemarks = [
      'Grasping core concepts. Needs extra revision support.',
      'Capable of higher levels. Requires more steady practice.',
      'Shows effort, but should focus on procedural accuracy.',
      'Requires regular coaching to master advanced application.'
    ];
    const beRemarks = [
      'Significant gaps in understanding. Urgent coaching advised.',
      'Struggles with foundational concepts. Let’s consult.',
      'Critical intervention needed. Regular review sessions required.',
      'Shows high potential if foundational steps are reinforced.'
    ];

    if (score >= 80) return eeRemarks[hashes % eeRemarks.length];
    if (score >= 58) return meRemarks[hashes % meRemarks.length];
    if (score >= 35) return aeRemarks[hashes % aeRemarks.length];
    return beRemarks[hashes % beRemarks.length];
  };

  const getTeacherInitials = (subjectCode: string): string => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const first = letters[(subjectCode.charCodeAt(0) || 65) % letters.length];
    const second = letters[((subjectCode.charCodeAt(1) || 66) + 3) % letters.length];
    return `${first}.${second}`;
  };

  // HELPER CALCULATORS FOR GROUP REPORTS
  const computeLearnerTotalAndMean = (learner: Learner, activeExamId: string) => {
    const learnerSubjects = subjects.filter(sub => {
      // Check if subject is active for learner's grade
      const numGrade = typeof learner.grade === 'number' ? learner.grade : 8;
      return sub.grades.includes(numGrade);
    });

    if (learnerSubjects.length === 0) return { total: 0, mean: 0, subjectScores: {}, count: 0, enteredCount: 0 };

    let total = 0;
    let enteredCount = 0;
    const subjectScores: Record<string, number | ""> = {};

    learnerSubjects.forEach(sub => {
      const score = getScore(learner.id, sub.code, activeExamId);
      if (score !== null) {
        subjectScores[sub.code] = score;
        total += score;
        enteredCount++;
      } else {
        subjectScores[sub.code] = "";
      }
    });

    const mean = enteredCount > 0 ? Number((total / enteredCount).toFixed(1)) : 0;
    return { total, mean, subjectScores, count: learnerSubjects.length, enteredCount };
  };

  // Switch Tab Handler
  const switchTab = (type: 'all' | 'individual') => {
    setLearnerTab(type);
  };

  // REPORT HANDLERS
  const handleOpenSummaryReport = () => {
    // Collect stats per grade & stream
    const summaryDataByGrade: Record<string, any[]> = {};
    const subjectMeans: Record<string, { total: number; count: number; name: string }> = {};

    const activeGrades = summaryGrade === 'All Grades' 
      ? grades 
      : grades.filter(g => g.name === summaryGrade);

    const activeLearners = summaryGrade === 'All Grades'
      ? learners
      : learners.filter(l => l.gradeLabel === summaryGrade || `Grade ${l.grade}` === summaryGrade);

    activeGrades.forEach(g => {
      const gradeLearners = learners.filter(l => l.gradeLabel === g.name || `Grade ${l.grade}` === g.name);
      if (gradeLearners.length === 0) return;

      const streamsList: any[] = [];
      g.streams.forEach(str => {
        const streamLearners = gradeLearners.filter(l => l.stream === str.name);
        if (streamLearners.length === 0) return;

        let totalMean = 0;
        let validCandidates = 0;
        streamLearners.forEach(l => {
          const { mean, enteredCount } = computeLearnerTotalAndMean(l, selectedExamId);
          if (enteredCount > 0) {
            totalMean += mean;
            validCandidates++;
          }
        });

        const streamAverage = validCandidates > 0 ? Number((totalMean / validCandidates).toFixed(1)) : 0;
        streamsList.push({
          streamName: str.name,
          candidates: streamLearners.length,
          meanScore: streamAverage,
          meanGrade: getGradeCode(validCandidates > 0 ? streamAverage : null).code
        });
      });

      // Sort streams by score
      streamsList.sort((a, b) => b.meanScore - a.meanScore);
      summaryDataByGrade[g.name] = streamsList.map((st, index) => ({
        ...st,
        rank: index + 1
      }));
    });

    // Subject averages across active candidates
    activeLearners.forEach(l => {
      const { subjectScores } = computeLearnerTotalAndMean(l, selectedExamId);
      Object.entries(subjectScores).forEach(([code, score]) => {
        if (score !== "") {
          const subObj = subjects.find(s => s.code === code);
          const name = subObj ? subObj.name : code;
          if (!subjectMeans[code]) {
            subjectMeans[code] = { total: 0, count: 0, name };
          }
          subjectMeans[code].total += score;
          subjectMeans[code].count += 1;
        }
      });
    });

    const finalSubjectPerformance = Object.entries(subjectMeans).map(([code, data]) => {
      const average = data.count > 0 ? Number((data.total / data.count).toFixed(1)) : 0;
      
      // Determine stream standings dynamically for this subject across active learners
      const streamScoresForSub: Record<string, { total: number; count: number }> = {};
      activeLearners.forEach(l => {
        const score = getScore(l.id, code, selectedExamId);
        if (score !== null && score !== undefined) {
          const streamName = l.stream || 'Unknown';
          const key = `${l.gradeLabel || `Grade ${l.grade}`} - ${streamName}`;
          if (!streamScoresForSub[key]) {
            streamScoresForSub[key] = { total: 0, count: 0 };
          }
          streamScoresForSub[key].total += score;
          streamScoresForSub[key].count += 1;
        }
      });

      const rankedStreamsForSub = Object.entries(streamScoresForSub)
        .map(([streamKey, d]) => ({
          streamKey,
          average: d.total / d.count
        }))
        .sort((a, b) => b.average - a.average);

      const streamPerformanceText = rankedStreamsForSub.length > 0 
        ? rankedStreamsForSub.slice(0, 3).map((item, idx) => `${item.streamKey.split(' - ')[1]} ${idx + 1}${idx === 0 ? 'st' : idx === 1 ? 'nd' : idx === 2 ? 'rd' : 'th'}`).join(', ')
        : 'No marks submitted';

      return {
        subjectCode: code,
        subjectName: data.name,
        meanScore: average,
        meanGrade: getGradeCode(data.count > 0 ? average : null).code,
        streamRankings: streamPerformanceText
      };
    });

    // Compute cohort means
    let sumOfMeans = 0;
    let countOfMeans = 0;
    activeLearners.forEach(l => {
      const { mean, enteredCount } = computeLearnerTotalAndMean(l, selectedExamId);
      if (enteredCount > 0) {
        sumOfMeans += mean;
        countOfMeans++;
      }
    });
    const cohortMean = countOfMeans > 0 ? Number((sumOfMeans / countOfMeans).toFixed(1)) : 0;
    const cohortGradeCode = getGradeCode(countOfMeans > 0 ? cohortMean : null).code;

    setActiveReportModal({
      type: 'summary',
      title: 'Overall Academic Summary Report',
      data: {
        examName: activeExamObj?.examName || activeExamObj?.name || 'No Exam Selected',
        academicYear: activeExamObj?.academicYear || activeExamObj?.year || '',
        term: activeExamObj?.term || '',
        gradesSummary: summaryDataByGrade,
        subjectsSummary: finalSubjectPerformance,
        totalCandidates: activeLearners.length,
        cohortMean,
        cohortGradeCode
      }
    });
  };

  const handleOpenGradeReport = () => {
    const targetGrade = gradeReportGrade || grades[0]?.name || 'Grade 8';
    const gradeLearners = learners.filter(l => l.gradeLabel === targetGrade || `Grade ${l.grade}` === targetGrade);

    if (gradeLearners.length === 0) {
      alert(`No learners registered in "${targetGrade}". Add some learners to preview.`);
      return;
    }

    // Compute details for each candidate
    const candidates = gradeLearners.map(l => {
      const { total, mean, subjectScores, count, enteredCount } = computeLearnerTotalAndMean(l, selectedExamId);
      return {
        id: l.id,
        admNo: l.admNo,
        name: l.name,
        stream: l.stream,
        total,
        mean,
        subjectScores,
        subjectCount: count,
        enteredCount,
        gradeCode: getGradeCode(enteredCount > 0 ? mean : null).code
      };
    });

    // Sort by mean score descending to assign positions
    candidates.sort((a, b) => b.mean - a.mean);
    const rankedCandidates = candidates.map((c, idx) => ({
      ...c,
      position: idx + 1
    }));

    // Find active subjects for this grade to display as columns
    const gradeNum = parseInt(targetGrade.replace(/\D/g, ''), 10) || 8;
    const activeSubjects = subjects.filter(s => s.grades.includes(gradeNum));

    setActiveReportModal({
      type: 'grade',
      title: `${targetGrade} Composite Performance Sheet`,
      data: {
        examName: activeExamObj?.examName || activeExamObj?.name || 'No Exam Selected',
        academicYear: activeExamObj?.academicYear || activeExamObj?.year || '',
        term: activeExamObj?.term || '',
        gradeLabel: targetGrade,
        subjects: activeSubjects,
        candidates: rankedCandidates
      }
    });
  };

  const handleOpenStreamReport = () => {
    const selection = streamReportStream || `${grades[0]?.name} - ${grades[0]?.streams[0]?.name}`;
    const [targetGrade, targetStream] = selection.split(' - ').map(s => s.trim());

    const streamLearners = learners.filter(l => 
      (l.gradeLabel === targetGrade || `Grade ${l.grade}` === targetGrade) && 
      l.stream === targetStream
    );

    if (streamLearners.length === 0) {
      alert(`No learners found in stream "${selection}".`);
      return;
    }

    const candidates = streamLearners.map(l => {
      const { total, mean, subjectScores, count, enteredCount } = computeLearnerTotalAndMean(l, selectedExamId);
      return {
        id: l.id,
        admNo: l.admNo,
        name: l.name,
        total,
        mean,
        subjectScores,
        subjectCount: count,
        enteredCount,
        gradeCode: getGradeCode(enteredCount > 0 ? mean : null).code
      };
    });

    candidates.sort((a, b) => b.mean - a.mean);
    const rankedCandidates = candidates.map((c, idx) => ({
      ...c,
      position: idx + 1
    }));

    const gradeNum = parseInt(targetGrade.replace(/\D/g, ''), 10) || 8;
    const activeSubjects = subjects.filter(s => s.grades.includes(gradeNum));

    // Calculate Stream averages per subject
    const subjectAverages: Record<string, number> = {};
    activeSubjects.forEach(sub => {
      let sum = 0;
      let scoreCount = 0;
      rankedCandidates.forEach(cand => {
        const val = cand.subjectScores[sub.code];
        if (val !== undefined && val !== null && val !== "") {
          sum += Number(val);
          scoreCount++;
        }
      });
      subjectAverages[sub.code] = scoreCount > 0 ? Number((sum / scoreCount).toFixed(1)) : 0;
    });

    setActiveReportModal({
      type: 'stream',
      title: `${targetGrade} ${targetStream} Performance Registry`,
      data: {
        examName: activeExamObj?.examName || activeExamObj?.name || 'No Exam Selected',
        academicYear: activeExamObj?.academicYear || activeExamObj?.year || '',
        term: activeExamObj?.term || '',
        gradeLabel: targetGrade,
        streamLabel: targetStream,
        subjects: activeSubjects,
        candidates: rankedCandidates,
        subjectAverages
      }
    });
  };

  const handleOpenSubjectReport = () => {
    const targetSubjectName = subjectReportSubject || subjects[0]?.name || 'Mathematics';
    const subObj = subjects.find(s => s.name === targetSubjectName) || subjects[0];

    // Find learners who take this subject
    const takingLearners = learners.filter(l => {
      const numGrade = typeof l.grade === 'number' ? l.grade : 8;
      return subObj.grades.includes(numGrade);
    });

    if (takingLearners.length === 0) {
      alert(`No enrolled learners found for subject "${targetSubjectName}".`);
      return;
    }

    const candidates = takingLearners.map(l => {
      const score = getScore(l.id, subObj.code, selectedExamId);
      return {
        admNo: l.admNo,
        name: l.name,
        gradeLabel: l.gradeLabel || `Grade ${l.grade}`,
        stream: l.stream,
        score,
        gradeCode: getGradeCode(score).code
      };
    });

    candidates.sort((a, b) => (b.score || 0) - (a.score || 0));
    const rankedCandidates = candidates.map((c, idx) => ({
      ...c,
      position: idx + 1
    }));

    // Group means by stream
    const streamMeans: Record<string, { total: number; count: number }> = {};
    candidates.forEach(c => {
      if (c.score !== null) {
        const key = `${c.gradeLabel} - ${c.stream}`;
        if (!streamMeans[key]) {
          streamMeans[key] = { total: 0, count: 0 };
        }
        streamMeans[key].total += c.score;
        streamMeans[key].count += 1;
      }
    });

    const streamPerformance = Object.entries(streamMeans).map(([stream, d]) => {
      const average = d.count > 0 ? Number((d.total / d.count).toFixed(1)) : 0;
      return {
        stream,
        average,
        gradeCode: getGradeCode(d.count > 0 ? average : null).code,
        candidates: d.count
      };
    }).sort((a, b) => b.average - a.average);

    setActiveReportModal({
      type: 'subject',
      title: `${targetSubjectName} Subject-wide Performance Report`,
      data: {
        examName: activeExamObj?.examName || activeExamObj?.name || 'No Exam Selected',
        academicYear: activeExamObj?.academicYear || activeExamObj?.year || '',
        term: activeExamObj?.term || '',
        subjectName: targetSubjectName,
        subjectCode: subObj.code,
        candidates: rankedCandidates,
        streamsPerformance: streamPerformance
      }
    });
  };

  const handleOpenLearnerReport = () => {
    const targetGrade = learnerGrade || grades[0]?.name || 'Grade 8';

    if (learnerTab === 'individual') {
      const targetLearner = learners.find(l => l.id === learnerIndividualId);
      if (!targetLearner) {
        alert('Please select a learner to continue.');
        return;
      }

      // Generate a single student's card
      const performance = computeLearnerTotalAndMean(targetLearner, selectedExamId);
      
      // Calculate overall positions in Grade & Stream
      const allGradeLearners = learners.filter(l => l.gradeLabel === targetLearner.gradeLabel || l.grade === targetLearner.grade);
      const gradeRanked = allGradeLearners.map(l => ({
        id: l.id,
        mean: computeLearnerTotalAndMean(l, selectedExamId).mean
      })).sort((a, b) => b.mean - a.mean);
      
      const gradePosition = gradeRanked.findIndex(x => x.id === targetLearner.id) + 1;

      const allStreamLearners = allGradeLearners.filter(l => l.stream === targetLearner.stream);
      const streamRanked = allStreamLearners.map(l => ({
        id: l.id,
        mean: computeLearnerTotalAndMean(l, selectedExamId).mean
      })).sort((a, b) => b.mean - a.mean);

      const streamPosition = streamRanked.findIndex(x => x.id === targetLearner.id) + 1;

      // Extract subject list with details
      const numGrade = typeof targetLearner.grade === 'number' ? targetLearner.grade : 8;
      const targetLearnerSubjects = subjects.filter(s => s.grades.includes(numGrade));
      
      const subjectReportLines = targetLearnerSubjects.map(sub => {
        const score = performance.subjectScores[sub.code];
        const numericScore = score !== "" ? score : null;
        const grading = getGradeCode(numericScore);
        return {
          code: sub.code,
          name: sub.name,
          score: score, // could be number or ""
          gradeCode: grading.code,
          performanceLevel: grading.description,
          points: grading.points > 0 ? grading.points : '—',
          remarks: numericScore !== null ? getSubjectTeacherRemark(sub.code, numericScore) : 'No marks submitted',
          initials: numericScore !== null ? getTeacherInitials(sub.code) : '—'
        };
      });

      setActiveReportModal({
        type: 'learner_single',
        title: `Academic Report Card: ${targetLearner.name}`,
        data: {
          examName: activeExamObj?.examName || activeExamObj?.name || 'No Exam Selected',
          academicYear: activeExamObj?.academicYear || activeExamObj?.year || '',
          term: activeExamObj?.term || '',
          learner: targetLearner,
          subjects: subjectReportLines,
          totalScore: performance.total,
          meanScore: performance.mean,
          maxTotal: targetLearnerSubjects.length * 100,
          gradePosition,
          gradeTotal: allGradeLearners.length,
          streamPosition,
          streamTotal: allStreamLearners.length,
          overallGradeCode: getGradeCode(performance.enteredCount > 0 ? performance.mean : null).code
        }
      });
    } else {
      // Bulk view for all learners in grade
      const gradeLearners = learners.filter(l => l.gradeLabel === targetGrade || `Grade ${l.grade}` === targetGrade);
      if (gradeLearners.length === 0) {
        alert(`No learners registered in "${targetGrade}".`);
        return;
      }

      // Generate a deck of report cards
      const reportCards = gradeLearners.map(l => {
        const performance = computeLearnerTotalAndMean(l, selectedExamId);
        
        // Positions
        const gradeRanked = gradeLearners.map(gl => ({
          id: gl.id,
          mean: computeLearnerTotalAndMean(gl, selectedExamId).mean
        })).sort((a, b) => b.mean - a.mean);
        const gradePosition = gradeRanked.findIndex(x => x.id === l.id) + 1;

        const streamLearners = gradeLearners.filter(gl => gl.stream === l.stream);
        const streamRanked = streamLearners.map(sl => ({
          id: sl.id,
          mean: computeLearnerTotalAndMean(sl, selectedExamId).mean
        })).sort((a, b) => b.mean - a.mean);
        const streamPosition = streamRanked.findIndex(x => x.id === l.id) + 1;

        const numGrade = typeof l.grade === 'number' ? l.grade : 8;
        const learnerSubjects = subjects.filter(s => s.grades.includes(numGrade));

        const subjectLines = learnerSubjects.map(sub => {
          const score = performance.subjectScores[sub.code];
          const numericScore = score !== "" ? score : null;
          const grading = getGradeCode(numericScore);
          return {
            code: sub.code,
            name: sub.name,
            score: score, // could be number or ""
            gradeCode: grading.code,
            performanceLevel: grading.description,
            points: grading.points > 0 ? grading.points : '—',
            remarks: numericScore !== null ? getSubjectTeacherRemark(sub.code, numericScore) : 'No marks submitted',
            initials: numericScore !== null ? getTeacherInitials(sub.code) : '—'
          };
        });

        return {
          learner: l,
          subjects: subjectLines,
          totalScore: performance.total,
          meanScore: performance.mean,
          maxTotal: learnerSubjects.length * 100,
          gradePosition,
          gradeTotal: gradeLearners.length,
          streamPosition,
          streamTotal: streamLearners.length,
          overallGradeCode: getGradeCode(performance.enteredCount > 0 ? performance.mean : null).code
        };
      });

      // Sort report cards by student rank
      reportCards.sort((a, b) => b.meanScore - a.meanScore);

      setActiveReportModal({
        type: 'learner_all',
        title: `Bulk Report Cards Deck: ${targetGrade}`,
        data: {
          examName: activeExamObj?.examName || activeExamObj?.name || 'No Exam Selected',
          academicYear: activeExamObj?.academicYear || activeExamObj?.year || '',
          term: activeExamObj?.term || '',
          gradeLabel: targetGrade,
          reportCards
        }
      });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 text-slate-800 space-y-6">
      
      {/* 📊 PAGE HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-blue-600" />
            Generate Reports
          </h2>
          <p className="text-xs text-slate-500">
            Configure exams and select structured report decks to export performance analyses immediately.
          </p>
        </div>
      </div>

      {/* 🔍 FILTER EXAMS CARD */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">🔍</span>
          Filter Exams
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="space-y-1">
            <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">Academic Year</label>
            <select 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
            >
              <option value="All Years">All Years</option>
              {availableYears.map(yr => (
                <option key={yr} value={yr}>{yr}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">Term</label>
            <select 
              value={selectedTerm} 
              onChange={(e) => setSelectedTerm(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
            >
              <option value="All Terms">All Terms</option>
              {availableTerms.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <button 
              onClick={() => alert('Term reports are merged exams definitions. Configure them in the "Term Report" view inside the sidebar.')}
              className="w-full p-2.5 bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white border border-blue-100 rounded-xl text-xs font-extrabold tracking-wide transition shadow-sm cursor-pointer"
            >
              📋 Term Reports →
            </button>
          </div>
        </div>
      </div>

      {/* 📝 STEP 1: SELECT EXAM & GRADING */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-3">
          Step 1 — Select Exam & Grading System
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">Exam</label>
            <select 
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none cursor-pointer"
            >
              {filteredExams.length === 0 ? (
                <option value="">-- No Exams match filters --</option>
              ) : (
                filteredExams.map(ex => (
                  <option key={ex.id} value={ex.id}>
                    {ex.examName || ex.name} ({ex.academicYear || ex.year} · {ex.term})
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">Grading System</label>
            <select 
              value={selectedGradingScheme}
              onChange={(e) => {
                const scheme = e.target.value;
                setSelectedGradingScheme(scheme);
                if (scheme === 'academic_setup') {
                  setGradingRules(getGradingRules());
                } else if (scheme === 'standard_cbc') {
                  // Standard Ministry CBC rules fallback
                  setGradingRules([
                    { id: 'std1', code: 'EE', min: 80, max: 100, points: 4, category: 'ee' },
                    { id: 'std2', code: 'ME', min: 60, max: 79, points: 3, category: 'me' },
                    { id: 'std3', code: 'AE', min: 40, max: 59, points: 2, category: 'ae' },
                    { id: 'std4', code: 'BE', min: 0, max: 39, points: 1, category: 'be' }
                  ]);
                }
              }}
              className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none cursor-pointer"
            >
              <option value="academic_setup">Active CBC Grading Scheme (Academic Setup & Logs)</option>
              <option value="standard_cbc">Standard Ministry CBC (EE, ME, AE, BE)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 📑 STEP 2: CHOOSE REPORT TYPE */}
      <div className="space-y-4">
        <h3 className="text-sm font-black text-slate-900">Step 2 — Choose Report Type</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          
          {/* 📊 SUMMARY REPORT */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:-translate-y-1 transition-all duration-200 group">
            <div className="space-y-3">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-bold text-xl">
                📊
              </div>
              <h4 className="text-base font-bold text-slate-900">Summary Report</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Stream rankings per grade, subject performance positions — e.g. Maths: North 1st, South 2nd
              </p>
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Filter by Grade (optional)</label>
                <select 
                  value={summaryGrade}
                  onChange={(e) => setSummaryGrade(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none cursor-pointer"
                >
                  <option value="All Grades">All Grades</option>
                  {grades.map(g => (
                    <option key={g.id} value={g.name}>{g.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <button 
              onClick={handleOpenSummaryReport}
              className="mt-6 w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/15 group-hover:scale-[1.01] transition-all cursor-pointer"
            >
              📊 Open Summary Report
            </button>
          </div>

          {/* 🎓 GRADE REPORT */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:-translate-y-1 transition-all duration-200 group">
            <div className="space-y-3">
              <div className="w-12 h-12 bg-violet-50 text-violet-600 rounded-2xl flex items-center justify-center font-bold text-xl">
                🎓
              </div>
              <h4 className="text-base font-bold text-slate-900">Grade Report</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                All learners in a grade — every subject, average %, stream and grade positions
              </p>
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Select Grade *</label>
                <select 
                  value={gradeReportGrade}
                  onChange={(e) => setGradeReportGrade(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none cursor-pointer"
                >
                  {grades.map(g => (
                    <option key={g.id} value={g.name}>{g.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <button 
              onClick={handleOpenGradeReport}
              className="mt-6 w-full py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold shadow-md shadow-violet-500/15 group-hover:scale-[1.01] transition-all cursor-pointer"
            >
              🎓 Open Grade Report
            </button>
          </div>

          {/* 🏫 STREAM REPORT */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:-translate-y-1 transition-all duration-200 group">
            <div className="space-y-3">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center font-bold text-xl">
                🏫
              </div>
              <h4 className="text-base font-bold text-slate-900">Stream Report</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                One class’s full results — learner rankings, subject averages and positions
              </p>
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Select Stream *</label>
                <select 
                  value={streamReportStream}
                  onChange={(e) => setStreamReportStream(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none cursor-pointer"
                >
                  {grades.flatMap(g => 
                    g.streams.map(str => (
                      <option key={`${g.id}_${str.id}`} value={`${g.name} - ${str.name}`}>
                        {g.name} - {str.name}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>
            <button 
              onClick={handleOpenStreamReport}
              className="mt-6 w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/15 group-hover:scale-[1.01] transition-all cursor-pointer"
            >
              🏫 Open Stream Report
            </button>
          </div>

          {/* 📚 SUBJECT REPORT */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:-translate-y-1 transition-all duration-200 group">
            <div className="space-y-3">
              <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center font-bold text-xl">
                📚
              </div>
              <h4 className="text-base font-bold text-slate-900">Subject Report</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Stream rankings per subject across all grades with individual learner positions
              </p>
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Select Subject *</label>
                <select 
                  value={subjectReportSubject}
                  onChange={(e) => setSubjectReportSubject(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none cursor-pointer"
                >
                  {subjects.map(sub => (
                    <option key={sub.id} value={sub.name}>{sub.name} ({sub.code})</option>
                  ))}
                </select>
              </div>
            </div>
            <button 
              onClick={handleOpenSubjectReport}
              className="mt-6 w-full py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-500/15 group-hover:scale-[1.01] transition-all cursor-pointer"
            >
              📚 Open Subject Report
            </button>
          </div>

          {/* 👤 LEARNER REPORTS (ENHANCED TABS) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm col-span-1 md:col-span-2 space-y-4 hover:shadow-md transition-shadow group">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center font-bold text-xl">
                👤
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-slate-900">Learner Reports</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Generate reports for all learners in a grade at once, or open a single learner’s report with enhanced interactive previews.
                </p>
              </div>
            </div>

            {/* ✅ FULLY RESPONSIVE TABS */}
            <div className="tab-buttons grid grid-cols-1 sm:grid-cols-2 gap-0 border border-slate-200 rounded-xl overflow-hidden bg-slate-50 shadow-inner">
              <button 
                onClick={() => switchTab('all')}
                className={`tab-btn flex-1 py-3 px-4 font-bold text-xs transition duration-150 cursor-pointer text-center ${
                  learnerTab === 'all' 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' 
                    : 'text-slate-600 hover:bg-blue-50/50'
                }`}
              >
                📄 All Learners in Grade
              </button>
              <button 
                onClick={() => switchTab('individual')}
                className={`tab-btn flex-1 py-3 px-4 font-bold text-xs transition duration-150 cursor-pointer text-center ${
                  learnerTab === 'individual' 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' 
                    : 'text-slate-600 hover:bg-blue-50/50'
                }`}
              >
                👤 Individual Learner
              </button>
            </div>

            {/* Step Indicators */}
            <div className="flex items-center gap-3 bg-slate-50/70 p-3 rounded-xl border border-slate-150/60">
              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 ${
                learnerTab === 'all' || learnerTab === 'individual' ? 'bg-blue-600 text-white ring-4 ring-blue-50' : 'bg-slate-200 text-slate-600'
              }`}>
                1
              </span>
              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 ${
                learnerTab === 'individual' ? 'bg-blue-600 text-white ring-4 ring-blue-50' : 'bg-slate-200 text-slate-600'
              }`}>
                2
              </span>
              <span className="text-xs text-slate-500 font-medium">
                {learnerTab === 'individual' ? 'Select grade and individual learner to generate card' : 'Select a grade to compile bulk reports'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Select Grade *</label>
                <select 
                  value={learnerGrade}
                  onChange={(e) => setLearnerGrade(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none cursor-pointer"
                >
                  {grades.map(g => (
                    <option key={g.id} value={g.name}>{g.name}</option>
                  ))}
                </select>
              </div>

              {/* ✅ HIDDEN FIELD FOR INDIVIDUAL (APPEARS ON CLICK / SWITCH TAB) */}
              {learnerTab === 'individual' && (
                <div className="space-y-1 animate-fadeIn">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Select Learner *</label>
                  <select 
                    value={learnerIndividualId}
                    onChange={(e) => setLearnerIndividualId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none cursor-pointer"
                  >
                    {learners
                      .filter(l => l.gradeLabel === learnerGrade || `Grade ${l.grade}` === learnerGrade)
                      .map(l => (
                        <option key={l.id} value={l.id}>
                          {l.name} ({l.admNo} · {l.stream})
                        </option>
                      ))
                    }
                    {learners.filter(l => l.gradeLabel === learnerGrade || `Grade ${l.grade}` === learnerGrade).length === 0 && (
                      <option value="">-- No Learners in {learnerGrade} --</option>
                    )}
                  </select>
                </div>
              )}
            </div>

            <button 
              onClick={handleOpenLearnerReport}
              className="w-full py-3 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-500/15 cursor-pointer active:scale-[0.99] transition-all"
            >
              {learnerTab === 'individual' ? '👤 View Individual Learner Report Card' : '📄 Open Bulk Grade Report Cards'}
            </button>

          </div>

        </div>
      </div>

      {/* ========================================================
          📊 REPORT PREVIEW MODALS SYSTEM
          ======================================================== */}
      {activeReportModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="printable-report-modal bg-white rounded-3xl w-full max-w-5xl shadow-2xl border border-slate-100 overflow-hidden my-8 animate-fadeIn flex flex-col max-h-[90vh]">
            
            {/* Modal Header Actions */}
            <div className="bg-slate-900 text-white p-4 sm:p-5 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-between sm:items-center shrink-0 print:hidden">
              <div className="flex items-start sm:items-center gap-2">
                <span className="text-xl shrink-0 mt-0.5 sm:mt-0">📋</span>
                <div>
                  <h3 className="font-extrabold text-sm tracking-tight">{activeReportModal.title}</h3>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">
                    {activeReportModal.data.examName} · {activeReportModal.data.term}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 shrink-0">
                <button 
                  onClick={() => window.print()}
                  className="p-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <FileText size={14} /> Print Report
                </button>
                <button 
                  onClick={() => setActiveReportModal(null)}
                  className="p-2 bg-slate-800 hover:bg-red-600 text-white rounded-xl transition cursor-pointer"
                  title="Close Report"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Modal Scrollable Contents */}
            <div className="p-6 sm:p-8 overflow-y-auto flex-1 bg-slate-50 print:bg-white print:p-0">
              
              {/* Report Body: SUMMARY */}
              {activeReportModal.type === 'summary' && (() => {
                const summaryActiveGrades = summaryGrade === 'All Grades' || !summaryGrade
                  ? grades
                  : grades.filter(g => g.name === summaryGrade);

                const summaryActiveLearners = summaryGrade === 'All Grades' || !summaryGrade
                  ? learners
                  : learners.filter(l => l.gradeLabel === summaryGrade || `Grade ${l.grade}` === summaryGrade);

                // Compute overall cohort stats for these active learners
                let sumOfMeans = 0;
                let countOfMeans = 0;
                summaryActiveLearners.forEach(l => {
                  const { mean, enteredCount } = computeLearnerTotalAndMean(l, selectedExamId);
                  if (enteredCount > 0) {
                    sumOfMeans += mean;
                    countOfMeans++;
                  }
                });
                const summaryCohortMean = countOfMeans > 0 ? Number((sumOfMeans / countOfMeans).toFixed(1)) : 0;
                const summaryCohortGradeCode = getGradeCode(countOfMeans > 0 ? summaryCohortMean : null).code;

                // Overall Stream Rankings for selected grades
                const summaryStreamRankingsList: { rank: number; gradeName: string; streamName: string; average: number; gradeCode: string; candidateCount: number }[] = [];
                summaryActiveGrades.forEach(g => {
                  const gradeLearners = learners.filter(l => l.gradeLabel === g.name || `Grade ${l.grade}` === g.name);
                  g.streams.forEach(str => {
                    const streamLearners = gradeLearners.filter(l => l.stream === str.name);
                    if (streamLearners.length === 0) return;

                    let totalMean = 0;
                    let validCandidates = 0;
                    streamLearners.forEach(l => {
                      const { mean, enteredCount } = computeLearnerTotalAndMean(l, selectedExamId);
                      if (enteredCount > 0) {
                        totalMean += mean;
                        validCandidates++;
                      }
                    });

                    const streamAverage = validCandidates > 0 ? Number((totalMean / validCandidates).toFixed(1)) : 0;
                    summaryStreamRankingsList.push({
                      rank: 0,
                      gradeName: g.name,
                      streamName: str.name,
                      average: streamAverage,
                      gradeCode: getGradeCode(validCandidates > 0 ? streamAverage : null).code,
                      candidateCount: streamLearners.length
                    });
                  });
                });

                summaryStreamRankingsList.sort((a, b) => b.average - a.average);
                summaryStreamRankingsList.forEach((item, idx) => {
                  item.rank = idx + 1;
                });

                // Grade Distribution by Stream for selected grades
                const summaryGradeDistributionList: { gradeCode: string; streamKey: string; count: number; total: number }[] = [];
                summaryActiveGrades.forEach(g => {
                  const gradeLearners = learners.filter(l => l.gradeLabel === g.name || `Grade ${l.grade}` === g.name);
                  g.streams.forEach(str => {
                    const streamLearners = gradeLearners.filter(l => l.stream === str.name);
                    if (streamLearners.length === 0) return;

                    const counts: Record<string, number> = {};
                    let totalScored = 0;
                    streamLearners.forEach(l => {
                      const { mean, enteredCount } = computeLearnerTotalAndMean(l, selectedExamId);
                      if (enteredCount > 0) {
                        const code = getGradeCode(mean).code;
                        counts[code] = (counts[code] || 0) + 1;
                        totalScored++;
                      }
                    });

                    Object.entries(counts).forEach(([gradeCode, count]) => {
                      summaryGradeDistributionList.push({
                        gradeCode,
                        streamKey: `${g.name} - ${str.name}`,
                        count,
                        total: totalScored
                      });
                    });
                  });
                });
                summaryGradeDistributionList.sort((a, b) => a.gradeCode.localeCompare(b.gradeCode) || a.streamKey.localeCompare(b.streamKey));

                // Gender-wise statistics
                const summaryGenderList: { streamKey: string; maleCount: number; maleAvg: number; femaleCount: number; femaleAvg: number }[] = [];
                summaryActiveGrades.forEach(g => {
                  const gradeLearners = learners.filter(l => l.gradeLabel === g.name || `Grade ${l.grade}` === g.name);
                  g.streams.forEach(str => {
                    const streamLearners = gradeLearners.filter(l => l.stream === str.name);
                    if (streamLearners.length === 0) return;

                    const males = streamLearners.filter(l => l.gender === 'Male');
                    const females = streamLearners.filter(l => l.gender === 'Female');

                    let maleSum = 0, maleCount = 0;
                    males.forEach(l => {
                      const { mean, enteredCount } = computeLearnerTotalAndMean(l, selectedExamId);
                      if (enteredCount > 0) {
                        maleSum += mean;
                        maleCount++;
                      }
                    });

                    let femaleSum = 0, femaleCount = 0;
                    females.forEach(l => {
                      const { mean, enteredCount } = computeLearnerTotalAndMean(l, selectedExamId);
                      if (enteredCount > 0) {
                        femaleSum += mean;
                        femaleCount++;
                      }
                    });

                    summaryGenderList.push({
                      streamKey: `${g.name} - ${str.name}`,
                      maleCount: males.length,
                      maleAvg: maleCount > 0 ? Number((maleSum / maleCount).toFixed(1)) : 0,
                      femaleCount: females.length,
                      femaleAvg: femaleCount > 0 ? Number((femaleSum / femaleCount).toFixed(1)) : 0
                    });
                  });
                });

                // Subject rankings & performances
                const summaryActiveSubjects = subjects.filter(sub => {
                  return summaryActiveGrades.some(g => {
                    const gradeNum = parseInt(g.name.replace(/\D/g, ''), 10) || 8;
                    return sub.grades.includes(gradeNum);
                  });
                });

                const currentDateString = new Date().toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                });

                const colorsMap: Record<string, { prim: string; light: string; text: string; bgClass: string; textClass: string; borderClass: string }> = {
                  blue: { prim: '#2563EB', light: '#EFF6FF', text: '#2563EB', bgClass: 'bg-blue-50 text-blue-600', textClass: 'text-blue-600', borderClass: 'border-blue-100' },
                  purple: { prim: '#7C3AED', light: '#FAF5FF', text: '#7C3AED', bgClass: 'bg-purple-50 text-purple-600', textClass: 'text-purple-600', borderClass: 'border-purple-100' },
                  green: { prim: '#059669', light: '#ECFDF5', text: '#059669', bgClass: 'bg-emerald-50 text-emerald-600', textClass: 'text-emerald-600', borderClass: 'border-emerald-100' },
                  orange: { prim: '#D97706', light: '#FFFBEB', text: '#D97706', bgClass: 'bg-amber-50 text-amber-600', textClass: 'text-amber-600', borderClass: 'border-amber-100' },
                  red: { prim: '#DC2626', light: '#FEF2F2', text: '#DC2626', bgClass: 'bg-rose-50 text-rose-600', textClass: 'text-rose-600', borderClass: 'border-rose-100' },
                  grey: { prim: '#475569', light: '#F1F5F9', text: '#475569', bgClass: 'bg-slate-50 text-slate-600', textClass: 'text-slate-600', borderClass: 'border-slate-100' }
                };
                const activeColor = colorsMap[summaryThemeColor] || colorsMap.blue;

                const dynamicStyle = {
                  fontFamily: summaryFontFamily,
                  fontSize: `${summaryFontSize}px`,
                  '--prim': activeColor.prim,
                  '--prim-light': activeColor.light,
                  '--text': '#1E293B',
                  '--border': '#E2E8F0',
                  '--card': '#FFFFFF',
                  '--bg': '#F8FAFC'
                } as React.CSSProperties;

                return (
                  <div style={dynamicStyle} className="space-y-6 text-slate-800">
                    
                    {/* 📄 PRINTABLE REPORT HEADER */}
                    <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-center sm:items-start text-center sm:text-left gap-4 pb-5">
                      <div className="flex-1 space-y-1">
                        <span className="text-[9px] font-black tracking-widest text-blue-600 uppercase block">Ministry of Education</span>
                        <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight uppercase">
                          {schoolProfile.name || 'ELGON VIEW HEIGHTS HIGH SCHOOL'}
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs text-slate-500 font-bold mt-2">
                          <div>
                            <span className="text-slate-400 uppercase text-[9px] tracking-wider block font-semibold">Assessment / Exam Name</span>
                            <span className="text-slate-800 text-sm font-black uppercase">{activeExamObj?.examName || "Overall Academic Summary Report"}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 uppercase text-[9px] tracking-wider block font-semibold">Academic Session</span>
                            <span className="text-slate-800 text-sm font-black">{activeExamObj?.academicYear || "2026"}</span>
                          </div>
                          <div className="mt-1">
                            <span className="text-slate-400 uppercase text-[9px] tracking-wider block font-semibold">Grade Filter</span>
                            <span className="text-slate-800 text-sm font-black uppercase">{summaryGrade || "All Grades"}</span>
                          </div>
                          <div className="mt-1">
                            <span className="text-slate-400 uppercase text-[9px] tracking-wider block font-semibold">Term</span>
                            <span className="text-slate-800 text-sm font-black uppercase">{activeExamObj?.term || "Term 1"}</span>
                          </div>
                        </div>
                      </div>
                      {/* School Logo at the top right corner */}
                      <div className="shrink-0 flex justify-end">
                        <img 
                          src={schoolProfile.logoUrl || "https://via.placeholder.com/110/2563EB/FFFFFF?text=SCHOOL+LOGO"} 
                          alt="School Logo" 
                          className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-2xl border border-slate-200 bg-slate-50 p-1.5 shadow-sm"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    </div>

                    {/* 🔍 FILTER REPORT */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4 print:hidden">
                      <div className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-[11px]">1</span>
                        Filter Summary Report
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Grade Level Filter</label>
                          <select 
                            value={summaryGrade}
                            onChange={(e) => setSummaryGrade(e.target.value)}
                            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none cursor-pointer"
                          >
                            <option value="All Grades">All Grades (Full Cohort)</option>
                            {grades.map(g => (
                              <option key={g.id} value={g.name}>{g.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Grading Scheme</label>
                          <select 
                            value={selectedGradingScheme}
                            onChange={(e) => {
                              const scheme = e.target.value;
                              setSelectedGradingScheme(scheme);
                              if (scheme === 'academic_setup') {
                                setGradingRules(getGradingRules());
                              } else if (scheme === 'standard_cbc') {
                                setGradingRules([
                                  { id: 'std1', code: 'EE', min: 80, max: 100, points: 4, category: 'ee' },
                                  { id: 'std2', code: 'ME', min: 60, max: 79, points: 3, category: 'me' },
                                  { id: 'std3', code: 'AE', min: 40, max: 59, points: 2, category: 'ae' },
                                  { id: 'std4', code: 'BE', min: 0, max: 39, points: 1, category: 'be' }
                                ]);
                              }
                            }}
                            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none cursor-pointer"
                          >
                            <option value="academic_setup">Active CBC Grading Scheme (Academic Setup & Logs)</option>
                            <option value="standard_cbc">Standard Ministry CBC (EE, ME, AE, BE)</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* 📤 EXPORT TOOLBAR */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4 print:hidden">
                      <div 
                        onClick={() => setSummaryCustomiseOpen(!summaryCustomiseOpen)}
                        className="flex items-center justify-between p-3.5 bg-violet-50 text-violet-900 rounded-xl cursor-pointer hover:bg-violet-100/80 transition"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg">🎨</span>
                          <div>
                            <strong className="text-xs font-extrabold block">Customise Font & Colours Before Exporting</strong>
                            <p className="text-[10px] text-violet-600/90 font-medium">Click to set font family, size, and colors — then print/export your PDF</p>
                          </div>
                        </div>
                        <span className="text-xs text-violet-400 font-black">{summaryCustomiseOpen ? '▲' : '▼'}</span>
                      </div>

                      {summaryCustomiseOpen && (
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fadeIn">
                          <div className="space-y-1">
                            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Font Family</label>
                            <select 
                              value={summaryFontFamily}
                              onChange={(e) => setSummaryFontFamily(e.target.value)}
                              className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                            >
                              <option value="'Segoe UI', Roboto, Arial, sans-serif">Segoe UI (Default)</option>
                              <option value="'Inter', sans-serif">Inter (Modern)</option>
                              <option value="Georgia, 'Times New Roman', serif">Georgia (Editorial Serif)</option>
                              <option value="'Courier New', Courier, monospace">Courier (Classic Monospace)</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Base Font Size</label>
                            <select 
                              value={summaryFontSize}
                              onChange={(e) => setSummaryFontSize(Number(e.target.value))}
                              className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                            >
                              <option value={12}>12px (Compact)</option>
                              <option value={14}>14px (Standard)</option>
                              <option value={16}>16px (Comfortable)</option>
                              <option value={18}>18px (Accessible)</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Theme Primary Accent</label>
                            <div className="flex gap-2 pt-1.5">
                              {Object.keys(colorsMap).map(col => (
                                <button
                                  key={col}
                                  onClick={() => setSummaryThemeColor(col)}
                                  className={`w-6 h-6 rounded-full border-2 transition ${
                                    summaryThemeColor === col ? 'border-slate-800 scale-110' : 'border-transparent'
                                  }`}
                                  style={{ backgroundColor: colorsMap[col].prim }}
                                  title={col}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex justify-between items-center flex-wrap gap-2 pt-2">
                        <div className="flex gap-2">
                          <button 
                            onClick={handlePrint}
                            className="px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                          >
                            📄 Export PDF / Print
                          </button>
                        </div>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Report Date: {currentDateString}</span>
                      </div>
                    </div>

                    {/* 📊 COHORT STATS CARDS */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm text-center">
                        <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block mb-1">TOTAL CANDIDATES</span>
                        <span className="text-2xl font-black text-slate-900">{summaryActiveLearners.length}</span>
                      </div>
                      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm text-center">
                        <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block mb-1">MEAN COHORT SCORE</span>
                        <span className="text-2xl font-black text-blue-600">{summaryCohortMean}%</span>
                      </div>
                      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm text-center">
                        <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block mb-1">COHORT GRADE LEVEL</span>
                        <span className="text-2xl font-black text-emerald-600">{summaryCohortGradeCode}</span>
                      </div>
                    </div>

                    {/* 📊 GRADE SUMMARY */}
                    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
                      <h3 className="text-lg font-extrabold text-slate-900 pb-2 border-b border-slate-100 flex items-center justify-between">
                        <span>{summaryGrade} Summary Decks</span>
                        <span className="text-[10px] font-bold bg-slate-100 px-2.5 py-1 rounded text-slate-500 uppercase tracking-widest">{activeExamObj?.examName || 'Active Exam'}</span>
                      </h3>

                      {/* 🏆 OVERALL STREAM RANKINGS */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-1.5">
                          <span className={`p-1.5 rounded-lg ${activeColor.bgClass}`}>🏆</span>
                          Overall Stream Rankings
                        </h4>
                        <div className="overflow-x-auto border border-slate-100 rounded-xl">
                          <table className="w-full text-xs text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-50 font-extrabold text-slate-500 border-b border-slate-100">
                                <th className="p-3">POSITION</th>
                                <th className="p-3">STREAM</th>
                                <th className="p-3">AVERAGE %</th>
                                <th className="p-3">GRADE</th>
                                <th className="p-3">LEARNERS</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {summaryStreamRankingsList.length === 0 ? (
                                <tr>
                                  <td colSpan={5} className="p-8 text-center text-slate-400 italic">📭 No stream data available for current selection</td>
                                </tr>
                              ) : (
                                summaryStreamRankingsList.map(st => (
                                  <tr key={`${st.gradeName}-${st.streamName}`} className="hover:bg-slate-50/50 font-medium">
                                    <td className="p-3 font-black text-slate-900">
                                      {st.rank}
                                    </td>
                                    <td className="p-3 font-bold text-slate-700">{st.gradeName} - {st.streamName}</td>
                                    <td className="p-3 font-extrabold text-blue-600">{st.average}%</td>
                                    <td className="p-3">
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                                        st.gradeCode.startsWith('EE') ? 'bg-emerald-50 text-emerald-600' :
                                        st.gradeCode.startsWith('ME') ? 'bg-blue-50 text-blue-600' :
                                        'bg-amber-50 text-amber-600'
                                      }`}>
                                        {st.gradeCode}
                                      </span>
                                    </td>
                                    <td className="p-3 text-slate-500 font-semibold">{st.candidateCount} Candidates</td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* 📈 GRADE DISTRIBUTION BY STREAM */}
                      <div className="space-y-3 pt-2">
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-1.5">
                          <span className="p-1.5 bg-purple-50 text-purple-600 rounded-lg">📈</span>
                          Grade Distribution by Stream
                        </h4>
                        <div className="overflow-x-auto border border-slate-100 rounded-xl">
                          <table className="w-full text-xs text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-50 font-extrabold text-slate-500 border-b border-slate-100">
                                <th className="p-3">GRADE</th>
                                <th className="p-3">STREAM</th>
                                <th className="p-3">COUNT</th>
                                <th className="p-3">TOTAL</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {summaryGradeDistributionList.length === 0 ? (
                                <tr>
                                  <td colSpan={4} className="p-8 text-center text-slate-400 italic">📭 No grade distribution data available</td>
                                </tr>
                              ) : (
                                summaryGradeDistributionList.map((dist, idx) => (
                                  <tr key={idx} className="hover:bg-slate-50/50 font-medium">
                                    <td className="p-3">
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                                        dist.gradeCode.startsWith('EE') ? 'bg-emerald-50 text-emerald-600' :
                                        dist.gradeCode.startsWith('ME') ? 'bg-blue-50 text-blue-600' :
                                        'bg-amber-50 text-amber-600'
                                      }`}>
                                        {dist.gradeCode}
                                      </span>
                                    </td>
                                    <td className="p-3 font-bold text-slate-700">{dist.streamKey}</td>
                                    <td className="p-3 font-extrabold text-slate-900">{dist.count} learners</td>
                                    <td className="p-3 text-slate-400 font-semibold">{dist.total} scored</td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                    {/* 👥 SUBJECT AVERAGE MARKS BY GENDER — STREAM-WISE */}
                    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-1.5">
                        <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">👥</span>
                        Subject Average Marks by Gender — Stream-Wise
                      </h4>
                      <div className="overflow-x-auto border border-slate-100 rounded-xl">
                        <table className="w-full text-xs text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 font-extrabold text-slate-500 border-b border-slate-100">
                              <th className="p-3">STREAM</th>
                              <th className="p-3 text-center">BOYS (MALE) COUNT</th>
                              <th className="p-3 text-center">BOYS MEAN %</th>
                              <th className="p-3 text-center">GIRLS (FEMALE) COUNT</th>
                              <th className="p-3 text-center">GIRLS MEAN %</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {summaryGenderList.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="p-8 text-center text-slate-400 italic">📭 Gender statistics will appear here when learners have gender fields defined</td>
                              </tr>
                            ) : (
                              summaryGenderList.map(st => (
                                <tr key={st.streamKey} className="hover:bg-slate-50/50 font-medium">
                                  <td className="p-3 font-bold text-slate-700">{st.streamKey}</td>
                                  <td className="p-3 text-center text-slate-900">{st.maleCount} boys</td>
                                  <td className="p-3 text-center font-black text-blue-600">{st.maleAvg}%</td>
                                  <td className="p-3 text-center text-slate-900">{st.femaleCount} girls</td>
                                  <td className="p-3 text-center font-black text-rose-600">{st.femaleAvg}%</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* 📚 SUBJECT PERFORMANCE BLOCKS */}
                    <div className="space-y-6">
                      <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest block">📚 Dynamic Subject-Wise Breakdown</h4>
                      
                      {summaryActiveSubjects.length === 0 ? (
                        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 italic">
                          📭 No active subjects match the current filters.
                        </div>
                      ) : (
                        summaryActiveSubjects.map((sub, idx) => {
                          // 1. Stream rankings for this subject
                          const streamScores: { streamKey: string; average: number; gradeCode: string; count: number }[] = [];
                          summaryActiveGrades.forEach(g => {
                            const gradeLearners = learners.filter(l => l.gradeLabel === g.name || `Grade ${l.grade}` === g.name);
                            g.streams.forEach(str => {
                              const streamLearners = gradeLearners.filter(l => l.stream === str.name);
                              if (streamLearners.length === 0) return;

                              let totalScore = 0;
                              let count = 0;
                              streamLearners.forEach(l => {
                                const score = getScore(l.id, sub.code, selectedExamId);
                                if (score !== null) {
                                  totalScore += score;
                                  count++;
                                }
                              });

                              if (count > 0) {
                                const average = Number((totalScore / count).toFixed(1));
                                streamScores.push({
                                  streamKey: `${g.name} - ${str.name}`,
                                  average,
                                  gradeCode: getGradeCode(average).code,
                                  count
                                });
                              }
                            });
                          });

                          streamScores.sort((a, b) => b.average - a.average);

                          // 2. Grade distribution for this subject
                          const distScores: { gradeCode: string; streamKey: string; count: number; total: number }[] = [];
                          summaryActiveGrades.forEach(g => {
                            const gradeLearners = learners.filter(l => l.gradeLabel === g.name || `Grade ${l.grade}` === g.name);
                            g.streams.forEach(str => {
                              const streamLearners = gradeLearners.filter(l => l.stream === str.name);
                              if (streamLearners.length === 0) return;

                              const counts: Record<string, number> = {};
                              let totalWithScore = 0;
                              streamLearners.forEach(l => {
                                const score = getScore(l.id, sub.code, selectedExamId);
                                if (score !== null) {
                                  const code = getGradeCode(score).code;
                                  counts[code] = (counts[code] || 0) + 1;
                                  totalWithScore++;
                                }
                              });

                              Object.entries(counts).forEach(([gradeCode, count]) => {
                                distScores.push({
                                  gradeCode,
                                  streamKey: `${g.name} - ${str.name}`,
                                  count,
                                  total: totalWithScore
                                });
                              });
                            });
                          });
                          distScores.sort((a, b) => a.gradeCode.localeCompare(b.gradeCode) || a.streamKey.localeCompare(b.streamKey));

                          const iconsList = ["📘", "📙", "📗", "📕", "🎨", "✝️", "🌾", "🔧", "🔬", "🇫🇷"];
                          const icon = iconsList[idx % iconsList.length];
                          
                          const colorClasses = [
                            { dot: 'bg-blue-600', text: 'text-blue-600', bg: 'bg-blue-50' },
                            { dot: 'bg-purple-600', text: 'text-purple-600', bg: 'bg-purple-50' },
                            { dot: 'bg-emerald-600', text: 'text-emerald-600', bg: 'bg-emerald-50' },
                            { dot: 'bg-amber-600', text: 'text-amber-600', bg: 'bg-amber-50' },
                            { dot: 'bg-rose-600', text: 'text-rose-600', bg: 'bg-rose-50' },
                            { dot: 'bg-slate-600', text: 'text-slate-600', bg: 'bg-slate-50' }
                          ];
                          const visual = colorClasses[idx % colorClasses.length];

                          return (
                            <div key={sub.id} className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
                              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                                <span className={`w-3 h-3 rounded-full ${visual.dot}`} />
                                {icon} {sub.name} Performance
                              </h3>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Stream Performance list */}
                                <div className="space-y-2">
                                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Stream Standings</span>
                                  <div className="overflow-x-auto border border-slate-100 rounded-xl">
                                    <table className="w-full text-[11px] text-left border-collapse">
                                      <thead>
                                        <tr className="bg-slate-50 font-bold text-slate-500 border-b border-slate-100">
                                          <th className="p-2.5">POS</th>
                                          <th className="p-2.5">STREAM</th>
                                          <th className="p-2.5">AVG %</th>
                                          <th className="p-2.5">GRADE</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100">
                                        {streamScores.length === 0 ? (
                                          <tr>
                                            <td colSpan={4} className="p-6 text-center text-slate-400 italic">No marks submitted</td>
                                          </tr>
                                        ) : (
                                          streamScores.map((st, sidx) => (
                                            <tr key={st.streamKey} className="hover:bg-slate-50/50">
                                              <td className="p-2.5 font-bold text-slate-800">{sidx + 1}</td>
                                              <td className="p-2.5 font-bold text-slate-600">{st.streamKey}</td>
                                              <td className="p-2.5 font-black text-blue-600">{st.average}%</td>
                                              <td className="p-2.5 font-bold text-slate-500">{st.gradeCode}</td>
                                            </tr>
                                          ))
                                        )}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>

                                {/* Grade distribution list */}
                                <div className="space-y-2">
                                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Grade Count</span>
                                  <div className="overflow-x-auto border border-slate-100 rounded-xl">
                                    <table className="w-full text-[11px] text-left border-collapse">
                                      <thead>
                                        <tr className="bg-slate-50 font-bold text-slate-500 border-b border-slate-100">
                                          <th className="p-2.5">GRADE</th>
                                          <th className="p-2.5">STREAM</th>
                                          <th className="p-2.5">COUNT</th>
                                          <th className="p-2.5">TOTAL</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100">
                                        {distScores.length === 0 ? (
                                          <tr>
                                            <td colSpan={4} className="p-6 text-center text-slate-400 italic">No grade distribution data</td>
                                          </tr>
                                        ) : (
                                          distScores.map((dist, didx) => (
                                            <tr key={didx} className="hover:bg-slate-50/50">
                                              <td className="p-2.5 font-black text-slate-800">{dist.gradeCode}</td>
                                              <td className="p-2.5 font-bold text-slate-600">{dist.streamKey}</td>
                                              <td className="p-2.5 font-extrabold text-slate-700">{dist.count} candidates</td>
                                              <td className="p-2.5 text-slate-400">{dist.total} graded</td>
                                            </tr>
                                          ))
                                        )}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* 📏 GRADING SCALE LEGEND */}
                    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-100 pb-3">
                        <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">📊</span>
                        Grading System Legend (Linked Setup)
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {gradingRules.map((rule, idx) => {
                          const themeClasses = [
                            { color: 'text-blue-600 bg-blue-50 border-blue-100' },
                            { color: 'text-purple-600 bg-purple-50 border-purple-100' },
                            { color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
                            { color: 'text-amber-600 bg-amber-50 border-amber-100' },
                            { color: 'text-rose-600 bg-rose-50 border-rose-100' },
                            { color: 'text-slate-600 bg-slate-50 border-slate-100' }
                          ];
                          const theme = themeClasses[idx % themeClasses.length];

                          return (
                            <div key={rule.id} className={`p-4 rounded-xl border flex flex-col justify-between ${theme.color}`}>
                              <div>
                                <span className="text-sm font-black block">{rule.code}</span>
                                <p className="text-[10px] opacity-80 font-bold mt-1 uppercase tracking-wider">{rule.min.toFixed(2)}–{rule.max.toFixed(2)}%</p>
                                <p className="text-[9px] opacity-70 mt-0.5 line-clamp-1">{rule.category === 'ee' ? 'Exceeding Expectations' : rule.category === 'me' ? 'Meeting Expectations' : rule.category === 'ae' ? 'Approaching Expectations' : 'Below Expectations'}</p>
                              </div>
                              <span className="text-[10px] font-extrabold mt-3 block">{rule.points.toFixed(2)} pts</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                  </div>
                );
              })()}

              {/* Report Body: GRADE COMPOSITE */}
              {activeReportModal.type === 'grade' && (() => {
                const targetGrade = gradeReportGrade || activeReportModal.data.gradeLabel || grades[0]?.name;
                const gradeLearners = learners.filter(l => l.gradeLabel === targetGrade || `Grade ${l.grade}` === targetGrade);
                
                if (gradeLearners.length === 0) {
                  return (
                    <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center text-slate-400 italic">
                      📭 No learners registered in "{targetGrade}". Please register learners in this grade to preview results.
                    </div>
                  );
                }

                const gradeNum = parseInt(targetGrade.replace(/\D/g, ''), 10) || 8;
                const activeSubjects = subjects.filter(s => s.grades.includes(gradeNum));

                const rawCandidates = gradeLearners.map(l => {
                  const { total, mean, subjectScores, count, enteredCount } = computeLearnerTotalAndMean(l, selectedExamId);
                  
                  // calculate points
                  let totalPoints = 0;
                  let gradedSubjectsCount = 0;
                  const subjectPoints: Record<string, number | ""> = {};
                  const subjectGrades: Record<string, string> = {};
                  
                  activeSubjects.forEach((sub: any) => {
                    const scoreVal = subjectScores[sub.code];
                    if (scoreVal !== undefined && scoreVal !== null && scoreVal !== "") {
                      const grading = getGradeCode(scoreVal);
                      subjectPoints[sub.code] = grading.points;
                      subjectGrades[sub.code] = grading.code;
                      totalPoints += grading.points;
                      gradedSubjectsCount++;
                    } else {
                      subjectPoints[sub.code] = "";
                      subjectGrades[sub.code] = "—";
                    }
                  });

                  return {
                    id: l.id,
                    admNo: l.admNo,
                    name: l.name,
                    stream: l.stream,
                    total,
                    mean,
                    subjectScores,
                    subjectCount: count,
                    enteredCount,
                    gradeCode: getGradeCode(enteredCount > 0 ? mean : null).code,
                    totalPoints,
                    gradedSubjectsCount,
                    subjectPoints,
                    subjectGrades
                  };
                });

                // Sort depending on format choice
                const sortedCandidates = [...rawCandidates];
                if (gradeReportFormat === 'points' || gradeReportFormat === 'grades') {
                  sortedCandidates.sort((a, b) => b.totalPoints - a.totalPoints || b.mean - a.mean);
                } else {
                  sortedCandidates.sort((a, b) => b.mean - a.mean);
                }

                const rankedCandidates = sortedCandidates.map((c, idx) => ({
                  ...c,
                  currentRank: idx + 1
                }));

                const finalTitle = gradeReportTitle || activeReportModal.data.examName || "CBC Composite Merit Deck";
                const finalSchoolName = gradeReportSchoolName || schoolProfile.name || 'ELGON VIEW HEIGHTS HIGH SCHOOL';

                return (
                  <div className="space-y-6">
                    {/* ⚙️ CONTROLS & FILTERING PANEL (Hidden when printing) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 print:hidden">
                      
                      {/* Card 1: Filter Report */}
                      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
                        <div className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                          <span className="w-5 h-5 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-bold text-[10px]">1</span>
                          FILTER REPORT
                        </div>
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Grade Level</label>
                            <select
                              value={targetGrade}
                              onChange={(e) => setGradeReportGrade(e.target.value)}
                              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none cursor-pointer"
                            >
                              {grades.map(g => (
                                <option key={g.id} value={g.name}>{g.name}</option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Grading Scheme</label>
                            <select
                              value={selectedGradingScheme}
                              onChange={(e) => {
                                const scheme = e.target.value;
                                setSelectedGradingScheme(scheme);
                                if (scheme === 'academic_setup') {
                                  setGradingRules(getGradingRules());
                                } else if (scheme === 'standard_cbc') {
                                  setGradingRules([
                                    { id: 'std1', code: 'EE', min: 80, max: 100, points: 4, category: 'ee' },
                                    { id: 'std2', code: 'ME', min: 60, max: 79, points: 3, category: 'me' },
                                    { id: 'std3', code: 'AE', min: 40, max: 59, points: 2, category: 'ae' },
                                    { id: 'std4', code: 'BE', min: 0, max: 39, points: 1, category: 'be' }
                                  ]);
                                }
                              }}
                              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none cursor-pointer"
                            >
                              <option value="academic_setup">Active CBC Grading Scheme</option>
                              <option value="standard_cbc">Standard Ministry CBC (EE, ME, AE, BE)</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Card 2: Report Format */}
                      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
                        <div className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                          <span className="w-5 h-5 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-bold text-[10px]">2</span>
                          REPORT FORMAT
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => setGradeReportFormat('marks')}
                            className={`p-2 rounded-xl text-xs font-extrabold transition-all border flex flex-col items-center justify-center gap-1 cursor-pointer ${
                              gradeReportFormat === 'marks'
                                ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <span className="text-base">🏆</span>
                            <span className="text-[10px] tracking-tight">Marks & Rank</span>
                          </button>
                          <button
                            onClick={() => setGradeReportFormat('points')}
                            className={`p-2 rounded-xl text-xs font-extrabold transition-all border flex flex-col items-center justify-center gap-1 cursor-pointer ${
                              gradeReportFormat === 'points'
                                ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <span className="text-base">🏅</span>
                            <span className="text-[10px] tracking-tight">Points Order</span>
                          </button>
                          <button
                            onClick={() => setGradeReportFormat('grades')}
                            className={`p-2 rounded-xl text-xs font-extrabold transition-all border flex flex-col items-center justify-center gap-1 cursor-pointer ${
                              gradeReportFormat === 'grades'
                                ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <span className="text-base">🅰️</span>
                            <span className="text-[10px] tracking-tight">Grades Only</span>
                          </button>
                          <button
                            onClick={() => setGradeReportFormat('full')}
                            className={`p-2 rounded-xl text-xs font-extrabold transition-all border flex flex-col items-center justify-center gap-1 cursor-pointer ${
                              gradeReportFormat === 'full'
                                ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <span className="text-base">📋</span>
                            <span className="text-[10px] tracking-tight">Full Report</span>
                          </button>
                        </div>
                      </div>

                      {/* Card 3: Customization Panel */}
                      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
                        <div className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-bold text-[10px]">3</span>
                            CUSTOMISE DESIGN
                          </div>
                          <button 
                            onClick={() => setGradeReportCustomiseOpen(!gradeReportCustomiseOpen)}
                            className="text-[10px] text-blue-600 hover:underline font-extrabold cursor-pointer uppercase tracking-wider"
                          >
                            {gradeReportCustomiseOpen ? 'Collapse ✕' : 'Expand ⚙️'}
                          </button>
                        </div>

                        <div className="space-y-2">
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Custom Exam Title</label>
                            <input
                              type="text"
                              value={gradeReportTitle}
                              onChange={(e) => setGradeReportTitle(e.target.value)}
                              placeholder={activeExamObj?.examName || "End Term Exam"}
                              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none"
                            />
                          </div>
                          {gradeReportCustomiseOpen && (
                            <div className="space-y-2 pt-1 border-t border-slate-100 animate-fadeIn">
                              <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Custom School Name</label>
                                <input
                                  type="text"
                                  value={gradeReportSchoolName}
                                  onChange={(e) => setGradeReportSchoolName(e.target.value)}
                                  placeholder={schoolProfile.name || "School Name"}
                                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none"
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Font Style</label>
                                  <select
                                    value={gradeReportFontFamily}
                                    onChange={(e) => setGradeReportFontFamily(e.target.value)}
                                    className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-bold outline-none cursor-pointer"
                                  >
                                    <option value="'Segoe UI', Roboto, sans-serif">Standard Sans</option>
                                    <option value="'Inter', sans-serif">Inter</option>
                                    <option value="'Space Grotesk', sans-serif">Space Grotesk</option>
                                    <option value="'Georgia', serif">Georgia Serif</option>
                                    <option value="'JetBrains Mono', monospace">JetBrains Mono</option>
                                  </select>
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Font Size ({gradeReportFontSize}px)</label>
                                  <input
                                    type="range"
                                    min="9"
                                    max="18"
                                    value={gradeReportFontSize}
                                    onChange={(e) => setGradeReportFontSize(Number(e.target.value))}
                                    className="w-full cursor-pointer accent-blue-600"
                                  />
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Text Color</label>
                                  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 p-1.5 rounded-xl">
                                    <input
                                      type="color"
                                      value={gradeReportTextColor}
                                      onChange={(e) => setGradeReportTextColor(e.target.value)}
                                      className="w-6 h-6 border-0 rounded cursor-pointer p-0 bg-transparent"
                                    />
                                    <span className="text-[9px] font-mono font-bold text-slate-500">{gradeReportTextColor}</span>
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Header Accent</label>
                                  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 p-1.5 rounded-xl">
                                    <input
                                      type="color"
                                      value={gradeReportHeaderColor}
                                      onChange={(e) => setGradeReportHeaderColor(e.target.value)}
                                      className="w-6 h-6 border-0 rounded cursor-pointer p-0 bg-transparent"
                                    />
                                    <span className="text-[9px] font-mono font-bold text-slate-500">{gradeReportHeaderColor}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                    </div>

                    {/* 📄 PRINTABLE GRADE REPORT CARD */}
                    <div 
                      className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-6 md:p-8 space-y-6 relative overflow-hidden"
                      style={{
                        fontFamily: gradeReportFontFamily,
                        fontSize: `${gradeReportFontSize}px`,
                        color: gradeReportTextColor,
                      }}
                    >
                      {/* 🎨 WATERMARK */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none z-0">
                        <img 
                          src={schoolProfile.logoUrl || schoolProfile.logo || "https://via.placeholder.com/450/2563EB/FFFFFF?text=SCHOOL+WATERMARK"} 
                          alt="School Watermark" 
                          className="w-[450px] h-[450px] object-contain select-none"
                          referrerPolicy="no-referrer"
                        />
                      </div>

                      {/* 📄 REPORT HEADER */}
                      <div className="relative z-10 flex flex-col sm:flex-row justify-between items-center sm:items-start text-center sm:text-left gap-4 border-b border-slate-200 pb-5">
                        <div className="flex-1 space-y-1">
                          <span className="text-[9px] font-black tracking-widest text-blue-600 uppercase block">Ministry of Education</span>
                          <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight uppercase">
                            {finalSchoolName}
                          </h2>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs text-slate-500 font-bold mt-2">
                            <div>
                              <span className="text-slate-400 uppercase text-[9px] tracking-wider block font-semibold">Assessment / Exam Name</span>
                              <span className="text-slate-800 text-sm font-black uppercase">{finalTitle}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 uppercase text-[9px] tracking-wider block font-semibold">Academic Session</span>
                              <span className="text-slate-800 text-sm font-black">{activeExamObj?.academicYear || "2026"}</span>
                            </div>
                            <div className="mt-1">
                              <span className="text-slate-400 uppercase text-[9px] tracking-wider block font-semibold">Grade & Stream</span>
                              <span className="text-slate-800 text-sm font-black uppercase">{targetGrade} · All Streams</span>
                            </div>
                            <div className="mt-1">
                              <span className="text-slate-400 uppercase text-[9px] tracking-wider block font-semibold">Term</span>
                              <span className="text-slate-800 text-sm font-black uppercase">{activeExamObj?.term || "Term 1"}</span>
                            </div>
                          </div>
                        </div>
                        {/* School Logo at the top right corner */}
                        <div className="shrink-0 flex justify-end">
                          <img 
                            src={schoolProfile.logoUrl || "https://via.placeholder.com/110/2563EB/FFFFFF?text=SCHOOL+LOGO"} 
                            alt="School Logo" 
                            className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-2xl border border-slate-200 bg-slate-50 p-1.5 shadow-sm"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      </div>

                      {/* Mobile Swipe Helper */}
                      <div className="sm:hidden flex items-center justify-center gap-1.5 text-[10px] font-black text-slate-500 bg-slate-100/80 border border-slate-200/50 py-2.5 px-3 rounded-xl select-none relative z-10 animate-pulse">
                        <span>📱</span>
                        <span>Swipe left/right to view full Merit List table</span>
                        <span>↔️</span>
                      </div>

                      {/* Title & Average Bar */}
                      <div className="flex justify-between items-center border-b border-slate-100 pb-3 relative z-10">
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">
                          Class List & Performance Sheet · {targetGrade} (All Streams)
                        </h4>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Grade Average: {Number((rankedCandidates.reduce((sum: number, c: any) => sum + c.mean, 0) / (rankedCandidates.length || 1)).toFixed(1))}%
                        </span>
                      </div>

                      {/* 📊 MERIT LIST TABLE CONTAINER */}
                      <div className="relative z-10 overflow-x-auto border border-slate-150 rounded-2xl bg-white/90 backdrop-blur-[2px]">
                        <table className="w-full text-left border-collapse text-xs" style={{ fontSize: `${gradeReportFontSize}px` }}>
                          <thead>
                            <tr 
                              className="text-white font-black uppercase text-[10px] tracking-wider whitespace-nowrap"
                              style={{ backgroundColor: gradeReportHeaderColor }}
                            >
                              {gradeReportFormat !== 'grades' && (
                                <th className="p-2 text-center border-b border-white/10 whitespace-nowrap">POS</th>
                              )}
                              <th className="p-2 border-b border-white/10 whitespace-nowrap">ADM</th>
                              <th className="p-2 border-b border-white/10 whitespace-nowrap candidate-name">CANDIDATE NAME</th>
                              <th className="p-2 border-b border-white/10 whitespace-nowrap">STREAM</th>
                              
                              {activeSubjects.map((sub: any) => (
                                <th key={sub.id} className="p-2 text-center border-b border-white/10 whitespace-nowrap" title={sub.name}>
                                  {sub.code}
                                  {gradeReportFormat === 'points' && " (PTS)"}
                                  {gradeReportFormat === 'grades' && " (GRD)"}
                                </th>
                              ))}

                              {gradeReportFormat !== 'points' && gradeReportFormat !== 'grades' && (
                                <th className="p-2 text-center border-b border-white/10 whitespace-nowrap">TOTAL</th>
                              )}
                              {(gradeReportFormat === 'full' || gradeReportFormat === 'points' || gradeReportFormat === 'grades') && (
                                <th className="p-2 text-center border-b border-white/10 whitespace-nowrap">POINTS</th>
                              )}
                              {gradeReportFormat !== 'points' && gradeReportFormat !== 'grades' && (
                                <th className="p-2 text-center border-b border-white/10 whitespace-nowrap">MEAN %</th>
                              )}
                              {gradeReportFormat !== 'marks' && (
                                <th className="p-2 text-center border-b border-white/10 whitespace-nowrap">GRADE</th>
                              )}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-150">
                            {rankedCandidates.map((cand: any) => (
                              <tr key={cand.id} className="hover:bg-slate-50/50 transition">
                                
                                {gradeReportFormat !== 'grades' && (
                                  <td className="p-2 text-center font-black text-slate-900 border-r border-slate-100">
                                    {cand.currentRank}
                                  </td>
                                )}
                                
                                <td className="p-2 font-mono font-bold text-slate-600 border-r border-slate-100">{cand.admNo}</td>
                                <td className="p-2 font-black text-slate-800 border-r border-slate-100 candidate-name">{cand.name}</td>
                                <td className="p-2 font-semibold text-slate-500 border-r border-slate-100">{cand.stream}</td>
                                
                                {activeSubjects.map((sub: any) => {
                                  const scoreVal = cand.subjectScores[sub.code];
                                  
                                  return (
                                    <td key={sub.id} className="p-2 text-center font-bold text-slate-700 border-r border-slate-100">
                                      {gradeReportFormat === 'marks' && (scoreVal !== "" ? scoreVal : '—')}
                                      {gradeReportFormat === 'points' && (cand.subjectPoints[sub.code] !== "" ? cand.subjectPoints[sub.code] : '—')}
                                      {gradeReportFormat === 'grades' && cand.subjectGrades[sub.code]}
                                      {gradeReportFormat === 'full' && (
                                        <div className="flex flex-col items-center">
                                          <span className="font-extrabold text-slate-900">{scoreVal !== "" ? scoreVal : '—'}</span>
                                          {scoreVal !== "" && (
                                            <span className="text-[9px] text-slate-400 font-bold block mt-0.5">
                                              {cand.subjectGrades[sub.code]} ({cand.subjectPoints[sub.code]}p)
                                            </span>
                                          )}
                                        </div>
                                      )}
                                    </td>
                                  );
                                })}

                                {gradeReportFormat !== 'points' && gradeReportFormat !== 'grades' && (
                                  <td className="p-2 text-center font-black text-blue-600 bg-blue-50/10 border-r border-slate-100">{cand.total}</td>
                                )}
                                
                                {(gradeReportFormat === 'full' || gradeReportFormat === 'points' || gradeReportFormat === 'grades') && (
                                  <td className="p-2 text-center font-black text-purple-600 bg-purple-50/10 border-r border-slate-100">{cand.totalPoints} pts</td>
                                )}

                                {gradeReportFormat !== 'points' && gradeReportFormat !== 'grades' && (
                                  <td className="p-2 text-center font-black text-emerald-600 bg-emerald-50/10 border-r border-slate-100">{cand.mean}%</td>
                                )}

                                {gradeReportFormat !== 'marks' && (
                                  <td className="p-2 text-center">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-black block text-center ${
                                      cand.gradeCode.startsWith('EE') ? 'bg-emerald-50 text-emerald-600' :
                                      cand.gradeCode.startsWith('ME') ? 'bg-blue-50 text-blue-600' :
                                      cand.gradeCode.startsWith('AE') ? 'bg-amber-50 text-amber-600' :
                                      'bg-rose-50 text-rose-600'
                                    }`}>
                                      {cand.gradeCode}
                                    </span>
                                  </td>
                                )}

                              </tr>
                            ))}

                            {/* Grade Subject averages summary row */}
                            <tr className="bg-slate-100/70 font-bold text-slate-700">
                              <td colSpan={gradeReportFormat !== 'grades' ? 4 : 3} className="p-2.5 text-right text-xs uppercase font-black">
                                GRADE MEAN SUBJECT MARKS:
                              </td>
                              {activeSubjects.map((sub: any) => {
                                let sum = 0;
                                let count = 0;
                                rankedCandidates.forEach((c: any) => {
                                  const score = c.subjectScores[sub.code];
                                  if (typeof score === 'number' && !isNaN(score)) {
                                    sum += score;
                                    count++;
                                  }
                                });
                                const avg = count > 0 ? (sum / count).toFixed(1) : '—';
                                return (
                                  <td key={sub.id} className="p-2 text-center font-extrabold text-blue-600 border-r border-slate-100">
                                    {avg}%
                                  </td>
                                );
                              })}
                              <td colSpan={4} className="p-2"></td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* 📊 GRADING SCALE LEGEND */}
                      <div className="relative z-10 pt-4 border-t border-slate-200 space-y-3">
                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                          <span>📊</span>
                          Grading Scale Legend
                        </h4>
                        <div className="grid grid-cols-1 min-[400px]:grid-cols-2 sm:grid-cols-4 gap-3 print:grid-cols-4">
                          {gradingRules.map((rule, idx) => {
                            const colors = [
                              { text: 'text-blue-600', bg: 'bg-blue-50/40 border-blue-100' },
                              { text: 'text-purple-600', bg: 'bg-purple-50/40 border-purple-100' },
                              { text: 'text-emerald-600', bg: 'bg-emerald-50/40 border-emerald-100' },
                              { text: 'text-amber-600', bg: 'bg-amber-50/40 border-amber-100' },
                              { text: 'text-rose-600', bg: 'bg-rose-50/40 border-rose-100' },
                              { text: 'text-slate-600', bg: 'bg-slate-50/40 border-slate-100' }
                            ];
                            const theme = colors[idx % colors.length];

                            return (
                              <div key={rule.id} className={`p-3 rounded-xl border flex flex-col justify-between ${theme.bg}`}>
                                <div>
                                  <span className={`text-xs font-black block ${theme.text}`}>{rule.code}</span>
                                  <p className="text-[9px] font-extrabold text-slate-500 mt-0.5">{rule.min.toFixed(0)}–{rule.max.toFixed(0)}%</p>
                                </div>
                                <span className="text-[9px] font-black text-slate-600 mt-2 block">{rule.points.toFixed(0)} pts</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                    </div>
                  </div>
                );
              })()}

              {/* Report Body: STREAM CLASS SHEET */}
              {activeReportModal.type === 'stream' && (
                <div className="space-y-6">
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6 relative overflow-hidden">
                    
                    {/* School Logo Watermark */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none z-0">
                      <img 
                        src={schoolProfile.logoUrl || "https://via.placeholder.com/110/2563EB/FFFFFF?text=SCHOOL+LOGO"} 
                        alt="Watermark" 
                        className="w-96 h-96 object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    
                    {/* 📄 REPORT HEADER */}
                    <div className="flex flex-col sm:flex-row justify-between items-center sm:items-start text-center sm:text-left gap-4 border-b border-slate-200 pb-5">
                      <div className="flex-1 space-y-1">
                        <span className="text-[9px] font-black tracking-widest text-blue-600 uppercase block">Ministry of Education</span>
                        <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight uppercase">
                          {schoolProfile.name || 'ELGON VIEW HEIGHTS HIGH SCHOOL'}
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs text-slate-500 font-bold mt-2">
                          <div>
                            <span className="text-slate-400 uppercase text-[9px] tracking-wider block font-semibold">Assessment / Exam Name</span>
                            <span className="text-slate-800 text-sm font-black uppercase">{activeReportModal.data.examName || activeExamObj?.examName || "End Term Exam"}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 uppercase text-[9px] tracking-wider block font-semibold">Academic Session</span>
                            <span className="text-slate-800 text-sm font-black">{activeReportModal.data.academicYear || "2026"}</span>
                          </div>
                          <div className="mt-1">
                            <span className="text-slate-400 uppercase text-[9px] tracking-wider block font-semibold">Grade & Stream</span>
                            <span className="text-slate-800 text-sm font-black uppercase">{activeReportModal.data.gradeLabel} · {activeReportModal.data.streamLabel}</span>
                          </div>
                          <div className="mt-1">
                            <span className="text-slate-400 uppercase text-[9px] tracking-wider block font-semibold">Term</span>
                            <span className="text-slate-800 text-sm font-black uppercase">{activeReportModal.data.term || "Term 1"}</span>
                          </div>
                        </div>
                      </div>
                      {/* School Logo at the top right corner */}
                      <div className="shrink-0 flex justify-end">
                        <img 
                          src={schoolProfile.logoUrl || "https://via.placeholder.com/110/2563EB/FFFFFF?text=SCHOOL+LOGO"} 
                          alt="School Logo" 
                          className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-2xl border border-slate-200 bg-slate-50 p-1.5 shadow-sm"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    </div>

                    <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">
                        Class List & Performance Sheet · {activeReportModal.data.gradeLabel} {activeReportModal.data.streamLabel}
                      </h4>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Class Average: {Number((activeReportModal.data.candidates.reduce((sum: number, c: any) => sum + c.mean, 0) / activeReportModal.data.candidates.length).toFixed(1))}%
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 font-black text-slate-500 uppercase border-b border-slate-150">
                            <th className="p-2 text-center">CLASS RANK</th>
                            <th className="p-2">ADM</th>
                            <th className="p-2">CANDIDATE NAME</th>
                            {activeReportModal.data.subjects.map((sub: any) => (
                              <th key={sub.id} className="p-2 text-center" title={sub.name}>{sub.code}</th>
                            ))}
                            <th className="p-2 text-center bg-blue-50/50 text-blue-800">TOTAL SCORE</th>
                            <th className="p-2 text-center bg-emerald-50/50 text-emerald-800">MEAN %</th>
                            <th className="p-2 text-center">GRADE</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {activeReportModal.data.candidates.map((cand: any) => (
                            <tr key={cand.id} className="hover:bg-slate-50/50">
                              <td className="p-2 text-center font-bold">
                                {cand.position}
                              </td>
                              <td className="p-2 font-mono font-bold text-slate-600">{cand.admNo}</td>
                              <td className="p-2 font-bold text-slate-900 candidate-name">{cand.name}</td>
                              {activeReportModal.data.subjects.map((sub: any) => (
                                <td key={sub.id} className="p-2 text-center text-slate-600 font-semibold">
                                  {cand.subjectScores[sub.code] || '—'}
                                </td>
                              ))}
                              <td className="p-2 text-center font-black bg-blue-50/20 text-blue-600">{cand.total}</td>
                              <td className="p-2 text-center font-black bg-emerald-50/20 text-emerald-600">{cand.mean}%</td>
                              <td className="p-2 text-center">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                                  cand.gradeCode.startsWith('EE') ? 'bg-emerald-50 text-emerald-600' :
                                  cand.gradeCode.startsWith('ME') ? 'bg-blue-50 text-blue-600' :
                                  'bg-amber-50 text-amber-600'
                                }`}>
                                  {cand.gradeCode}
                                </span>
                              </td>
                            </tr>
                          ))}
                          
                          {/* Subject averages row */}
                          <tr className="bg-slate-100/70 font-bold text-slate-700">
                            <td colSpan={3} className="p-3 text-right text-xs uppercase font-black">STREAM MEAN SUBJECT MARKS:</td>
                            {activeReportModal.data.subjects.map((sub: any) => (
                              <td key={sub.id} className="p-3 text-center font-extrabold text-blue-600">
                                {activeReportModal.data.subjectAverages[sub.code]}%
                              </td>
                            ))}
                            <td colSpan={3} className="p-3"></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Report Body: SUBJECT REPORT */}
              {activeReportModal.type === 'subject' && (
                <div className="space-y-6">
                  
                  {/* 📄 REPORT HEADER */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-center sm:items-start text-center sm:text-left gap-4 pb-5">
                    <div className="flex-1 space-y-1">
                      <span className="text-[9px] font-black tracking-widest text-blue-600 uppercase block">Ministry of Education</span>
                      <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight uppercase">
                        {schoolProfile.name || 'ELGON VIEW HEIGHTS HIGH SCHOOL'}
                      </h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs text-slate-500 font-bold mt-2">
                        <div>
                          <span className="text-slate-400 uppercase text-[9px] tracking-wider block font-semibold">Assessment / Exam Name</span>
                          <span className="text-slate-800 text-sm font-black uppercase">{activeReportModal.data.examName || activeExamObj?.examName || "End Term Exam"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 uppercase text-[9px] tracking-wider block font-semibold">Academic Session</span>
                          <span className="text-slate-800 text-sm font-black">{activeReportModal.data.academicYear || "2026"}</span>
                        </div>
                        <div className="mt-1">
                          <span className="text-slate-400 uppercase text-[9px] tracking-wider block font-semibold">Subject & Code</span>
                          <span className="text-slate-800 text-sm font-black uppercase">{activeReportModal.data.subjectName} ({activeReportModal.data.subjectCode})</span>
                        </div>
                        <div className="mt-1">
                          <span className="text-slate-400 uppercase text-[9px] tracking-wider block font-semibold">Term</span>
                          <span className="text-slate-800 text-sm font-black uppercase">{activeReportModal.data.term || "Term 1"}</span>
                        </div>
                      </div>
                    </div>
                    {/* School Logo at the top right corner */}
                    <div className="shrink-0 flex justify-end">
                      <img 
                        src={schoolProfile.logoUrl || "https://via.placeholder.com/110/2563EB/FFFFFF?text=SCHOOL+LOGO"} 
                        alt="School Logo" 
                        className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-2xl border border-slate-200 bg-slate-50 p-1.5 shadow-sm"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>

                  {/* Stream standings */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-1">
                      <School className="w-4 h-4 text-amber-600" />
                      Class Stream Standings in {activeReportModal.data.subjectName}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {activeReportModal.data.streamsPerformance.map((st: any, idx: number) => (
                        <div key={st.stream} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Rank #{idx + 1}</span>
                            <span className="text-sm font-bold text-slate-800">{st.stream}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-extrabold text-blue-600 block">{st.average}%</span>
                            <span className="text-[10px] font-black bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded uppercase">{st.gradeCode}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Individual Standings */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">
                      Top Performers Merit List · {activeReportModal.data.subjectName} ({activeReportModal.data.subjectCode})
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 font-black text-slate-500 uppercase border-b border-slate-150">
                            <th className="p-3 text-center">RANK</th>
                            <th className="p-3">ADM</th>
                            <th className="p-3">STUDENT NAME</th>
                            <th className="p-3">GRADE LEVEL</th>
                            <th className="p-3">STREAM</th>
                            <th className="p-3 text-center">SCORE</th>
                            <th className="p-3 text-center">ASSESSMENT CODE</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {activeReportModal.data.candidates.map((cand: any) => (
                            <tr key={cand.admNo} className="hover:bg-slate-50/50">
                              <td className="p-3 text-center font-bold">{cand.position}</td>
                              <td className="p-3 font-mono font-bold text-slate-600">{cand.admNo}</td>
                              <td className="p-3 font-bold text-slate-900">{cand.name}</td>
                              <td className="p-3 text-slate-500 font-semibold">{cand.gradeLabel}</td>
                              <td className="p-3 text-slate-500 font-semibold">{cand.stream}</td>
                              <td className="p-3 text-center font-extrabold text-blue-600">{cand.score}%</td>
                              <td className="p-3 text-center">
                                <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">{cand.gradeCode}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              )}

              {/* Report Body: INDIVIDUAL LEARNER REPORT CARD */}
              {activeReportModal.type === 'learner_single' && (
                <div className="max-w-4xl mx-auto bg-white p-8 border border-slate-300 rounded-2xl shadow-sm text-slate-900 relative print:border-none print:shadow-none print:p-0 overflow-hidden">
                  <PrintHeader />
                  
                  {/* School Logo Watermark */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none z-0">
                    <img 
                      src={schoolProfile.logoUrl || "https://via.placeholder.com/110/2563EB/FFFFFF?text=SCHOOL+LOGO"} 
                      alt="Watermark" 
                      className="w-96 h-96 object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  
                  {/* High Quality School Header block */}
                  <div className="relative flex flex-col sm:flex-row justify-between items-center sm:items-start text-center sm:text-left gap-4 border-b-4 border-double border-slate-800 pb-5">
                    <div className="flex-1 space-y-1">
                      <span className="text-[10px] font-black text-blue-600 tracking-widest uppercase block">MINISTRY OF EDUCATION</span>
                      <h1 className="text-xl sm:text-2xl font-black uppercase text-slate-900">{schoolProfile.name || 'ELGON VIEW HEIGHTS HIGH SCHOOL'}</h1>
                      <p className="text-xs text-slate-600 font-semibold">
                        {schoolProfile.pobox ? `P.O. Box ${schoolProfile.pobox}-${schoolProfile.postalCode}` : 'P.O. Box 400-30100, Eldoret'} 
                        {schoolProfile.location ? ` · Location: ${schoolProfile.location}` : ''}
                      </p>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs text-slate-500 font-bold mt-3">
                        <div>
                          <span className="text-slate-400 uppercase text-[9px] tracking-wider block font-semibold">Assessment / Exam Name</span>
                          <span className="text-slate-800 text-sm font-black uppercase">{activeReportModal.data.examName} REPORT CARD</span>
                        </div>
                        <div>
                          <span className="text-slate-400 uppercase text-[9px] tracking-wider block font-semibold">Academic Session</span>
                          <span className="text-slate-800 text-sm font-black">{activeReportModal.data.academicYear || "2026"}</span>
                        </div>
                        <div className="mt-1">
                          <span className="text-slate-400 uppercase text-[9px] tracking-wider block font-semibold">Grade & Stream</span>
                          <span className="text-slate-800 text-sm font-black uppercase">
                            {activeReportModal.data.learner.gradeLabel || `Grade ${activeReportModal.data.learner.grade}`} · {activeReportModal.data.learner.stream}
                          </span>
                        </div>
                        <div className="mt-1">
                          <span className="text-slate-400 uppercase text-[9px] tracking-wider block font-semibold">Term</span>
                          <span className="text-slate-800 text-sm font-black uppercase">{activeReportModal.data.term || "Term 1"}</span>
                        </div>
                      </div>
                    </div>
                    {/* School Logo at the top right corner */}
                    <div className="shrink-0 flex justify-end">
                      <img 
                        src={schoolProfile.logoUrl || "https://via.placeholder.com/110/2563EB/FFFFFF?text=SCHOOL+LOGO"} 
                        alt="School Logo" 
                        className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-2xl border border-slate-200 bg-slate-50 p-1.5 shadow-sm"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>

                  {/* Student bio block */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-6 text-xs border-b border-slate-200">
                    <div className="space-y-1">
                      <span className="text-slate-400 font-bold uppercase tracking-wider block text-[9px]">Learner Name:</span>
                      <span className="font-extrabold text-slate-800">{activeReportModal.data.learner.name}</span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-slate-400 font-bold uppercase tracking-wider block text-[9px]">Admission Number:</span>
                      <span className="font-mono font-extrabold text-slate-800">{activeReportModal.data.learner.admNo}</span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-slate-400 font-bold uppercase tracking-wider block text-[9px]">Grade Level & Stream:</span>
                      <span className="font-extrabold text-slate-800">
                        {activeReportModal.data.learner.gradeLabel || `Grade ${activeReportModal.data.learner.grade}`} · {activeReportModal.data.learner.stream}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-slate-400 font-bold uppercase tracking-wider block text-[9px]">Academic Period:</span>
                      <span className="font-extrabold text-slate-800">{activeReportModal.data.academicYear} · {activeReportModal.data.term}</span>
                    </div>
                  </div>

                  {/* Performance Analysis grid */}
                  <div className="py-6 space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-700">Competency Assessment Summary</h3>
                    
                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 font-black text-slate-500 uppercase border-b border-slate-200">
                            <th className="p-3">SUBJECT CODE</th>
                            <th className="p-3">LEARNING AREA / SUBJECT</th>
                            <th className="p-3 text-center">SCORE (%)</th>
                            <th className="p-3 text-center">RATING</th>
                            <th className="p-3 text-center">POINTS</th>
                            <th className="p-3">SUBJECT TEACHER REMARKS</th>
                            <th className="p-3 text-center">INITIALS</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {activeReportModal.data.subjects.map((sub: any) => (
                            <tr key={sub.code}>
                              <td className="p-3 font-mono font-bold text-slate-900">{sub.code}</td>
                              <td className="p-3 font-bold text-slate-800">{sub.name}</td>
                              <td className="p-3 text-center font-extrabold text-blue-600">{sub.score}%</td>
                              <td className="p-3 text-center">
                                <span className="bg-blue-50 text-blue-700 font-black px-1.5 py-0.5 rounded text-[9px]">
                                  {sub.gradeCode}
                                </span>
                              </td>
                              <td className="p-3 text-center font-mono font-bold text-slate-600">{sub.points}</td>
                              <td className="p-3 text-slate-500 font-medium italic">{sub.remarks}</td>
                              <td className="p-3 text-center font-bold text-slate-400">{sub.initials}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Cohort position and ranks blocks */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div className="space-y-1.5 text-xs text-slate-700">
                      <p className="font-bold">
                        Stream Position:{' '}
                        <span className="font-black text-blue-600">
                          {activeReportModal.data.streamPosition}
                        </span>{' '}
                        out of <span className="font-black">{activeReportModal.data.streamTotal}</span> candidates
                      </p>
                      <p className="font-bold">
                        Grade Level Position:{' '}
                        <span className="font-black text-blue-600">
                          {activeReportModal.data.gradePosition}
                        </span>{' '}
                        out of <span className="font-black">{activeReportModal.data.gradeTotal}</span> candidates
                      </p>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-700">
                      <p className="font-bold">
                        Total Points: <span className="font-black text-emerald-600">{activeReportModal.data.totalScore}</span>
                      </p>
                      <p className="font-bold">
                        KJSEA Classification:{' '}
                        <span className="font-black text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">
                          {getKJSEAClassification(activeReportModal.data.totalScore).performance} ({getKJSEAClassification(activeReportModal.data.totalScore).category})
                        </span>
                      </p>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-700 sm:text-right">
                      <p className="font-bold">
                        Total Marks Obtained:{' '}
                        <span className="font-black text-slate-900">
                          {activeReportModal.data.totalScore}
                        </span>{' '}
                        / {activeReportModal.data.maxTotal}
                      </p>
                      <p className="font-bold">
                        Performance Mean Average:{' '}
                        <span className="font-black text-emerald-600">
                          {activeReportModal.data.meanScore}%
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* General Comments */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6 border-t border-slate-200 text-xs mt-6">
                    <div className="space-y-2">
                      <h4 className="font-black uppercase tracking-wider text-slate-600 text-[10px]">Class Teacher’s Assessment:</h4>
                      <p className="bg-slate-50 p-3 rounded-xl text-slate-600 italic font-medium leading-relaxed">
                        "{activeReportModal.data.meanScore >= 80 
                          ? 'A exceptionally brilliant student who shows fantastic initiative and consistency. Keep striving!' 
                          : activeReportModal.data.meanScore >= 60 
                          ? 'A reliable and hard-working learner. Maintains satisfactory discipline and class performance.'
                          : 'Has the potential for greater progress. Needs to consolidate concentration in STEM subjects.'
                        }"
                      </p>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-black uppercase tracking-wider text-slate-600 text-[10px]">Principal’s Final Counsel:</h4>
                      <p className="bg-slate-50 p-3 rounded-xl text-slate-600 italic font-medium leading-relaxed">
                        "{activeReportModal.data.meanScore >= 80 
                          ? 'Outstanding report. Clear potential for senior pathways of choice.' 
                          : activeReportModal.data.meanScore >= 60 
                          ? 'Satisfactory attainment of key learning targets. Recommended to maintain momentum.'
                          : 'A fresh focus on study schedules over the holidays is recommended for rapid improvements.'
                        }"
                      </p>
                    </div>
                  </div>

                  {/* Signatures Footer */}
                  <div className="grid grid-cols-3 gap-6 pt-12 border-t border-dashed border-slate-300 text-center text-xs mt-6 font-semibold">
                    <div className="space-y-1">
                      <div className="h-6 border-b border-slate-300 w-32 mx-auto"></div>
                      <span className="text-[10px] text-slate-400 uppercase font-black block">Class Teacher</span>
                    </div>
                    <div className="space-y-1">
                      <div className="h-6 flex items-center justify-center font-serif text-[10px] text-indigo-500 italic font-bold">
                        {schoolProfile.principalName || 'Dr. Joseph K. Kiprop'}
                      </div>
                      <div className="border-b border-slate-300 w-32 mx-auto"></div>
                      <span className="text-[10px] text-slate-400 uppercase font-black block">Principal Signature</span>
                    </div>
                    <div className="space-y-1">
                      <div className="h-6 border-b border-slate-300 w-32 mx-auto"></div>
                      <span className="text-[10px] text-slate-400 uppercase font-black block">Parent Seal / Sign</span>
                    </div>
                  </div>

                  {/* Verification QR Code Badge */}
                  <div className="mt-8 pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
                    <VerificationQRCode admissionNo={activeReportModal.data.admissionNo} learnerName={activeReportModal.data.name} />
                    <div className="text-right text-[10px] font-mono text-slate-400">
                      <span>Official Academic Evaluation Report</span>
                      <span className="block">Generated dynamically · Page 1 of 1</span>
                    </div>
                  </div>

                </div>
              )}

              {/* Report Body: BULK ALL CANDIDATES REPORT CARDS */}
              {activeReportModal.type === 'learner_all' && (
                <div className="space-y-10">
                  <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl text-xs text-blue-700 font-bold flex items-center gap-2 print:hidden">
                    <CheckCircle className="w-4 h-4" />
                    Merged candidate report card deck is active. Use "Print Report" at the top to print cards for all {activeReportModal.data.reportCards.length} learners!
                  </div>

                  {activeReportModal.data.reportCards.map((card: any, idx: number) => (
                    <div key={card.learner.id} className="bg-white p-8 border border-slate-300 rounded-2xl shadow-sm text-slate-900 relative page-break-after print:border-none print:shadow-none print:p-0 overflow-hidden">
                      <PrintHeader />
                      
                      {/* School Logo Watermark */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none z-0">
                        <img 
                          src={schoolProfile.logoUrl || "https://via.placeholder.com/110/2563EB/FFFFFF?text=SCHOOL+LOGO"} 
                          alt="Watermark" 
                          className="w-96 h-96 object-contain"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      
                      {/* High Quality School Header block */}
                      <div className="relative flex flex-col sm:flex-row justify-between items-center sm:items-start text-center sm:text-left gap-4 border-b-4 border-double border-slate-800 pb-5">
                        <div className="flex-1 space-y-1">
                          <span className="text-[10px] font-black text-blue-600 tracking-widest uppercase block">MINISTRY OF EDUCATION</span>
                          <h1 className="text-xl sm:text-2xl font-black uppercase text-slate-900">{schoolProfile.name || 'ELGON VIEW HEIGHTS HIGH SCHOOL'}</h1>
                          <p className="text-xs text-slate-600 font-semibold">
                            {schoolProfile.pobox ? `P.O. Box ${schoolProfile.pobox}-${schoolProfile.postalCode}` : 'P.O. Box 400-30100, Eldoret'}
                          </p>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs text-slate-500 font-bold mt-3">
                            <div>
                              <span className="text-slate-400 uppercase text-[9px] tracking-wider block font-semibold">Assessment / Exam Name</span>
                              <span className="text-slate-800 text-sm font-black uppercase">{activeReportModal.data.examName} REPORT CARD</span>
                            </div>
                            <div>
                              <span className="text-slate-400 uppercase text-[9px] tracking-wider block font-semibold">Academic Session</span>
                              <span className="text-slate-800 text-sm font-black">{activeReportModal.data.academicYear || "2026"}</span>
                            </div>
                            <div className="mt-1">
                              <span className="text-slate-400 uppercase text-[9px] tracking-wider block font-semibold">Grade & Stream</span>
                              <span className="text-slate-800 text-sm font-black uppercase">
                                {card.learner.gradeLabel || `Grade ${card.learner.grade}`} · {card.learner.stream}
                              </span>
                            </div>
                            <div className="mt-1">
                              <span className="text-slate-400 uppercase text-[9px] tracking-wider block font-semibold">Term</span>
                              <span className="text-slate-800 text-sm font-black uppercase">{activeReportModal.data.term || "Term 1"}</span>
                            </div>
                          </div>
                        </div>
                        {/* School Logo at the top right corner */}
                        <div className="shrink-0 flex justify-end">
                          <img 
                            src={schoolProfile.logoUrl || "https://via.placeholder.com/110/2563EB/FFFFFF?text=SCHOOL+LOGO"} 
                            alt="School Logo" 
                            className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-2xl border border-slate-200 bg-slate-50 p-1.5 shadow-sm"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      </div>

                      {/* Student bio block */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-6 text-xs border-b border-slate-200">
                        <div className="space-y-1">
                          <span className="text-slate-400 font-bold uppercase tracking-wider block text-[9px]">Learner Name:</span>
                          <span className="font-extrabold text-slate-800">{card.learner.name}</span>
                        </div>
                        <div className="space-y-1">
                          <span className="text-slate-400 font-bold uppercase tracking-wider block text-[9px]">Admission Number:</span>
                          <span className="font-mono font-extrabold text-slate-800">{card.learner.admNo}</span>
                        </div>
                        <div className="space-y-1">
                          <span className="text-slate-400 font-bold uppercase tracking-wider block text-[9px]">Grade Level & Stream:</span>
                          <span className="font-extrabold text-slate-800">
                            {card.learner.gradeLabel || `Grade ${card.learner.grade}`} · {card.learner.stream}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <span className="text-slate-400 font-bold uppercase tracking-wider block text-[9px]">Academic Period:</span>
                          <span className="font-extrabold text-slate-800">{activeReportModal.data.academicYear} · {activeReportModal.data.term}</span>
                        </div>
                      </div>

                      {/* Performance Area */}
                      <div className="py-6 space-y-4">
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-700">Competency Assessment Summary</h3>
                        
                        <div className="overflow-x-auto border border-slate-200 rounded-xl">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-slate-50 font-black text-slate-500 uppercase border-b border-slate-200">
                                <th className="p-3">SUBJECT CODE</th>
                                <th className="p-3">LEARNING AREA</th>
                                <th className="p-3 text-center">SCORE (%)</th>
                                <th className="p-3 text-center">RATING</th>
                                <th className="p-3 text-center">POINTS</th>
                                <th className="p-3">SUBJECT TEACHER REMARKS</th>
                                <th className="p-3 text-center">INITIALS</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {card.subjects.map((sub: any) => (
                                <tr key={sub.code}>
                                  <td className="p-3 font-mono font-bold text-slate-900">{sub.code}</td>
                                  <td className="p-3 font-bold text-slate-800">{sub.name}</td>
                                  <td className="p-3 text-center font-extrabold text-blue-600">{sub.score}%</td>
                                  <td className="p-3 text-center">
                                    <span className="bg-blue-50 text-blue-700 font-black px-1.5 py-0.5 rounded text-[9px]">
                                      {sub.gradeCode}
                                    </span>
                                  </td>
                                  <td className="p-3 text-center font-mono font-bold text-slate-600">{sub.points}</td>
                                  <td className="p-3 text-slate-500 font-medium italic">{sub.remarks}</td>
                                  <td className="p-3 text-center font-bold text-slate-400">{sub.initials}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Rank blocks */}
                      <div className="grid grid-cols-2 gap-4 py-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <div className="space-y-1.5 text-xs text-slate-700">
                          <p className="font-bold">Stream Rank: <span className="font-black text-blue-600">{card.streamPosition}</span> / {card.streamTotal}</p>
                          <p className="font-bold">Grade Rank: <span className="font-black text-blue-600">{card.gradePosition}</span> / {card.gradeTotal}</p>
                        </div>
                        <div className="space-y-1.5 text-xs text-slate-700 text-right">
                          <p className="font-bold">Total Marks: <span className="font-black">{card.totalScore}</span> / {card.maxTotal}</p>
                          <p className="font-bold">Mean Average: <span className="font-black text-emerald-600">{card.meanScore}%</span></p>
                        </div>
                      </div>

                      {/* Comments */}
                      <div className="grid grid-cols-2 gap-6 py-6 border-t border-slate-200 text-xs mt-6">
                        <div className="space-y-1">
                          <h4 className="font-black uppercase tracking-wider text-slate-400 text-[9px]">Class Teacher Comments:</h4>
                          <p className="text-slate-600 italic leading-relaxed">
                            "{card.meanScore >= 80 ? 'An exceptional cohort leader. Excellent study practices shown.' : 'Consistently performs to standard. Displays reliable effort.'}"
                          </p>
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-black uppercase tracking-wider text-slate-400 text-[9px]">Principal Comments:</h4>
                          <p className="text-slate-600 italic leading-relaxed">
                            "{card.meanScore >= 80 ? 'Outstanding results. Keep setting the bar higher.' : 'Satisfactory grade. Recommended for continuous progression.'}"
                          </p>
                        </div>
                      </div>

                      {/* Signatures */}
                      <div className="grid grid-cols-3 gap-6 pt-10 border-t border-dashed border-slate-300 text-center text-xs mt-6 font-semibold">
                        <div>
                          <div className="border-b border-slate-300 w-24 mx-auto mb-1"></div>
                          <span className="text-[9px] text-slate-400 font-black block">Teacher Sign</span>
                        </div>
                        <div>
                          <span className="text-indigo-500 text-[9px] font-bold block italic">{schoolProfile.principalName || 'Dr. Joseph K Kiprop'}</span>
                          <div className="border-b border-slate-300 w-24 mx-auto mb-1"></div>
                          <span className="text-[9px] text-slate-400 font-black block">Principal Sign</span>
                        </div>
                        <div>
                          <div className="border-b border-slate-300 w-24 mx-auto mb-1"></div>
                          <span className="text-[9px] text-slate-400 font-black block">Parent Seal</span>
                        </div>
                      </div>

                      {/* Verification QR Code Badge */}
                      <div className="mt-8 pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
                        <VerificationQRCode admissionNo={card.admNo} learnerName={card.name} />
                        <div className="text-right text-[10px] font-mono text-slate-400">
                          <span>Official Academic Evaluation Report</span>
                          <span className="block">Generated dynamically · Page 1 of 1</span>
                        </div>
                      </div>

                    </div>
                  ))}
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-150 shrink-0 flex justify-end gap-3 print:hidden">
              <button 
                onClick={() => setActiveReportModal(null)}
                className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Close Report View
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Global CSS Inject to support page breaks for print deck */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .fixed {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
            background: white !important;
          }
          .fixed *, .fixed * * {
            visibility: visible !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .page-break-after {
            page-break-after: always !important;
            break-after: page !important;
            margin-bottom: 0 !important;
            border: none !important;
            box-shadow: none !important;
          }
        }
      `}</style>

    </div>
  );
}
