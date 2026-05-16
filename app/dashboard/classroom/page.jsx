// app/classrooms/page.jsx
'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import ClassroomFormModal from '@/components/classroom/ClassroomFormModal';
import AttendanceSummaryReport from '@/components/classroom/AttendanceSummaryReport';
import AcademicCalendar3D from '@/components/classroom/AcademicCalendar3D';
import RoutineManager3D from '@/components/classroom/RoutineManager3D';
import { Calendar, Clock, Library } from 'lucide-react';
import ELibrarySearch from '@/components/library/ELibrarySearch';

// ==================== CONFIRM MODAL ====================
function ConfirmModal({ isOpen, onClose, onConfirm, title, message, loading }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <Icons.AlertTriangle size={32} className="text-red-600" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-center text-gray-800 mb-2">
              {title}
            </h3>
            <p className="text-gray-600 text-center mb-6">{message}</p>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={loading}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Icons.Loader2 size={18} className="animate-spin" />{' '}
                    Deleting...
                  </>
                ) : (
                  <>
                    <Icons.Trash2 size={18} /> Delete
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ==================== LOADING STATE ====================
function LoadingState() {
  return (
    <div className="p-6">
      <div className="animate-pulse space-y-4">
        <div className="h-10 bg-gray-200 rounded w-1/4" />
        <div className="h-20 bg-gray-200 rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm p-6">
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-4" />
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded w-full" />
                <div className="h-4 bg-gray-200 rounded w-2/3" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ==================== EXAM SCHEDULE MODAL ====================
// ==================== EXAM SCHEDULE MODAL ====================
function ExamScheduleModal({
  isOpen,
  onClose,
  batchId,
  batchName,
  classrooms,
}) {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('schedule');
  const [scheduleView, setScheduleView] = useState('list');
  const [selectedExam, setSelectedExam] = useState(null);
  const [examResults, setExamResults] = useState(null);
  const [loadingResults, setLoadingResults] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState(null);
  const [combinedResults, setCombinedResults] = useState(null);
  const [loadingCombined, setLoadingCombined] = useState(false);
  const [viewMode, setViewMode] = useState('combined');
  const [selectedClassroom, setSelectedClassroom] = useState(null);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  useEffect(() => {
    if (isOpen && batchId) {
      fetchExams();
      resetState();
    }
  }, [isOpen, batchId]);

  const resetState = () => {
    setActiveTab('schedule');
    setScheduleView('list');
    setSelectedExam(null);
    setExamResults(null);
    setCombinedResults(null);
    setViewMode('combined');
    setSelectedClassroom(null);
  };

  const fetchExams = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/exams?batchId=${batchId}&sortBy=date&sortOrder=asc`
      );
      if (res.ok) {
        const data = await res.json();
        const allExams = data.exams || data || [];
        const groups = {};
        allExams.forEach((exam) => {
          const key = exam.name || exam.examType?.name || 'Unnamed Exam';
          if (!groups[key])
            groups[key] = {
              name: key,
              examType: exam.examType,
              academicYear: exam.academicYear,
              semester: exam.semester,
              exams: [],
            };
          groups[key].exams.push(exam);
        });
        setExams(Object.values(groups));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSingleExamResults = async (exam) => {
    setSelectedExam(exam);
    setActiveTab('results');
    setViewMode('exam');
    setLoadingResults(true);
    try {
      const res = await fetch(
        `/api/results?batchId=${batchId}&examId=${exam.id}&classroomId=${exam.classroomId}`
      );
      if (!res.ok) throw new Error('Failed to fetch results');
      const data = await res.json();
      const apiResults = data.results || [];
      const classroom = classrooms.find((c) => c.id === exam.classroomId);
      const enrolled =
        classroom?.enrolledStudents?.filter(
          (s) => s.enrollmentStatus === 'active'
        ) || [];
      const map = {};
      apiResults.forEach((r) => {
        const s = r.student || {};
        map[r.studentId] = {
          studentId: r.studentId,
          studentName: s.name || 'Unknown',
          rollNo: s.rollNo || '-',
          totalMarks: r.totalMarks,
          maxMarks: r.maxMarks || 100,
          percentage:
            r.totalMarks && r.maxMarks
              ? ((r.totalMarks / r.maxMarks) * 100).toFixed(2)
              : null,
          grade: r.grade || null,
          resultStatus: r.resultStatus || 'pending',
          isPassed: r.isPassed ?? null,
          isAbsent: r.isAbsent || false,
          hasResult: true,
        };
      });
      enrolled.forEach((s) => {
        if (!map[s.id])
          map[s.id] = {
            studentId: s.id,
            studentName: s.name || 'Unknown',
            rollNo: s.rollNo || '-',
            totalMarks: null,
            maxMarks: 100,
            percentage: null,
            grade: null,
            resultStatus: 'pending',
            isPassed: null,
            isAbsent: false,
            hasResult: false,
          };
      });
      const list = Object.values(map).sort((a, b) =>
        (a.studentName || '')
          .toLowerCase()
          .localeCompare((b.studentName || '').toLowerCase())
      );
      const wm = list.filter((s) => s.totalMarks !== null && !s.isAbsent);
      setExamResults({
        students: list,
        totalStudents: list.length,
        appeared: wm.length,
        absent: list.filter((s) => s.isAbsent).length,
        passed: list.filter((s) => s.isPassed === true).length,
        failed: list.filter((s) => s.isPassed === false).length,
        pending: list.filter((s) => s.totalMarks === null && !s.isAbsent)
          .length,
        avgPercentage:
          wm.filter((s) => s.percentage).length > 0
            ? (
                wm
                  .filter((s) => s.percentage)
                  .reduce((sum, s) => sum + parseFloat(s.percentage), 0) /
                wm.filter((s) => s.percentage).length
              ).toFixed(2)
            : null,
        classroomName: exam.classroom?.name || 'Unknown',
      });
    } catch (err) {
      setExamResults({ error: err.message, students: [] });
    } finally {
      setLoadingResults(false);
    }
  };

  const fetchResults = async (classroomId = 'all') => {
    setLoadingCombined(true);
    if (classroomId === 'all') {
      setViewMode('combined');
      setSelectedClassroom(null);
    } else {
      setViewMode('single');
      setSelectedClassroom(
        classrooms.find((c) => c.id.toString() === classroomId)
      );
    }
    try {
      let url = `/api/results?batchId=${batchId}`;
      if (classroomId !== 'all') url += `&classroomId=${classroomId}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch results');
      const data = await res.json();
      let allResults = data.results || [];
      const studentMap = {};
      if (classroomId !== 'all') {
        const cr = classrooms.find((c) => c.id.toString() === classroomId);
        if (cr)
          (cr.enrolledStudents || [])
            .filter((s) => s.enrollmentStatus === 'active')
            .forEach((s) => {
              if (!studentMap[s.id]) studentMap[s.id] = { ...s, results: {} };
            });
      } else {
        classrooms.forEach((cr) =>
          (cr.enrolledStudents || [])
            .filter((s) => s.enrollmentStatus === 'active')
            .forEach((s) => {
              if (!studentMap[s.id]) studentMap[s.id] = { ...s, results: {} };
            })
        );
      }
      allResults.forEach((r) => {
        if (r.student && !studentMap[r.studentId])
          studentMap[r.studentId] = { ...r.student, results: {} };
      });
      const subjectNames = [
        ...new Set(
          allResults.map(
            (r) =>
              r.classroom?.course?.name ||
              r.course?.name ||
              r.exam?.name ||
              'Unknown Subject'
          )
        ),
      ].sort();
      Object.values(studentMap).forEach((student) => {
        subjectNames.forEach((subject) => {
          const result = allResults.find(
            (r) =>
              r.studentId === student.id &&
              (r.classroom?.course?.name === subject ||
                r.course?.name === subject ||
                r.exam?.name === subject)
          );
          student.results[subject] = result || null;
        });
      });
      const rows = Object.values(studentMap)
        .map((student) => {
          const sm = {};
          let to = 0,
            tm = 0,
            pc = 0,
            fc = 0,
            ts = 0;
          subjectNames.forEach((subject) => {
            const r = student.results[subject];
            if (r) {
              sm[subject] = {
                obtained: r.totalMarks,
                max: r.maxMarks || 100,
                grade: r.grade,
                isPassed: r.isPassed,
                isAbsent: r.isAbsent,
                status: r.resultStatus,
              };
              ts++;
              if (r.totalMarks !== null && !r.isAbsent) {
                to += r.totalMarks || 0;
                tm += r.maxMarks || 100;
                if (r.isPassed === true) pc++;
                else if (r.isPassed === false) fc++;
              } else if (r.isAbsent) {
                tm += r.maxMarks || 100;
              }
            } else sm[subject] = null;
          });
          return {
            studentId: student.id,
            studentName: student.name || 'Unknown',
            rollNo: student.rollNo || '-',
            subjectMarks: sm,
            totalSubjects: ts,
            totalObtained: to,
            totalMax: tm,
            passedCount: pc,
            failedCount: fc,
            percentage: tm > 0 ? ((to / tm) * 100).toFixed(2) : null,
          };
        })
        .sort((a, b) =>
          (a.studentName || '')
            .toLowerCase()
            .localeCompare((b.studentName || '').toLowerCase())
        );
      const wm = rows.filter((s) => s.totalSubjects > 0);
      setCombinedResults({
        students: rows,
        subjectNames,
        totalStudents: rows.length,
        studentsWithResults: wm.length,
        overallPassed: rows.filter(
          (s) => s.failedCount === 0 && s.totalSubjects > 0
        ).length,
        overallFailed: rows.filter((s) => s.failedCount > 0).length,
        avgPercentage:
          wm.filter((s) => s.percentage).length > 0
            ? (
                wm
                  .filter((s) => s.percentage)
                  .reduce((sum, s) => sum + parseFloat(s.percentage), 0) /
                wm.filter((s) => s.percentage).length
              ).toFixed(2)
            : null,
        filterLabel:
          classroomId === 'all'
            ? 'All Classrooms'
            : classrooms.find((c) => c.id.toString() === classroomId)?.name ||
              'Unknown',
      });
      setActiveTab('results');
    } catch (err) {
      setCombinedResults({ error: err.message });
    } finally {
      setLoadingCombined(false);
    }
  };

  const allExamsFlat = useMemo(() => exams.flatMap((g) => g.exams), [exams]);
  const activeClassrooms = classrooms.filter(
    (c) => !c.status || c.status === 'active'
  );

  // ===== FULL TIME SLOTS =====
  const timeSlots = useMemo(() => {
    if (allExamsFlat.length === 0)
      return [
        { startMinutes: 420, endMinutes: 540, label: '07:00 - 09:00' },
        { startMinutes: 540, endMinutes: 660, label: '09:00 - 11:00' },
        { startMinutes: 660, endMinutes: 780, label: '11:00 - 13:00' },
        { startMinutes: 780, endMinutes: 900, label: '13:00 - 15:00' },
        { startMinutes: 900, endMinutes: 1020, label: '15:00 - 17:00' },
      ];
    const boundaries = new Set([420, 1020]);
    allExamsFlat.forEach((exam) => {
      if (exam.startTime)
        boundaries.add(
          new Date(exam.startTime).getHours() * 60 +
            new Date(exam.startTime).getMinutes()
        );
      if (exam.endTime)
        boundaries.add(
          new Date(exam.endTime).getHours() * 60 +
            new Date(exam.endTime).getMinutes()
        );
    });
    const sorted = Array.from(boundaries).sort((a, b) => a - b);
    const merged = [sorted[0]];
    for (let i = 1; i < sorted.length; i++)
      if (sorted[i] - merged[merged.length - 1] >= 30) merged.push(sorted[i]);
    const slots = [];
    for (let i = 0; i < merged.length - 1; i++) {
      if (merged[i + 1] - merged[i] >= 30) {
        const sh = Math.floor(merged[i] / 60),
          sm = merged[i] % 60,
          eh = Math.floor(merged[i + 1] / 60),
          em = merged[i + 1] % 60;
        slots.push({
          startMinutes: merged[i],
          endMinutes: merged[i + 1],
          label: `${String(sh).padStart(2, '0')}:${String(sm).padStart(
            2,
            '0'
          )} - ${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`,
        });
      }
    }
    return slots.length > 0
      ? slots
      : [
          { startMinutes: 420, endMinutes: 540, label: '07:00 - 09:00' },
          { startMinutes: 540, endMinutes: 660, label: '09:00 - 11:00' },
          { startMinutes: 660, endMinutes: 780, label: '11:00 - 13:00' },
          { startMinutes: 780, endMinutes: 900, label: '13:00 - 15:00' },
          { startMinutes: 900, endMinutes: 1020, label: '15:00 - 17:00' },
        ];
  }, [allExamsFlat]);

  // ===== FULL TIMETABLE DATA =====
  const timetableData = useMemo(() => {
    if (allExamsFlat.length === 0 || timeSlots.length === 0)
      return { dates: [], timeSlots: [], grid: {}, rowspans: {} };
    const dates = [
      ...new Set(
        allExamsFlat
          .map((e) => {
            const d = new Date(e.date);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
              2,
              '0'
            )}-${String(d.getDate()).padStart(2, '0')}`;
          })
          .filter(Boolean)
      ),
    ].sort((a, b) => new Date(a) - new Date(b));
    const grid = {},
      rowspans = {};
    dates.forEach((date) => {
      grid[date] = {};
      rowspans[date] = {};
      timeSlots.forEach((s, i) => {
        grid[date][i] = [];
        rowspans[date][i] = 1;
      });
    });
    allExamsFlat.forEach((exam) => {
      const d = new Date(exam.date);
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        '0'
      )}-${String(d.getDate()).padStart(2, '0')}`;
      if (!grid[dateKey]) return;
      const startMins = exam.startTime
        ? new Date(exam.startTime).getHours() * 60 +
          new Date(exam.startTime).getMinutes()
        : 0;
      const endMins = exam.endTime
        ? new Date(exam.endTime).getHours() * 60 +
          new Date(exam.endTime).getMinutes()
        : 0;
      let si = -1,
        ei = -1;
      timeSlots.forEach((s, i) => {
        if (startMins >= s.startMinutes && startMins < s.endMinutes) si = i;
        if (endMins > s.startMinutes && endMins <= s.endMinutes) ei = i;
      });
      if (si !== -1 && ei !== -1) {
        const span = ei - si + 1;
        for (let i = si + 1; i <= ei; i++) rowspans[dateKey][i] = 0;
        rowspans[dateKey][si] = span;
        grid[dateKey][si].push({ ...exam, rowSpan: span });
      } else
        timeSlots.forEach((s, i) => {
          if (startMins < s.endMinutes && endMins > s.startMinutes)
            grid[dateKey][i].push(exam);
        });
    });
    return { dates, timeSlots, grid, rowspans };
  }, [allExamsFlat, timeSlots]);

  // ===== FULL EXAM STATUS =====
  const getExamStatus = (exam) => {
    if (!exam) return null;
    if (exam.status === 'result_published') return 'result_published';
    if (exam.status === 'cancelled') return 'cancelled';
    const now = new Date(),
      ed = new Date(exam.date),
      ee = exam.endTime ? new Date(exam.endTime) : null;
    if (ed < now && ee && now > ee) return 'completed';
    if (ed.toDateString() === now.toDateString()) {
      if (ee && now > ee) return 'completed';
      return 'ongoing';
    }
    return 'scheduled';
  };

  const S = {
    scheduled: {
      bg: 'bg-yellow-100',
      text: 'text-yellow-800',
      border: 'border-yellow-300',
      dot: 'bg-yellow-500',
      label: 'Scheduled',
      lightBg: 'bg-yellow-50',
    },
    ongoing: {
      bg: 'bg-blue-100',
      text: 'text-blue-800',
      border: 'border-blue-300',
      dot: 'bg-blue-500 animate-pulse',
      label: 'Ongoing',
      lightBg: 'bg-blue-50',
    },
    completed: {
      bg: 'bg-green-100',
      text: 'text-green-800',
      border: 'border-green-300',
      dot: 'bg-green-500',
      label: 'Completed',
      lightBg: 'bg-green-50',
    },
    cancelled: {
      bg: 'bg-red-100',
      text: 'text-red-800',
      border: 'border-red-300',
      dot: 'bg-red-500',
      label: 'Cancelled',
      lightBg: 'bg-red-50',
    },
    result_published: {
      bg: 'bg-purple-100',
      text: 'text-purple-800',
      border: 'border-purple-300',
      dot: 'bg-purple-500',
      label: 'Published',
      lightBg: 'bg-purple-50',
    },
  };
  const RS = {
    pending: { bg: 'bg-gray-100', text: 'text-gray-800' },
    draft: { bg: 'bg-blue-100', text: 'text-blue-800' },
    verified: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
    published: { bg: 'bg-green-100', text: 'text-green-800' },
    re_evaluation: { bg: 'bg-orange-100', text: 'text-orange-800' },
    final: { bg: 'bg-purple-100', text: 'text-purple-800' },
  };
  const getGradeColor = (g) => {
    if (!g) return 'bg-gray-100 text-gray-800';
    const u = g.toUpperCase();
    if (['A+', 'A'].includes(u)) return 'bg-green-100 text-green-800';
    if (['B+', 'B'].includes(u)) return 'bg-blue-100 text-blue-800';
    if (['C+', 'C'].includes(u)) return 'bg-yellow-100 text-yellow-800';
    if (['D'].includes(u)) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };
  const fd = (d) =>
    d
      ? new Date(d).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : '-';
  const fds = (d) =>
    d
      ? new Date(d).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        })
      : '-';
  const ft = (t) =>
    t
      ? new Date(t).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })
      : '--:--';
  const gdn = (d) =>
    d ? new Date(d).toLocaleDateString('en-US', { weekday: 'short' }) : '';

  if (!isOpen) return null;
  const totalExams = exams.reduce((sum, g) => sum + g.exams.length, 0);
  const showCombinedView =
    activeTab === 'results' &&
    combinedResults &&
    (viewMode === 'combined' || viewMode === 'single');
  const showExamView =
    activeTab === 'results' &&
    viewMode === 'exam' &&
    selectedExam &&
    examResults;
  const resultData = combinedResults;
  const resultLabel =
    viewMode === 'combined'
      ? 'All Classrooms'
      : viewMode === 'single'
      ? selectedClassroom?.name || 'Classroom'
      : '';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-2xl w-full max-w-[95vw] shadow-2xl flex flex-col"
            style={{ height: '90vh', maxHeight: '90vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex-shrink-0 bg-white border-b px-6 py-4 flex justify-between items-center z-10 rounded-t-2xl">
              <div>
                <h2 className="text-xl font-bold text-gray-800">
                  Batch Results & Schedule
                </h2>
                <p className="text-sm text-gray-500">
                  {batchName} • {totalExams} exams • {activeClassrooms.length}{' '}
                  classrooms
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => {
                      setActiveTab('schedule');
                      setSelectedExam(null);
                      setExamResults(null);
                    }}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      activeTab === 'schedule'
                        ? 'bg-white text-gray-800 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Schedule
                  </button>
                  <button
                    onClick={() => {
                      if (!combinedResults) fetchResults('all');
                      else setActiveTab('results');
                    }}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      activeTab === 'results'
                        ? 'bg-white text-gray-800 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Results
                  </button>
                </div>
                {activeTab === 'results' && (
                  <div className="flex items-center gap-2">
                    <div className="flex bg-gray-100 rounded-lg p-1">
                      <button
                        onClick={() => fetchResults('all')}
                        className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors flex items-center gap-1 ${
                          viewMode === 'combined'
                            ? 'bg-white text-gray-800 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        <Icons.Layers size={11} /> All
                      </button>
                      <button
                        onClick={() => {
                          if (!selectedClassroom)
                            fetchResults(
                              activeClassrooms[0]?.id?.toString() || 'all'
                            );
                          else fetchResults(selectedClassroom.id.toString());
                        }}
                        className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors flex items-center gap-1 ${
                          viewMode === 'single'
                            ? 'bg-white text-gray-800 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        <Icons.DoorOpen size={11} /> Classroom
                      </button>
                    </div>
                    {viewMode === 'single' && (
                      <div className="relative">
                        <button
                          onClick={() =>
                            setShowFilterDropdown(!showFilterDropdown)
                          }
                          className="px-3 py-1.5 text-xs bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium flex items-center gap-1 shadow-sm"
                        >
                          <Icons.Filter size={11} />
                          {selectedClassroom?.name || 'Select'}{' '}
                          <Icons.ChevronDown size={10} />
                        </button>
                        {showFilterDropdown && (
                          <div className="absolute top-full mt-1 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[200px] py-1 max-h-[200px] overflow-y-auto">
                            {activeClassrooms.map((c) => (
                              <button
                                key={c.id}
                                onClick={() => {
                                  fetchResults(c.id.toString());
                                  setShowFilterDropdown(false);
                                }}
                                className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 flex items-center gap-2 ${
                                  selectedClassroom?.id === c.id
                                    ? 'bg-indigo-50 text-indigo-700 font-medium'
                                    : 'text-gray-700'
                                }`}
                              >
                                <Icons.DoorOpen size={11} />
                                {c.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <Icons.X size={20} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {loading ? (
                <div className="flex items-center justify-center h-full gap-3">
                  <Icons.Loader2
                    size={48}
                    className="animate-spin text-indigo-600"
                  />
                  <p className="text-gray-500">Loading...</p>
                </div>
              ) : activeTab === 'schedule' ? (
                allExamsFlat.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full">
                    <Icons.FileText size={48} className="text-gray-300 mb-3" />
                    <p className="text-gray-500">No exams scheduled.</p>
                  </div>
                ) : (
                  <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between mb-4 flex-shrink-0">
                      <div className="flex bg-gray-100 rounded-lg p-1">
                        <button
                          onClick={() => setScheduleView('list')}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                            scheduleView === 'list'
                              ? 'bg-white text-gray-800 shadow-sm'
                              : 'text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          <Icons.List size={14} /> List
                        </button>
                        <button
                          onClick={() => setScheduleView('matrix')}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                            scheduleView === 'matrix'
                              ? 'bg-white text-gray-800 shadow-sm'
                              : 'text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          <Icons.Grid3x3 size={14} /> Timetable
                        </button>
                      </div>
                      <span className="text-xs text-gray-500">
                        {timetableData.dates.length} days •{' '}
                        {timetableData.timeSlots.length} slots
                      </span>
                    </div>

                    {/* LIST VIEW */}
                    {scheduleView === 'list' ? (
                      <div className="flex-1 overflow-y-auto space-y-3">
                        {exams.map((group, gi) => (
                          <div
                            key={gi}
                            className="border border-gray-200 rounded-xl overflow-hidden"
                          >
                            <button
                              onClick={() =>
                                setExpandedGroup(
                                  expandedGroup === gi ? null : gi
                                )
                              }
                              className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-pink-500 rounded-lg flex items-center justify-center">
                                  <Icons.BookOpen
                                    size={18}
                                    className="text-white"
                                  />
                                </div>
                                <div className="text-left">
                                  <h3 className="font-semibold text-gray-900">
                                    {group.name}
                                  </h3>
                                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                                    {group.semester && (
                                      <span>{group.semester}</span>
                                    )}
                                    {group.academicYear && (
                                      <span>{group.academicYear}</span>
                                    )}
                                    <span>
                                      ({group.exams.length} exam
                                      {group.exams.length !== 1 ? 's' : ''})
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <Icons.ChevronRight
                                size={18}
                                className={`text-gray-400 transition-transform ${
                                  expandedGroup === gi ? 'rotate-90' : ''
                                }`}
                              />
                            </button>
                            <AnimatePresence>
                              {expandedGroup === gi && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="overflow-hidden"
                                >
                                  <div className="divide-y divide-gray-100">
                                    {group.exams
                                      .sort(
                                        (a, b) =>
                                          new Date(a.date) - new Date(b.date)
                                      )
                                      .map((exam) => {
                                        const status = getExamStatus(exam),
                                          cfg = S[status];
                                        return (
                                          <div
                                            key={exam.id}
                                            className="p-4 hover:bg-gray-50 flex items-center justify-between"
                                          >
                                            <div className="flex items-center gap-4">
                                              <div className="flex flex-col items-center min-w-[40px]">
                                                <span className="text-lg font-bold text-gray-800">
                                                  {new Date(
                                                    exam.date
                                                  ).getDate()}
                                                </span>
                                                <span className="text-xs text-gray-500">
                                                  {new Date(
                                                    exam.date
                                                  ).toLocaleDateString(
                                                    'en-US',
                                                    { month: 'short' }
                                                  )}
                                                </span>
                                              </div>
                                              <div>
                                                <div className="flex items-center gap-2">
                                                  <span
                                                    className={`w-2 h-2 rounded-full ${cfg.dot}`}
                                                  />
                                                  <span className="font-medium text-gray-900">
                                                    {exam.classroom?.name ||
                                                      'Unknown'}
                                                  </span>
                                                  <span
                                                    className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${cfg.bg} ${cfg.text}`}
                                                  >
                                                    {cfg.label}
                                                  </span>
                                                  {exam.examCategory && (
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-gray-100 text-gray-600 capitalize">
                                                      {exam.examCategory}
                                                    </span>
                                                  )}
                                                </div>
                                                <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                                                  <span className="flex items-center gap-1">
                                                    <Icons.Clock size={12} />
                                                    {ft(exam.startTime)} -{' '}
                                                    {ft(exam.endTime)}
                                                  </span>
                                                  {exam.classroom?.course
                                                    ?.name && (
                                                    <span className="flex items-center gap-1">
                                                      <Icons.BookOpen
                                                        size={12}
                                                      />
                                                      {
                                                        exam.classroom.course
                                                          .name
                                                      }
                                                    </span>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                            <button
                                              onClick={() =>
                                                fetchSingleExamResults(exam)
                                              }
                                              className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium flex items-center gap-1"
                                            >
                                              <Icons.Eye size={12} /> View
                                              Results
                                            </button>
                                          </div>
                                        );
                                      })}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        ))}
                      </div>
                    ) : (
                      /* TIMETABLE VIEW */
                      <div className="flex-1 flex flex-col min-h-0">
                        <div className="flex-1 overflow-auto border border-gray-200 rounded-xl">
                          <table className="w-full border-collapse min-w-max">
                            <thead className="sticky top-0 z-10">
                              <tr>
                                <th className="sticky left-0 z-20 bg-gradient-to-r from-indigo-600 to-purple-600 p-3 border-b border-indigo-400 text-left min-w-[120px]">
                                  <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                                    <Icons.Clock size={12} /> Time
                                  </span>
                                </th>
                                {timetableData.dates.map((date) => (
                                  <th
                                    key={date}
                                    className="bg-gradient-to-b from-indigo-600 to-purple-600 p-2 border-b border-indigo-400 text-center min-w-[160px]"
                                  >
                                    <div className="text-xs font-bold text-white">
                                      {gdn(date)}
                                    </div>
                                    <div className="text-[10px] text-indigo-200">
                                      {fds(date)}
                                    </div>
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {timetableData.timeSlots.map((slot, slotIdx) => (
                                <tr key={slotIdx}>
                                  <td className="sticky left-0 z-10 bg-indigo-50 p-3 border-b border-r border-gray-200 text-xs font-semibold text-indigo-700">
                                    <div className="flex items-center gap-1.5">
                                      <Icons.Clock
                                        size={11}
                                        className="text-indigo-400"
                                      />
                                      {slot.label}
                                    </div>
                                  </td>
                                  {timetableData.dates.map((date) => {
                                    const rs =
                                      timetableData.rowspans?.[date]?.[
                                        slotIdx
                                      ] ?? 1;
                                    if (rs === 0) return null;
                                    const examsInSlot =
                                      timetableData.grid[date]?.[slotIdx] || [];
                                    return (
                                      <td
                                        key={`${date}-${slotIdx}`}
                                        className="p-1 border-b border-r border-gray-200 align-top min-w-[160px]"
                                        rowSpan={rs > 1 ? rs : undefined}
                                      >
                                        {examsInSlot.length > 0 ? (
                                          <div className="space-y-1">
                                            {examsInSlot.map((exam) => {
                                              const status =
                                                  getExamStatus(exam),
                                                cfg = S[status];
                                              return (
                                                <div
                                                  key={exam.id}
                                                  className={`p-2 rounded-lg border ${
                                                    cfg?.border ||
                                                    'border-gray-200'
                                                  } ${
                                                    cfg?.lightBg || 'bg-white'
                                                  } hover:shadow-md`}
                                                  style={
                                                    exam.rowSpan > 1
                                                      ? {
                                                          minHeight: `${
                                                            exam.rowSpan * 60 +
                                                            (exam.rowSpan - 1) *
                                                              8
                                                          }px`,
                                                        }
                                                      : {}
                                                  }
                                                >
                                                  <div className="flex items-center gap-1.5 mb-1">
                                                    <span
                                                      className={`w-2 h-2 rounded-full ${
                                                        cfg?.dot ||
                                                        'bg-gray-400'
                                                      }`}
                                                    />
                                                    <span className="text-xs font-semibold text-gray-800 truncate">
                                                      {exam.classroom?.name ||
                                                        'Room'}
                                                    </span>
                                                  </div>
                                                  <p className="text-[11px] text-gray-600 truncate">
                                                    {exam.examType?.name ||
                                                      'Exam'}
                                                    :{' '}
                                                    {exam.classroom?.course
                                                      ?.name || ''}
                                                  </p>
                                                  <div className="flex items-center gap-1 text-[10px] text-gray-400 mt-1">
                                                    <Icons.Clock size={10} />
                                                    {ft(exam.startTime)} -{' '}
                                                    {ft(exam.endTime)}
                                                  </div>
                                                  <div className="mt-1.5 flex items-center gap-1 flex-wrap">
                                                    <span
                                                      className={`px-1.5 py-0.5 rounded-full text-[9px] font-medium ${cfg?.bg} ${cfg?.text}`}
                                                    >
                                                      {cfg?.label}
                                                    </span>
                                                    {exam.examCategory && (
                                                      <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-gray-100 text-gray-500 capitalize">
                                                        {exam.examCategory}
                                                      </span>
                                                    )}
                                                  </div>
                                                  <button
                                                    onClick={() =>
                                                      fetchSingleExamResults(
                                                        exam
                                                      )
                                                    }
                                                    className="mt-2 w-full px-2 py-1 text-[10px] bg-indigo-500 text-white rounded hover:bg-indigo-600 font-medium"
                                                  >
                                                    View Results
                                                  </button>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        ) : (
                                          <div className="h-full min-h-[60px] flex items-center justify-center text-gray-300 text-xs">
                                            ·
                                          </div>
                                        )}
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div className="flex-shrink-0 px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center gap-4 flex-wrap rounded-b-xl">
                          <span className="text-xs text-gray-500 font-medium">
                            Legend:
                          </span>
                          {Object.entries(S).map(([k, c]) => (
                            <div key={k} className="flex items-center gap-1.5">
                              <span
                                className={`w-2.5 h-2.5 rounded-full ${c.dot}`}
                              />
                              <span className="text-xs text-gray-600">
                                {c.label}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              ) : showExamView ? (
                /* SINGLE EXAM RESULTS - kept compact for space, full version in previous response */
                <div className="flex flex-col h-full">
                  {loadingResults ? (
                    <div className="flex items-center justify-center flex-1">
                      <Icons.Loader2
                        size={48}
                        className="animate-spin text-indigo-600"
                      />
                    </div>
                  ) : examResults?.error ? (
                    <div className="flex items-center justify-center flex-1">
                      <p className="text-red-500">{examResults.error}</p>
                    </div>
                  ) : examResults?.students ? (
                    <div className="flex flex-col flex-1 min-h-0">
                      <div className="flex items-center justify-between mb-4">
                        <button
                          onClick={() => {
                            setViewMode('combined');
                            setSelectedExam(null);
                            setExamResults(null);
                            if (!combinedResults) fetchResults('all');
                          }}
                          className="px-3 py-1.5 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg"
                        >
                          <Icons.ArrowLeft size={14} /> Back
                        </button>
                        <span className="px-3 py-1.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                          {examResults.classroomName}
                        </span>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4 mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-pink-500 rounded-lg flex items-center justify-center">
                            <Icons.FileText size={16} className="text-white" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {selectedExam?.name || 'Exam'} Results
                            </h3>
                            <p className="text-sm text-gray-500">
                              {selectedExam?.classroom?.name} •{' '}
                              {fd(selectedExam?.date)}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-4">
                        {[
                          {
                            l: 'Total',
                            v: examResults.totalStudents,
                            c: 'bg-blue-50 text-blue-700',
                          },
                          {
                            l: 'Appeared',
                            v: examResults.appeared,
                            c: 'bg-green-50 text-green-700',
                          },
                          {
                            l: 'Absent',
                            v: examResults.absent,
                            c: 'bg-red-50 text-red-700',
                          },
                          {
                            l: 'Pending',
                            v: examResults.pending,
                            c: 'bg-yellow-50 text-yellow-700',
                          },
                          {
                            l: 'Passed',
                            v: examResults.passed,
                            c: 'bg-green-50 text-green-700',
                          },
                          {
                            l: 'Failed',
                            v: examResults.failed,
                            c: 'bg-red-50 text-red-700',
                          },
                          {
                            l: 'Avg %',
                            v: examResults.avgPercentage
                              ? examResults.avgPercentage + '%'
                              : '-',
                            c: 'bg-purple-50 text-purple-700',
                          },
                        ].map((s, i) => (
                          <div
                            key={i}
                            className={`${
                              s.c.split(' ')[0]
                            } rounded-lg p-3 text-center`}
                          >
                            <p className="text-xs text-gray-500">{s.l}</p>
                            <p
                              className={`text-lg font-bold ${
                                s.c.split(' ')[1]
                              }`}
                            >
                              {s.v}
                            </p>
                          </div>
                        ))}
                      </div>
                      <div className="flex-1 overflow-auto border border-gray-200 rounded-lg">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 sticky top-0">
                            <tr>
                              <th className="text-left py-2.5 px-3 font-semibold border-b">
                                Roll No
                              </th>
                              <th className="text-left py-2.5 px-3 font-semibold border-b">
                                Name
                              </th>
                              <th className="text-center py-2.5 px-3 font-semibold border-b">
                                Total
                              </th>
                              <th className="text-center py-2.5 px-3 font-semibold border-b">
                                %
                              </th>
                              <th className="text-center py-2.5 px-3 font-semibold border-b">
                                Grade
                              </th>
                              <th className="text-center py-2.5 px-3 font-semibold border-b">
                                Status
                              </th>
                              <th className="text-center py-2.5 px-3 font-semibold border-b">
                                Result
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {examResults.students.map((s, i) => (
                              <tr
                                key={s.studentId}
                                className={`border-b hover:bg-gray-50 ${
                                  i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                                } ${
                                  !s.hasResult && s.totalMarks === null
                                    ? 'opacity-60'
                                    : ''
                                }`}
                              >
                                <td className="py-2 px-3 font-mono text-xs">
                                  {s.rollNo || '-'}
                                </td>
                                <td className="py-2 px-3 font-medium">
                                  {s.studentName}
                                </td>
                                <td className="py-2 px-3 text-center font-bold">
                                  {s.totalMarks !== null ? (
                                    <span
                                      className={
                                        s.isPassed
                                          ? 'text-green-600'
                                          : s.isPassed === false
                                          ? 'text-red-600'
                                          : 'text-gray-600'
                                      }
                                    >
                                      {s.totalMarks}/{s.maxMarks}
                                    </span>
                                  ) : s.isAbsent ? (
                                    <span className="text-red-500">Absent</span>
                                  ) : (
                                    '-'
                                  )}
                                </td>
                                <td className="py-2 px-3 text-center font-bold">
                                  {s.percentage !== null ? (
                                    <span
                                      className={
                                        parseFloat(s.percentage) >= 60
                                          ? 'text-green-600'
                                          : parseFloat(s.percentage) >= 40
                                          ? 'text-yellow-600'
                                          : 'text-red-600'
                                      }
                                    >
                                      {s.percentage}%
                                    </span>
                                  ) : s.isAbsent ? (
                                    <span className="text-red-500">Abs</span>
                                  ) : (
                                    '-'
                                  )}
                                </td>
                                <td className="py-2 px-3 text-center">
                                  {s.grade ? (
                                    <span
                                      className={`px-1.5 py-0.5 rounded text-xs font-medium ${getGradeColor(
                                        s.grade
                                      )}`}
                                    >
                                      {s.grade}
                                    </span>
                                  ) : s.isAbsent ? (
                                    <span className="px-1.5 py-0.5 rounded text-xs bg-red-100 text-red-800">
                                      Abs
                                    </span>
                                  ) : (
                                    '-'
                                  )}
                                </td>
                                <td className="py-2 px-3 text-center">
                                  {s.isAbsent ? (
                                    <span className="px-1.5 py-0.5 rounded text-xs bg-red-100 text-red-800">
                                      Absent
                                    </span>
                                  ) : s.isPassed === true ? (
                                    <span className="px-1.5 py-0.5 rounded text-xs bg-green-100 text-green-800">
                                      Pass
                                    </span>
                                  ) : s.isPassed === false ? (
                                    <span className="px-1.5 py-0.5 rounded text-xs bg-red-100 text-red-800">
                                      Fail
                                    </span>
                                  ) : (
                                    <span className="px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-600">
                                      Pending
                                    </span>
                                  )}
                                </td>
                                <td className="py-2 px-3 text-center">
                                  {s.resultStatus && RS[s.resultStatus] ? (
                                    <span
                                      className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                                        RS[s.resultStatus].bg
                                      } ${RS[s.resultStatus].text}`}
                                    >
                                      {s.resultStatus}
                                    </span>
                                  ) : (
                                    '-'
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : showCombinedView ? (
                /* COMBINED/SINGLE RESULTS */
                <div className="flex flex-col h-full">
                  {loadingCombined ? (
                    <div className="flex items-center justify-center flex-1">
                      <Icons.Loader2
                        size={48}
                        className="animate-spin text-purple-600"
                      />
                    </div>
                  ) : resultData?.error ? (
                    <div className="flex items-center justify-center flex-1">
                      <p className="text-red-500">{resultData.error}</p>
                    </div>
                  ) : resultData?.students ? (
                    <div className="flex flex-col flex-1 min-h-0">
                      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 mb-4 flex-shrink-0 border border-purple-200">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                            <Icons.Layers size={18} className="text-white" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {viewMode === 'combined'
                                ? 'Combined Batch Results'
                                : 'Classroom Results'}
                            </h3>
                            <p className="text-sm text-gray-500">
                              {resultLabel} • {resultData.subjectNames.length}{' '}
                              Subjects
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                          {[
                            {
                              l: 'Total Students',
                              v: resultData.totalStudents,
                              c: 'bg-blue-50 text-blue-700',
                            },
                            {
                              l: 'With Results',
                              v: resultData.studentsWithResults,
                              c: 'bg-indigo-50 text-indigo-700',
                            },
                            {
                              l: 'Overall Passed',
                              v: resultData.overallPassed,
                              c: 'bg-green-50 text-green-700',
                            },
                            {
                              l: 'Overall Failed',
                              v: resultData.overallFailed,
                              c: 'bg-red-50 text-red-700',
                            },
                            {
                              l: 'Avg %',
                              v: resultData.avgPercentage
                                ? resultData.avgPercentage + '%'
                                : '-',
                              c: 'bg-purple-50 text-purple-700',
                            },
                            {
                              l: 'Subjects',
                              v: resultData.subjectNames.length,
                              c: 'bg-amber-50 text-amber-700',
                            },
                          ].map((s, i) => (
                            <div
                              key={i}
                              className={`${
                                s.c.split(' ')[0]
                              } rounded-lg p-3 text-center`}
                            >
                              <p className="text-xs text-gray-500">{s.l}</p>
                              <p
                                className={`text-lg font-bold ${
                                  s.c.split(' ')[1]
                                }`}
                              >
                                {s.v}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex-1 overflow-auto border border-gray-200 rounded-lg">
                        <table className="w-full text-xs border-collapse min-w-max">
                          <thead className="bg-gray-50 sticky top-0 z-10">
                            <tr>
                              <th className="sticky left-0 z-20 bg-gray-50 text-left py-2.5 px-3 font-semibold border-b border-r min-w-[80px]">
                                Roll No
                              </th>
                              <th className="sticky left-[80px] z-20 bg-gray-50 text-left py-2.5 px-3 font-semibold border-b border-r min-w-[140px]">
                                Name
                              </th>
                              {resultData.subjectNames.map((subject) => (
                                <th
                                  key={subject}
                                  className="text-center py-2.5 px-2 font-semibold border-b border-r min-w-[90px]"
                                >
                                  <div
                                    className="text-[10px] text-gray-600 truncate max-w-[80px]"
                                    title={subject}
                                  >
                                    {subject}
                                  </div>
                                </th>
                              ))}
                              <th className="text-center py-2.5 px-3 font-semibold border-b border-r bg-blue-50 min-w-[70px]">
                                Total
                              </th>
                              <th className="text-center py-2.5 px-3 font-semibold border-b border-r bg-green-50 min-w-[55px]">
                                %
                              </th>
                              <th className="text-center py-2.5 px-3 font-semibold border-b min-w-[70px]">
                                Status
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {resultData.students.map((student, idx) => (
                              <tr
                                key={student.studentId}
                                className={`border-b hover:bg-gray-50 ${
                                  idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                                }`}
                              >
                                <td className="sticky left-0 bg-inherit py-2 px-3 font-mono text-[11px] border-r">
                                  {student.rollNo}
                                </td>
                                <td className="sticky left-[80px] bg-inherit py-2 px-3 font-medium text-[11px] border-r">
                                  {student.studentName}
                                </td>
                                {resultData.subjectNames.map((subject) => {
                                  const mark = student.subjectMarks[subject];
                                  return (
                                    <td
                                      key={subject}
                                      className="py-1.5 px-1 text-center border-r"
                                    >
                                      {mark ? (
                                        mark.isAbsent ? (
                                          <span className="text-red-500 font-medium text-[10px]">
                                            Absent
                                          </span>
                                        ) : mark.obtained !== null &&
                                          mark.obtained !== undefined ? (
                                          <div>
                                            <span
                                              className={`font-bold text-[11px] ${
                                                mark.isPassed === true
                                                  ? 'text-green-600'
                                                  : mark.isPassed === false
                                                  ? 'text-red-600'
                                                  : 'text-gray-700'
                                              }`}
                                            >
                                              {mark.obtained}/{mark.max}
                                            </span>
                                            {mark.grade && (
                                              <span
                                                className={`ml-1 px-1 py-0.5 rounded text-[9px] font-medium ${getGradeColor(
                                                  mark.grade
                                                )}`}
                                              >
                                                {mark.grade}
                                              </span>
                                            )}
                                          </div>
                                        ) : (
                                          <span className="text-gray-400 text-[10px]">
                                            Pending
                                          </span>
                                        )
                                      ) : (
                                        <span className="text-gray-300">-</span>
                                      )}
                                    </td>
                                  );
                                })}
                                <td className="py-2 px-3 text-center font-bold text-[11px] bg-blue-50/50 border-r">
                                  {student.totalSubjects > 0
                                    ? `${student.totalObtained}/${student.totalMax}`
                                    : '-'}
                                </td>
                                <td className="py-2 px-3 text-center font-bold text-[11px] bg-green-50/50 border-r">
                                  {student.percentage !== null ? (
                                    <span
                                      className={
                                        parseFloat(student.percentage) >= 60
                                          ? 'text-green-600'
                                          : parseFloat(student.percentage) >= 40
                                          ? 'text-yellow-600'
                                          : 'text-red-600'
                                      }
                                    >
                                      {student.percentage}%
                                    </span>
                                  ) : (
                                    '-'
                                  )}
                                </td>
                                <td className="py-2 px-3 text-center">
                                  {student.totalSubjects > 0 ? (
                                    student.failedCount === 0 ? (
                                      <span className="px-2 py-1 rounded-full text-[10px] font-medium bg-green-100 text-green-800">
                                        PASS
                                      </span>
                                    ) : (
                                      <span className="px-2 py-1 rounded-full text-[10px] font-medium bg-red-100 text-red-800">
                                        FAIL
                                      </span>
                                    )
                                  ) : (
                                    <span className="px-2 py-1 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600">
                                      N/A
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center flex-1">
                  <Icons.BarChart3 size={48} className="text-gray-300 mb-3" />
                  <p className="text-gray-500">
                    Click Results tab to load results
                  </p>
                  <button
                    onClick={() => fetchResults('all')}
                    className="mt-4 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg text-sm font-medium shadow-sm"
                  >
                    <Icons.Download size={16} className="inline mr-1.5" /> Load
                    Results
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ==================== BATCH ACCORDION ====================
const BatchAccordion = ({
  batch,
  classrooms,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
  onOpenCalendar,
  onOpenRoutine,
  onOpenBatchReport,
  hasUpdatePermission,
  hasDeletePermission,
  studentCount,
  showArchived,
  onToggleArchive,
}) => {
  const activeClassrooms = classrooms.filter(
    (c) => !c.status || c.status === 'active'
  );
  const archivedClassrooms = classrooms.filter((c) => c.status === 'archived');
  const displayClassrooms = showArchived ? classrooms : activeClassrooms;
  const totalSessions = classrooms.reduce(
    (sum, c) => sum + (c._count?.sessions || 0),
    0
  );
  const allClassroomsArchived =
    classrooms.length > 0 && activeClassrooms.length === 0;
  const effectiveStatus = allClassroomsArchived
    ? 'inactive'
    : batch.status || 'active';

  const [showExamModal, setShowExamModal] = useState(false);

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
      {/* Batch Header */}
      <div
        onClick={onToggle}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle();
          }
        }}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-4">
          <motion.div
            animate={{ rotate: isExpanded ? 90 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <Icons.ChevronRight size={20} className="text-gray-500" />
          </motion.div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">{batch.name}</h3>
            <p className="text-sm text-gray-500">
              {batch.department?.name} • {batch.academicYear || 'N/A'}
              {allClassroomsArchived &&
                activeClassrooms.length === 0 &&
                classrooms.length > 0 && (
                  <span className="text-red-500 ml-2">
                    (All classrooms inactive)
                  </span>
                )}
            </p>
          </div>
        </div>
        <div
          className="flex items-center gap-3"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {activeClassrooms.length} Active
          </span>
          {archivedClassrooms.length > 0 && (
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-600">
              {archivedClassrooms.length} Inactive
            </span>
          )}
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            {studentCount} Student{studentCount !== 1 ? 's' : ''}
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
            {totalSessions} Session{totalSessions !== 1 ? 's' : ''}
          </span>

          {/* EXAM SCHEDULE BUTTON */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowExamModal(true);
            }}
            className="cursor-pointer px-3 py-1.5 text-xs bg-gradient-to-r from-orange-400 to-pink-500 text-white rounded-lg hover:from-orange-500 hover:to-pink-600 flex items-center gap-1.5 transition-all shadow-sm"
            title="View Exam Schedule"
          >
            <Icons.FileText size={14} /> Exams
          </button>

          {archivedClassrooms.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleArchive();
              }}
              className={`px-3 py-1.5 text-xs rounded-lg flex items-center gap-1.5 transition-colors ${
                showArchived
                  ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Icons.EyeOff size={14} />
              {showArchived
                ? 'Hide Inactive'
                : `Inactive (${archivedClassrooms.length})`}
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenBatchReport(batch.id, batch.name);
            }}
            className="cursor-pointer px-3 py-1.5 text-xs bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 flex items-center gap-1.5 transition-colors"
            title="View Batch Attendance Report"
          >
            <Icons.BarChart3 size={14} /> Report
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenCalendar(null, batch.id);
            }}
            className="cursor-pointer px-3 py-1.5 text-xs bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 flex items-center gap-1.5 transition-colors"
            title="Open Batch Calendar"
          >
            <Icons.CalendarDays size={14} /> Calendar
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenRoutine(null, batch.id);
            }}
            className="cursor-pointer px-3 py-1.5 text-xs bg-green-100 text-green-700 rounded-lg hover:bg-green-200 flex items-center gap-1.5 transition-colors"
            title="Open Batch Routine"
          >
            <Clock size={14} /> Routine
          </button>
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${
              effectiveStatus === 'active'
                ? 'bg-green-100 text-green-800'
                : effectiveStatus === 'completed'
                ? 'bg-gray-100 text-gray-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {effectiveStatus}
          </span>
        </div>
      </div>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            {/* Classroom Table */}
            <div className="border-t border-gray-200">
              {!showArchived && archivedClassrooms.length > 0 && (
                <div className="px-4 py-2 bg-gray-50 border-b flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    {archivedClassrooms.length} inactive classroom
                    {archivedClassrooms.length !== 1 ? 's' : ''} hidden.
                  </span>
                  <button
                    onClick={onToggleArchive}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Show inactive
                  </button>
                </div>
              )}
              {showArchived && archivedClassrooms.length > 0 && (
                <div className="px-4 py-2 bg-blue-50 border-b flex items-center justify-between">
                  <span className="text-xs text-blue-600">
                    Showing all {classrooms.length} classrooms.
                  </span>
                  <button
                    onClick={onToggleArchive}
                    className="text-xs text-gray-600 hover:text-gray-800 font-medium"
                  >
                    Hide inactive
                  </button>
                </div>
              )}
              {displayClassrooms.length === 0 ? (
                <div className="text-center py-12">
                  <Icons.BookOpen
                    size={48}
                    className="text-gray-300 mx-auto mb-3"
                  />
                  <p className="text-gray-500">No classrooms to display</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                          Classroom
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                          Course
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                          Faculty
                        </th>
                        <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600">
                          Students
                        </th>
                        <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600">
                          Sessions
                        </th>
                        <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600">
                          Status
                        </th>
                        <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {displayClassrooms.map((classroom) => (
                        <tr
                          key={classroom.id}
                          className={`hover:bg-gray-50 transition-colors ${
                            classroom.status === 'archived'
                              ? 'opacity-60 bg-gray-50'
                              : ''
                          }`}
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                  classroom.status === 'archived'
                                    ? 'bg-gray-400'
                                    : 'bg-gradient-to-br from-indigo-500 to-purple-600'
                                }`}
                              >
                                {classroom.status === 'archived' ? (
                                  <Icons.Archive
                                    size={18}
                                    className="text-white"
                                  />
                                ) : (
                                  <Icons.BookOpen
                                    size={18}
                                    className="text-white"
                                  />
                                )}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">
                                  {classroom.name}
                                </p>
                                <p className="text-xs text-gray-500">
                                  Started:{' '}
                                  {classroom.startDate
                                    ? new Date(
                                        classroom.startDate
                                      ).toLocaleDateString()
                                    : 'N/A'}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <p className="text-sm font-medium text-gray-900">
                              {classroom.course?.name || 'N/A'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {classroom.course?.code}
                            </p>
                          </td>
                          <td className="py-3 px-4">
                            <p className="text-sm text-gray-900">
                              {classroom.faculty?.name || 'Unassigned'}
                            </p>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="inline-flex px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                              {classroom._count?.enrollments || 0}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="inline-flex px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                              {classroom._count?.sessions || 0}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                                classroom.status === 'archived'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-green-100 text-green-800'
                              }`}
                            >
                              {classroom.status || 'Active'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <a
                                href={`/dashboard/classroom/${classroom.id}`}
                                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"
                                title="View"
                              >
                                <Icons.Eye size={16} />
                              </a>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenCalendar(
                                    classroom.id,
                                    classroom.batchId
                                  );
                                }}
                                className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg"
                                title="Calendar"
                              >
                                <Icons.CalendarDays size={16} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenRoutine(
                                    classroom.id,
                                    classroom.batchId
                                  );
                                }}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                                title="Routine"
                              >
                                <Clock size={16} />
                              </button>
                              {hasUpdatePermission && (
                                <button
                                  onClick={() => onEdit(classroom)}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                                  title="Edit"
                                >
                                  <Icons.Edit2 size={16} />
                                </button>
                              )}
                              {hasDeletePermission && (
                                <button
                                  onClick={() =>
                                    onDelete(classroom.id, classroom.name)
                                  }
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                  title="Delete"
                                >
                                  <Icons.Trash2 size={16} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Exam Schedule Modal */}
      <ExamScheduleModal
        isOpen={showExamModal}
        onClose={() => setShowExamModal(false)}
        batchId={batch.id}
        batchName={batch.name}
        classrooms={classrooms}
      />
    </div>
  );
};

// ==================== ATTENDANCE REPORT WRAPPER ====================
function AttendanceReportWithSemesterDates({ onClose, batchId, batchName }) {
  const [semesterDates, setSemesterDates] = useState(null);
  const [loadingDates, setLoadingDates] = useState(true);
  useEffect(() => {
    if (batchId) fetchSemesterDates();
  }, [batchId]);
  const fetchSemesterDates = async () => {
    setLoadingDates(true);
    try {
      const r = await fetch(`/api/academic-calendar?batchId=${batchId}`);
      if (r.ok) {
        const d = await r.json();
        const e = d.events || [];
        const ss = e.find((x) => x.eventType === 'semester_start');
        const se = e.find((x) => x.eventType === 'semester_end');
        if (ss || se) {
          setSemesterDates({
            startDate: ss ? new Date(ss.date).toISOString().split('T')[0] : '',
            endDate: se ? new Date(se.date).toISOString().split('T')[0] : '',
          });
          setLoadingDates(false);
          return;
        }
      }
      const br = await fetch(`/api/batches/${batchId}`);
      if (br.ok) {
        const b = (await br.json()).batch || {};
        if (b.startDate || b.endDate) {
          setSemesterDates({
            startDate: b.startDate
              ? new Date(b.startDate).toISOString().split('T')[0]
              : '',
            endDate: b.endDate
              ? new Date(b.endDate).toISOString().split('T')[0]
              : '',
          });
          setLoadingDates(false);
          return;
        }
      }
      const n = new Date();
      setSemesterDates({
        startDate:
          n.getMonth() < 6
            ? `${n.getFullYear() - 1}-07-01`
            : `${n.getFullYear()}-07-01`,
        endDate:
          n.getMonth() < 6
            ? `${n.getFullYear()}-06-30`
            : `${n.getFullYear() + 1}-06-30`,
      });
    } catch {
      const n = new Date();
      setSemesterDates({
        startDate: new Date(n.getFullYear(), 0, 1).toISOString().split('T')[0],
        endDate: new Date(n.getFullYear(), 11, 31).toISOString().split('T')[0],
      });
    } finally {
      setLoadingDates(false);
    }
  };
  if (loadingDates)
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          className="bg-white rounded-2xl p-8 text-center shadow-xl"
        >
          <Icons.Loader2
            size={48}
            className="animate-spin text-indigo-600 mx-auto mb-4"
          />
          <p className="text-gray-600">Loading...</p>
        </motion.div>
      </motion.div>
    );
  return (
    <AttendanceSummaryReport
      onClose={onClose}
      preSelectedBatch={batchId ? String(batchId) : ''}
      preSelectedStartDate={semesterDates?.startDate || ''}
      preSelectedEndDate={semesterDates?.endDate || ''}
      batchName={batchName}
    />
  );
}

// ==================== MAIN PAGE ====================
export default function ClassroomPage() {
  const { can, isLoading: permissionsLoading } = usePermissions();
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingClassroom, setEditingClassroom] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [showAttendanceReport, setShowAttendanceReport] = useState(false);
  const [showBatchReport, setShowBatchReport] = useState(false);
  const [batchReportData, setBatchReportData] = useState({
    batchId: null,
    batchName: '',
  });
  const [showAcademicCalendar, setShowAcademicCalendar] = useState(false);
  const [calendarClassroomId, setCalendarClassroomId] = useState(null);
  const [calendarBatchId, setCalendarBatchId] = useState(null);
  const [showRoutineManager, setShowRoutineManager] = useState(false);
  const [routineClassroomId, setRoutineClassroomId] = useState(null);
  const [routineBatchId, setRoutineBatchId] = useState(null);
  const [showELibrary, setShowELibrary] = useState(false);
  const [groupedClassrooms, setGroupedClassrooms] = useState({});
  const [batchStudentCounts, setBatchStudentCounts] = useState({});
  const [expandedBatches, setExpandedBatches] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [batchStatusFilter, setBatchStatusFilter] = useState('active');
  const [expandAll, setExpandAll] = useState(false);
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    classroomId: null,
    classroomName: '',
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const [showArchivedMap, setShowArchivedMap] = useState({});

  const hasRead = can('classroom', 'read');
  const hasCreate = can('classroom', 'create');
  const hasUpdate = can('classroom', 'update');
  const hasDelete = can('classroom', 'delete');

  const handleOpenRoutine = (cid = null, bid = null) => {
    setRoutineClassroomId(cid);
    setRoutineBatchId(bid);
    setShowRoutineManager(true);
  };
  const handleOpenCalendar = (cid = null, bid = null) => {
    setCalendarClassroomId(cid);
    setCalendarBatchId(bid);
    setShowAcademicCalendar(true);
  };
  const handleOpenBatchReport = (bid, bname) => {
    setBatchReportData({ batchId: bid, batchName: bname || 'Unknown Batch' });
    setShowBatchReport(true);
  };

  const fetchClassrooms = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/classrooms');
      if (response.ok) {
        const data = await response.json();
        const classrooms = data.classrooms || [];
        const grouped = {};
        const batchIds = new Set();
        classrooms.forEach((c) => {
          const key = c.batchId ? c.batchId.toString() : 'unassigned';
          if (c.batchId) batchIds.add(c.batchId);
          if (!grouped[key])
            grouped[key] = {
              batch: c.batch || {
                id: 'unassigned',
                name: 'Unassigned',
                status: 'active',
              },
              classrooms: [],
            };
          grouped[key].classrooms.push(c);
        });
        Object.keys(grouped).forEach((k) => {
          grouped[k].classrooms.sort((a, b) => a.name.localeCompare(b.name));
        });
        setGroupedClassrooms(grouped);
        const keys = Object.keys(grouped);
        if (keys.length > 0 && Object.keys(expandedBatches).length === 0)
          setExpandedBatches({ [keys[0]]: true });
        const counts = {};
        await Promise.all(
          Array.from(batchIds).map(async (bid) => {
            try {
              const r = await fetch(`/api/batches/${bid}/students`);
              if (r.ok) {
                const d = await r.json();
                const s = d.students || d || [];
                counts[bid] = Array.isArray(s)
                  ? s.filter((x) => !x.status || x.status === 'active').length
                  : d.count || s.length || 0;
              } else
                counts[bid] =
                  grouped[bid.toString()]?.classrooms?.reduce(
                    (s, c) => s + (c._count?.enrollments || 0),
                    0
                  ) || 0;
            } catch {
              counts[bid] =
                grouped[bid.toString()]?.classrooms?.reduce(
                  (s, c) => s + (c._count?.enrollments || 0),
                  0
                ) || 0;
            }
          })
        );
        setBatchStudentCounts(counts);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (hasRead) fetchClassrooms();
  }, [hasRead, refreshTrigger, fetchClassrooms]);

  const showMsg = (m, t = 'success') => {
    if (t === 'success') {
      setSuccessMessage(m);
      setTimeout(() => setSuccessMessage(null), 3000);
    } else {
      setErrorMessage(m);
      setTimeout(() => setErrorMessage(null), 3000);
    }
  };
  const handleRefresh = () => setRefreshTrigger((p) => p + 1);
  const toggleBatch = (k) => setExpandedBatches((p) => ({ ...p, [k]: !p[k] }));
  const toggleAllBatches = () => {
    const n = !expandAll;
    setExpandAll(n);
    const ne = {};
    Object.keys(groupedClassrooms).forEach((k) => {
      ne[k] = n;
    });
    setExpandedBatches(ne);
  };
  const toggleShowArchived = (batchKey) =>
    setShowArchivedMap((p) => ({ ...p, [batchKey]: !p[batchKey] }));
  const openDeleteModal = (id, name) => {
    if (!hasDelete) {
      showMsg('No permission', 'error');
      return;
    }
    setDeleteModal({ isOpen: true, classroomId: id, classroomName: name });
  };
  const closeDeleteModal = () => {
    if (!isDeleting)
      setDeleteModal({ isOpen: false, classroomId: null, classroomName: '' });
  };
  const confirmDelete = async () => {
    if (!deleteModal.classroomId) return;
    setIsDeleting(true);
    try {
      const r = await fetch(`/api/classrooms/${deleteModal.classroomId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!r.ok) {
        let e = 'Failed';
        try {
          const d = await r.json();
          e = d?.error || d?.message || e;
        } catch {}
        throw new Error(e);
      }
      showMsg('Deleted!', 'success');
      setDeleteModal({ isOpen: false, classroomId: null, classroomName: '' });
      handleRefresh();
    } catch (err) {
      showMsg(err.message, 'error');
    } finally {
      setIsDeleting(false);
    }
  };
  const handleSave = async (fd) => {
    setFormLoading(true);
    try {
      const url = editingClassroom
        ? `/api/classrooms/${editingClassroom.id}`
        : '/api/classrooms';
      const r = await fetch(url, {
        method: editingClassroom ? 'PUT' : 'POST',
        body: fd,
      });
      if (!r.ok) {
        let e = 'Failed';
        try {
          const d = await r.json();
          e = d?.error || d?.message || e;
        } catch {}
        throw new Error(e);
      }
      showMsg(editingClassroom ? 'Updated!' : 'Created!', 'success');
      setIsFormModalOpen(false);
      setEditingClassroom(null);
      handleRefresh();
    } catch (err) {
      showMsg(err.message, 'error');
    } finally {
      setFormLoading(false);
    }
  };

  const getEffectiveBatchStatus = (batchData) => {
    const batchStatus = batchData.batch?.status || 'active';
    const classrooms = batchData.classrooms || [];
    const hasActiveClassrooms = classrooms.some(
      (c) => !c.status || c.status === 'active'
    );
    if (
      batchStatus === 'active' &&
      classrooms.length > 0 &&
      !hasActiveClassrooms
    )
      return 'inactive';
    return batchStatus;
  };
  const filteredBatches = Object.entries(groupedClassrooms).filter(([, d]) => {
    const bn = d.batch?.name?.toLowerCase() || '';
    const sl = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      bn.includes(sl) ||
      d.classrooms.some(
        (c) =>
          c.name?.toLowerCase().includes(sl) ||
          c.course?.name?.toLowerCase().includes(sl)
      );
    const effectiveStatus = getEffectiveBatchStatus(d);
    const matchesBatchStatus =
      batchStatusFilter === 'all' ||
      (batchStatusFilter === 'active' && effectiveStatus === 'active') ||
      (batchStatusFilter === 'inactive' && effectiveStatus !== 'active');
    return matchesSearch && matchesBatchStatus;
  });
  const getStudentCount = (bk, bid) =>
    batchStudentCounts[bid] !== undefined
      ? batchStudentCounts[bid]
      : groupedClassrooms[bk]?.classrooms?.reduce(
          (s, c) => s + (c._count?.enrollments || 0),
          0
        ) || 0;
  const totalStudents = useMemo(
    () => Object.values(batchStudentCounts).reduce((s, c) => s + c, 0),
    [batchStudentCounts]
  );
  const allBatches = Object.keys(groupedClassrooms).length;
  const activeBatches = Object.entries(groupedClassrooms).filter(
    ([, d]) => getEffectiveBatchStatus(d) === 'active'
  ).length;
  const inactiveBatches = allBatches - activeBatches;
  const totalActiveClassrooms = Object.values(groupedClassrooms).reduce(
    (s, d) =>
      s + d.classrooms.filter((c) => !c.status || c.status === 'active').length,
    0
  );

  if (permissionsLoading)
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto p-6">
          <LoadingState />
        </div>
      </div>
    );
  if (!hasRead)
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center max-w-md">
          <Icons.Lock size={32} className="text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-red-800">Access Denied</h2>
          <p className="text-red-600">No permission.</p>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50">
      <AnimatePresence>
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            className="fixed top-20 right-6 z-50 bg-green-50 border-l-4 border-green-500 text-green-800 px-4 py-3 rounded-lg shadow-lg min-w-[280px]"
          >
            <div className="flex items-center gap-2">
              <Icons.CheckCircle size={20} className="text-green-500" />
              <span>{successMessage}</span>
              <button
                onClick={() => setSuccessMessage(null)}
                className="ml-auto"
              >
                <Icons.X size={16} />
              </button>
            </div>
          </motion.div>
        )}
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            className="fixed top-20 right-6 z-50 bg-red-50 border-l-4 border-red-500 text-red-800 px-4 py-3 rounded-lg shadow-lg min-w-[280px]"
          >
            <div className="flex items-center gap-2">
              <Icons.AlertCircle size={20} className="text-red-500" />
              <span>{errorMessage}</span>
              <button onClick={() => setErrorMessage(null)} className="ml-auto">
                <Icons.X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={closeDeleteModal}
        onConfirm={confirmDelete}
        title="Delete Classroom"
        message={`Delete "${deleteModal.classroomName}"?`}
        loading={isDeleting}
      />

      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <span>🏠</span>
            <span>/</span>
            <span className="text-gray-900">Classroom Management</span>
          </div>
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Classroom Management
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {totalActiveClassrooms} active classrooms across {activeBatches}{' '}
                active batches
              </p>
            </div>
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={handleRefresh}
                className="cursor-pointer px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
              >
                <Icons.RefreshCw size={18} /> Refresh
              </button>
              <button
                onClick={() => handleOpenCalendar(null, null)}
                className="cursor-pointer px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 flex items-center gap-2"
              >
                <Icons.CalendarDays size={18} /> Calendar
              </button>
              <button
                onClick={() => handleOpenRoutine(null, null)}
                className="cursor-pointer px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
              >
                <Clock size={18} /> Routine
              </button>
              <button
                onClick={() => setShowELibrary(true)}
                className="cursor-pointer px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2"
              >
                <Library size={18} /> E-Library
              </button>
              <button
                onClick={() => setShowAttendanceReport(true)}
                className="cursor-pointer px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
              >
                <Icons.BarChart3 size={18} /> Report
              </button>
              {hasCreate && (
                <button
                  onClick={() => {
                    setEditingClassroom(null);
                    setIsFormModalOpen(true);
                  }}
                  className="cursor-pointer px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
                >
                  <Icons.Plus size={18} /> Add Classroom
                </button>
              )}
              <div className="bg-indigo-50 rounded-lg px-4 py-2 flex items-center gap-2">
                <Calendar size={16} className="text-indigo-600" />
                <span className="text-sm text-gray-600">
                  {new Date().toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              icon: Icons.Layers,
              color: 'bg-indigo-100 text-indigo-600',
              label: 'Active Batches',
              value: activeBatches,
            },
            {
              icon: Icons.Archive,
              color: 'bg-gray-100 text-gray-600',
              label: 'Inactive Batches',
              value: inactiveBatches,
            },
            {
              icon: Icons.BookOpen,
              color: 'bg-blue-100 text-blue-600',
              label: 'Active Classrooms',
              value: totalActiveClassrooms,
            },
            {
              icon: Icons.Users,
              color: 'bg-green-100 text-green-600',
              label: 'Total Students',
              value: totalStudents,
            },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-lg p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 ${
                    s.color.split(' ')[0]
                  } rounded-lg flex items-center justify-center`}
                >
                  <s.icon size={20} className={s.color.split(' ')[1]} />
                </div>
                <div>
                  <p className="text-xs text-gray-500">{s.label}</p>
                  <p className="text-lg font-bold text-gray-900">{s.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4">
        <div className="bg-white rounded-lg p-4 shadow-sm flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Icons.Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={16}
              />
              <input
                type="text"
                placeholder="Search batches or classrooms..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-64 focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setBatchStatusFilter('active')}
                className={`cursor-pointer px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  batchStatusFilter === 'active'
                    ? 'bg-green-500 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <Icons.CheckCircle size={12} className="inline mr-1" /> Active (
                {activeBatches})
              </button>
              <button
                onClick={() => setBatchStatusFilter('inactive')}
                className={`cursor-pointer px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  batchStatusFilter === 'inactive'
                    ? 'bg-gray-500 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <Icons.Archive size={12} className="inline mr-1" /> Inactive (
                {inactiveBatches})
              </button>
              <button
                onClick={() => setBatchStatusFilter('all')}
                className={`cursor-pointer px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  batchStatusFilter === 'all'
                    ? 'bg-indigo-500 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <Icons.Layers size={12} className="inline mr-1" /> All (
                {allBatches})
              </button>
            </div>
          </div>
          <button
            onClick={toggleAllBatches}
            className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
          >
            {expandAll ? (
              <Icons.ChevronUp size={16} />
            ) : (
              <Icons.ChevronDown size={16} />
            )}
            {expandAll ? 'Collapse All' : 'Expand All'}
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
        {loading ? (
          <LoadingState />
        ) : filteredBatches.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <Icons.BookOpen size={48} className="text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">
              {batchStatusFilter === 'active'
                ? 'No active batches found'
                : batchStatusFilter === 'inactive'
                ? 'No inactive batches found'
                : 'No batches found'}
            </p>
            {hasCreate && (
              <button
                onClick={() => {
                  setEditingClassroom(null);
                  setIsFormModalOpen(true);
                }}
                className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg"
              >
                Create First Classroom
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredBatches.map(([bk, data]) => (
              <BatchAccordion
                key={bk}
                batch={data.batch}
                classrooms={data.classrooms}
                isExpanded={!!expandedBatches[bk]}
                onToggle={() => toggleBatch(bk)}
                onEdit={(c) => {
                  setEditingClassroom(c);
                  setIsFormModalOpen(true);
                }}
                onDelete={openDeleteModal}
                onOpenCalendar={handleOpenCalendar}
                onOpenRoutine={handleOpenRoutine}
                onOpenBatchReport={handleOpenBatchReport}
                hasUpdatePermission={hasUpdate}
                hasDeletePermission={hasDelete}
                studentCount={getStudentCount(bk, data.batch.id)}
                showArchived={!!showArchivedMap[bk]}
                onToggleArchive={() => toggleShowArchived(bk)}
              />
            ))}
          </div>
        )}
      </div>

      <ClassroomFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingClassroom(null);
        }}
        onSubmit={handleSave}
        initialData={editingClassroom}
        loading={formLoading}
      />
      <AnimatePresence>
        {showAttendanceReport && (
          <AttendanceSummaryReport
            onClose={() => setShowAttendanceReport(false)}
          />
        )}
        {showBatchReport && batchReportData.batchId && (
          <AttendanceReportWithSemesterDates
            onClose={() => {
              setShowBatchReport(false);
              setBatchReportData({ batchId: null, batchName: '' });
            }}
            batchId={batchReportData.batchId}
            batchName={batchReportData.batchName}
          />
        )}
        {showAcademicCalendar && (
          <AcademicCalendar3D
            classroomId={calendarClassroomId}
            batchId={calendarBatchId}
            isOpen={showAcademicCalendar}
            onClose={() => setShowAcademicCalendar(false)}
          />
        )}
        {showRoutineManager && (
          <RoutineManager3D
            classroomId={routineClassroomId}
            batchId={routineBatchId}
            isOpen={showRoutineManager}
            onClose={() => setShowRoutineManager(false)}
          />
        )}
        {showELibrary && (
          <ELibrarySearch
            isOpen={showELibrary}
            onClose={() => setShowELibrary(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
