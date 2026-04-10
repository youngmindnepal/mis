// components/classroom/ClassroomDetailsClient.jsx
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as Icons from 'lucide-react';

// Custom Modal Component
const CustomModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type = 'confirm',
}) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <Icons.CheckCircle className="text-green-500" size={48} />;
      case 'error':
        return <Icons.XCircle className="text-red-500" size={48} />;
      case 'warning':
        return <Icons.AlertTriangle className="text-yellow-500" size={48} />;
      default:
        return <Icons.HelpCircle className="text-blue-500" size={48} />;
    }
  };

  const getButtonColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-600 hover:bg-green-700';
      case 'error':
        return 'bg-red-600 hover:bg-red-700';
      case 'warning':
        return 'bg-yellow-600 hover:bg-yellow-700';
      default:
        return 'bg-indigo-600 hover:bg-indigo-700';
    }
  };

  const handleConfirm = async () => {
    if (onConfirm) {
      await onConfirm();
    }
    onClose();
  };

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
            className="bg-white rounded-2xl max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 text-center">
              <div className="flex justify-center mb-4">{getIcon()}</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">{title}</h3>
              <p className="text-gray-600 mb-6">{message}</p>
              <div className="flex gap-3 justify-center">
                {type === 'confirm' && (
                  <button
                    onClick={onClose}
                    className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                )}
                <button
                  onClick={handleConfirm}
                  className={`px-4 py-2 text-white rounded-lg transition-colors ${getButtonColor()}`}
                >
                  {type === 'confirm' ? 'Confirm' : 'OK'}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default function ClassroomDetailsClient({
  classroom,
  studentId,
  isTeacher,
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('students');
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [attendanceForm, setAttendanceForm] = useState({
    date: new Date().toISOString().split('T')[0],
    startTime: '',
    endTime: '',
    syllabusCovered: '',
  });
  const [studentAttendance, setStudentAttendance] = useState([]);
  const [modal, setModal] = useState({
    isOpen: false,
    type: 'confirm',
    title: '',
    message: '',
    onConfirm: null,
  });
  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Date range filter states
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [filteredAttendanceData, setFilteredAttendanceData] = useState({
    students: [],
    sessionDates: [],
    sessionIsoDates: [],
  });
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(false);

  // Edit session states
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingDate, setEditingDate] = useState('');
  const [editingSessionId, setEditingSessionId] = useState(null);

  // Overall statistics
  const [overallStats, setOverallStats] = useState({
    totalStudents: 0,
    totalSessions: 0,
    overallAttendance: 0,
    highestAttendance: { name: '', percentage: 0 },
    lowestAttendance: { name: '', percentage: 100 },
  });

  // Get active students and sort by name alphabetically
  const getActiveStudentsSorted = () => {
    const active =
      classroom.enrolledStudents?.filter(
        (student) => student.enrollmentStatus === 'active'
      ) || [];

    // Sort by name in ascending order
    return [...active].sort((a, b) => {
      const nameA = (a.name || '').toLowerCase();
      const nameB = (b.name || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });
  };

  // Helper function for attendance - returns sorted active students
  const getActiveStudentsForAttendance = () => {
    return getActiveStudentsSorted();
  };

  // Filter only active students (sorted by name)
  const activeStudents = getActiveStudentsSorted();
  const activeStudentIds = new Set(activeStudents.map((s) => s.id));

  // Auto-dismiss messages
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  // Export attendance report to CSV
  const exportAttendanceReport = () => {
    if (
      !filteredAttendanceData.students.length ||
      !filteredAttendanceData.sessionDates.length
    ) {
      setErrorMessage('No data to export');
      return;
    }

    const headers = [
      'Student Name',
      'Roll No',
      ...filteredAttendanceData.sessionDates,
      'Present Count',
      'Total Sessions',
      'Percentage (%)',
    ];

    // Sort students in the report by name
    const sortedStudents = [...filteredAttendanceData.students].sort((a, b) => {
      const nameA = (a.studentName || '').toLowerCase();
      const nameB = (b.studentName || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });

    const rows = sortedStudents.map((student) => {
      let presentCount = 0;
      const sessionStatuses = filteredAttendanceData.sessionDates.map(
        (date) => {
          const status = student.attendances[date];
          if (status === 'present') {
            presentCount++;
            return 'P';
          }
          return 'A';
        }
      );

      return [
        student.studentName,
        student.rollNumber || '-',
        ...sessionStatuses,
        presentCount,
        student.totalSessions,
        student.percentage.toFixed(2),
      ];
    });

    const csvContent = [headers, ...rows]
      .map((row) => row.join(','))
      .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `attendance_report_${
        classroom.name
      }_${new Date().toLocaleDateString()}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setSuccessMessage('Attendance report exported successfully!');
  };

  // Fetch filtered attendance data when date range changes
  useEffect(() => {
    if (activeTab === 'attendance') {
      fetchFilteredAttendance();
    }
  }, [fromDate, toDate, activeTab]);

  const fetchFilteredAttendance = async () => {
    setIsLoadingAttendance(true);
    try {
      const params = new URLSearchParams();
      if (fromDate) params.append('startDate', fromDate);
      if (toDate) params.append('endDate', toDate);

      const response = await fetch(
        `/api/classrooms/${classroom.id}/attendance/filter?${params}`
      );
      if (!response.ok) throw new Error('Failed to fetch attendance');

      const data = await response.json();
      const attendanceByStudent = {};
      let totalPresentCount = 0;
      let totalPossibleAttendance = 0;

      // Filter to only include active enrolled students
      const filteredAttendances = data.attendances.filter((att) =>
        activeStudentIds.has(att.studentId)
      );

      filteredAttendances.forEach((att) => {
        if (!attendanceByStudent[att.studentId]) {
          attendanceByStudent[att.studentId] = {
            studentId: att.studentId,
            studentName: att.student?.name || 'Unknown',
            rollNumber: att.student?.rollNumber || '-',
            attendances: {},
            presentCount: 0,
            totalSessions: 0,
          };
        }
        const sessionDate = new Date(
          att.classSession?.date
        ).toLocaleDateString();
        attendanceByStudent[att.studentId].attendances[sessionDate] =
          att.status;
        attendanceByStudent[att.studentId].totalSessions++;
        if (att.status === 'present') {
          attendanceByStudent[att.studentId].presentCount++;
          totalPresentCount++;
        }
        totalPossibleAttendance++;
      });

      const sessionDates = [
        ...new Set(
          filteredAttendances.map((att) =>
            new Date(att.classSession?.date).toLocaleDateString()
          )
        ),
      ].sort((a, b) => new Date(a) - new Date(b));

      const sessionIsoDates = [
        ...new Set(
          filteredAttendances.map(
            (att) =>
              new Date(att.classSession?.date).toISOString().split('T')[0]
          )
        ),
      ].sort();

      const studentsWithStats = Object.values(attendanceByStudent).map(
        (student) => ({
          ...student,
          percentage:
            student.totalSessions > 0
              ? (student.presentCount / student.totalSessions) * 100
              : 0,
        })
      );

      // Add active students with no attendance records
      activeStudents.forEach((student) => {
        if (!attendanceByStudent[student.id]) {
          studentsWithStats.push({
            studentId: student.id,
            studentName: student.name,
            rollNumber: student.rollNumber || '-',
            attendances: {},
            presentCount: 0,
            totalSessions: 0,
            percentage: 0,
          });
        }
      });

      // Sort students by name for display
      studentsWithStats.sort((a, b) => {
        const nameA = (a.studentName || '').toLowerCase();
        const nameB = (b.studentName || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });

      let highest = { name: '', percentage: 0 };
      let lowest = { name: '', percentage: 100 };

      studentsWithStats.forEach((student) => {
        if (student.percentage > highest.percentage) {
          highest = {
            name: student.studentName,
            percentage: student.percentage,
          };
        }
        if (
          student.percentage < lowest.percentage &&
          student.totalSessions > 0
        ) {
          lowest = {
            name: student.studentName,
            percentage: student.percentage,
          };
        }
      });

      const overallAttendance =
        totalPossibleAttendance > 0
          ? (totalPresentCount / totalPossibleAttendance) * 100
          : 0;

      setOverallStats({
        totalStudents: studentsWithStats.length,
        totalSessions: sessionDates.length,
        overallAttendance,
        highestAttendance: highest,
        lowestAttendance: lowest,
      });

      setFilteredAttendanceData({
        students: studentsWithStats,
        sessionDates: sessionDates,
        sessionIsoDates: sessionIsoDates,
        totalStudents: studentsWithStats.length,
        totalSessions: sessionDates.length,
      });
    } catch (err) {
      console.error('Error fetching filtered attendance:', err);
      setErrorMessage(err.message);
    } finally {
      setIsLoadingAttendance(false);
    }
  };
  const fetchAttendanceForEditing = async (isoDate) => {
    setIsLoadingAttendance(true);
    try {
      // This URL is correct - it uses /by-date
      const response = await fetch(
        `/api/classrooms/${classroom.id}/attendance/by-date?date=${isoDate}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch attendance data');
      }

      const data = await response.json();

      // Filter to only include active enrolled students
      const activeStudentsList = getActiveStudentsForAttendance();
      const activeStudentIdsSet = new Set(activeStudentsList.map((s) => s.id));

      const filteredAttendances = data.attendances.filter((att) =>
        activeStudentIdsSet.has(att.studentId)
      );

      if (data.session && data.session.id) {
        setEditingSessionId(data.session.id);
        setIsEditMode(true);
        setEditingDate(new Date(isoDate).toLocaleDateString());

        const attendanceList = filteredAttendances.map((att) => ({
          studentId: att.studentId,
          studentName: att.studentName,
          rollNumber: att.rollNumber,
          status: att.status,
          remarks: att.remarks,
        }));

        // Sort attendance list by student name
        attendanceList.sort((a, b) => {
          const nameA = (a.studentName || '').toLowerCase();
          const nameB = (b.studentName || '').toLowerCase();
          return nameA.localeCompare(nameB);
        });

        setStudentAttendance(attendanceList);
      } else {
        initializeAttendanceList();
        setEditingSessionId(null);
        setIsEditMode(false);
        setEditingDate(new Date(isoDate).toLocaleDateString());
      }

      setAttendanceForm({
        date: isoDate,
        startTime: data.session?.startTime
          ? new Date(data.session.startTime).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            })
          : '',
        endTime: data.session?.endTime
          ? new Date(data.session.endTime).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            })
          : '',
        syllabusCovered: data.session?.syllabusCovered || '',
      });

      setShowAttendanceModal(true);
    } catch (err) {
      console.error('Error fetching attendance for editing:', err);
      setErrorMessage(
        err.message || 'Failed to load attendance data for editing'
      );
    } finally {
      setIsLoadingAttendance(false);
    }
  };

  // Add this function to check for existing attendance on the selected date
  const checkExistingAttendance = async (date) => {
    try {
      const response = await fetch(
        `/api/classrooms/${classroom.id}/attendance/by-date?date=${date}`
      );
      if (response.ok) {
        const data = await response.json();
        if (data.session && data.session.id) {
          return {
            exists: true,
            sessionId: data.session.id,
            session: data.session,
          };
        }
      }
      return { exists: false };
    } catch (error) {
      console.error('Error checking existing attendance:', error);
      return { exists: false };
    }
  };

  // Update the saveUpdatedAttendance function to check before saving
  const saveUpdatedAttendance = async () => {
    if (!attendanceForm.date) {
      setErrorMessage('Please select a date');
      return;
    }

    // If not in edit mode, check if attendance already exists for this date
    if (!isEditMode && !editingSessionId) {
      const existing = await checkExistingAttendance(attendanceForm.date);
      if (existing.exists) {
        showModal(
          'warning',
          'Attendance Already Exists',
          `Attendance has already been marked for ${attendanceForm.date}.\n\nWould you like to edit the existing session?`,
          async () => {
            setShowAttendanceModal(false);
            await fetchAttendanceForEditing(attendanceForm.date);
          }
        );
        return;
      }
    }

    setSubmitting(true);
    try {
      const formattedDate = new Date(attendanceForm.date)
        .toISOString()
        .split('T')[0];

      let url = `/api/classrooms/${classroom.id}/attendance`;
      let method = 'POST';
      let requestBody = {};

      if (isEditMode && editingSessionId) {
        url = `/api/classrooms/${classroom.id}/attendance/session/${editingSessionId}`;
        method = 'PUT';
        requestBody = {
          sessionDetails: {
            date: formattedDate,
            startTime: attendanceForm.startTime,
            endTime: attendanceForm.endTime,
            syllabusCovered: attendanceForm.syllabusCovered,
          },
          attendances: studentAttendance.map((s) => ({
            studentId: s.studentId,
            status: s.status,
            remarks: s.remarks,
          })),
        };
      } else {
        requestBody = {
          date: formattedDate,
          startTime: attendanceForm.startTime,
          endTime: attendanceForm.endTime,
          syllabusCovered: attendanceForm.syllabusCovered,
          attendances: studentAttendance.map((s) => ({
            studentId: s.studentId,
            status: s.status,
            remarks: s.remarks,
          })),
        };
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(
          responseData.error ||
            `Failed to ${editingSessionId ? 'update' : 'mark'} attendance`
        );
      }

      setSuccessMessage(
        `Attendance ${
          editingSessionId ? 'updated' : 'marked'
        } successfully for ${attendanceForm.date}!`
      );
      setShowAttendanceModal(false);
      resetAttendanceForm();
      refreshPage();
      setTimeout(() => fetchFilteredAttendance(), 500);
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  };
  const deleteAttendanceSession = async (sessionId, displayDate) => {
    try {
      // Use the correct URL structure with "session" in the path
      const response = await fetch(
        `/api/classrooms/${classroom.id}/attendance/session/${sessionId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || 'Failed to delete attendance session'
        );
      }

      setSuccessMessage(
        `Attendance session for ${displayDate} deleted successfully!`
      );
      refreshPage();
      setTimeout(() => fetchFilteredAttendance(), 500);
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  // Update initializeAttendanceList with sorted students
  const initializeAttendanceList = () => {
    const activeOnly = getActiveStudentsForAttendance();
    const attendanceList = activeOnly.map((student) => ({
      studentId: student.id,
      studentName: student.name,
      rollNumber: student.rollNumber,
      status: 'present',
      remarks: '',
    }));

    // Sort by student name
    attendanceList.sort((a, b) => {
      const nameA = (a.studentName || '').toLowerCase();
      const nameB = (b.studentName || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });

    setStudentAttendance(attendanceList);
  };

  const resetAttendanceForm = () => {
    setAttendanceForm({
      date: new Date().toISOString().split('T')[0],
      startTime: '',
      endTime: '',
      syllabusCovered: '',
    });
    setIsEditMode(false);
    setEditingSessionId(null);
    setEditingDate('');
    setStudentAttendance([]);
  };

  const toggleAttendance = (studentId) => {
    setStudentAttendance((prev) =>
      prev.map((student) =>
        student.studentId === studentId
          ? {
              ...student,
              status: student.status === 'present' ? 'absent' : 'present',
            }
          : student
      )
    );
  };

  const toggleAllAttendance = (status) => {
    setStudentAttendance((prev) =>
      prev.map((student) => ({ ...student, status }))
    );
  };

  const markAllPresent = () => toggleAllAttendance('present');
  const markAllAbsent = () => toggleAllAttendance('absent');

  const updateRemarks = (studentId, remarks) => {
    setStudentAttendance((prev) =>
      prev.map((student) =>
        student.studentId === studentId ? { ...student, remarks } : student
      )
    );
  };

  const showModal = (type, title, message, onConfirm = null) => {
    setModal({
      isOpen: true,
      type,
      title,
      message,
      onConfirm: async () => {
        if (onConfirm) {
          await onConfirm();
        }
        setModal({ ...modal, isOpen: false });
      },
    });
  };

  const refreshPage = () => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const openTakeAttendanceModal = () => {
    resetAttendanceForm();
    initializeAttendanceList();
    setShowAttendanceModal(true);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusBadge = (percentage) => {
    if (percentage >= 75)
      return { bg: 'bg-green-100 text-green-800', text: 'Good' };
    if (percentage >= 60)
      return { bg: 'bg-yellow-100 text-yellow-800', text: 'Average' };
    if (percentage >= 40)
      return { bg: 'bg-orange-100 text-orange-800', text: 'Poor' };
    return { bg: 'bg-red-100 text-red-800', text: 'Critical' };
  };

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const clearDateFilters = () => {
    setFromDate('');
    setToDate('');
  };

  return (
    <div className="space-y-6">
      {/* Refreshing Overlay */}
      {isRefreshing && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 flex items-center gap-3 shadow-lg">
            <Icons.Loader2 size={24} className="animate-spin text-indigo-600" />
            <span className="text-gray-700">Refreshing data...</span>
          </div>
        </div>
      )}

      {/* Success Toast */}
      <AnimatePresence>
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            className="fixed top-20 right-6 z-50 bg-green-50 border-l-4 border-green-500 text-green-800 px-4 py-3 rounded-lg shadow-lg"
          >
            <div className="flex items-center gap-2">
              <Icons.CheckCircle size={20} className="text-green-500" />
              <span className="font-medium">{successMessage}</span>
              <button
                onClick={() => setSuccessMessage(null)}
                className="ml-auto"
              >
                <Icons.X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Toast */}
      <AnimatePresence>
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            className="fixed top-20 right-6 z-50 bg-red-50 border-l-4 border-red-500 text-red-800 px-4 py-3 rounded-lg shadow-lg"
          >
            <div className="flex items-center gap-2">
              <Icons.AlertCircle size={20} className="text-red-500" />
              <span className="font-medium">{errorMessage}</span>
              <button onClick={() => setErrorMessage(null)} className="ml-auto">
                <Icons.X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Back Button */}
      <Link
        href="/dashboard/classroom"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors bg-white px-4 py-2 rounded-lg shadow-sm"
      >
        <Icons.ArrowLeft size={20} />
        Back to Classrooms
      </Link>

      {/* Course Information Card */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-8">
          <div className="flex justify-between items-start flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                {classroom.name}
              </h1>
              <p className="text-indigo-100 text-lg">
                {classroom.course?.name || 'No Course Assigned'}
              </p>
              {classroom.course?.code && (
                <p className="text-indigo-200 text-sm mt-1">
                  Course Code: {classroom.course.code}
                </p>
              )}
            </div>
            {isTeacher && (
              <button
                onClick={openTakeAttendanceModal}
                className="px-5 py-2.5 bg-white text-indigo-600 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-2 font-medium shadow-md"
              >
                <Icons.CheckSquare size={18} /> Take Attendance
              </button>
            )}
          </div>
        </div>

        {/* Course Details */}
        <div className="p-6 border-b">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-500">Course Name</p>
              <p className="font-semibold">{classroom.course?.name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Course Code</p>
              <p className="font-semibold">{classroom.course?.code || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Credits</p>
              <p className="font-semibold">
                {classroom.course?.credits || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Course Type</p>
              <p className="font-semibold">
                {classroom.course?.courseType === 'core'
                  ? 'Core Course'
                  : 'Elective Course'}
              </p>
            </div>
          </div>
          {classroom.course?.description && (
            <p className="text-sm text-gray-600 mt-4">
              {classroom.course.description}
            </p>
          )}
        </div>

        {/* Stats Grid */}
        <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Icons.User size={22} className="text-indigo-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Faculty</p>
              <p className="font-semibold">
                {classroom.faculty?.name || 'Not assigned'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <Icons.GraduationCap size={22} className="text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Batch</p>
              <p className="font-semibold">
                {classroom.batch?.name || 'Not assigned'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Icons.Users size={22} className="text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Enrolled</p>
              <p className="font-semibold">
                {classroom._count?.enrollments || 0} Students
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <Icons.Calendar size={22} className="text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Sessions</p>
              <p className="font-semibold">
                {classroom._count?.sessions || 0} Held
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="border-b px-6">
          <div className="flex gap-8">
            <button
              onClick={() => setActiveTab('students')}
              className={`py-4 text-sm font-medium transition-colors border-b-2 ${
                activeTab === 'students'
                  ? 'text-indigo-600 border-indigo-600'
                  : 'text-gray-500 border-transparent hover:text-gray-700'
              }`}
            >
              <Icons.Users size={16} className="inline mr-2" /> Students (
              {activeStudents.length})
            </button>
            <button
              onClick={() => setActiveTab('attendance')}
              className={`py-4 text-sm font-medium transition-colors border-b-2 ${
                activeTab === 'attendance'
                  ? 'text-indigo-600 border-indigo-600'
                  : 'text-gray-500 border-transparent hover:text-gray-700'
              }`}
            >
              <Icons.Clipboard size={16} className="inline mr-2" /> Attendance
              Report
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Students Tab */}
          {activeTab === 'students' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Active Students
              </h3>
              {activeStudents.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 rounded-lg">
                      <tr>
                        <th className="text-left py-3 px-4 text-sm font-semibold">
                          Roll No
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold">
                          Student Name
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold">
                          Email
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold">
                          Enrolled Date
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeStudents.map((student) => (
                        <tr
                          key={student.id}
                          className="border-b hover:bg-gray-50"
                        >
                          <td className="py-3 px-4 text-sm font-mono">
                            {student.rollNumber || '-'}
                          </td>
                          <td className="py-3 px-4">
                            <p className="font-medium">{student.name}</p>
                          </td>
                          <td className="py-3 px-4 text-sm">{student.email}</td>
                          <td className="py-3 px-4 text-sm">
                            {formatDate(student.enrolledAt)}
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Active
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Icons.Users
                    size={48}
                    className="text-gray-300 mx-auto mb-3"
                  />
                  <p className="text-gray-500">
                    No active students enrolled in this classroom.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Attendance Tab - Keep existing JSX */}
          {activeTab === 'attendance' && (
            <div>
              {/* Keep existing attendance tab JSX */}
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">
                  Attendance Report
                </h3>
                <button
                  onClick={exportAttendanceReport}
                  disabled={!filteredAttendanceData.students.length}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <Icons.Download size={18} /> Export Report
                </button>
              </div>

              {/* Overall Statistics Cards */}
              {!isLoadingAttendance &&
                filteredAttendanceData.sessionDates?.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                    {/* Stats cards - keep existing */}
                  </div>
                )}

              {/* Date Range Filter */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex flex-wrap gap-4 items-end">
                  <div className="flex-1 min-w-[150px]">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      From Date
                    </label>
                    <input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="flex-1 min-w-[150px]">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      To Date
                    </label>
                    <input
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <button
                    onClick={clearDateFilters}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-2"
                  >
                    <Icons.X size={16} /> Clear Filters
                  </button>
                </div>
              </div>

              {/* Loading State */}
              {isLoadingAttendance && (
                <div className="text-center py-12">
                  <Icons.Loader2
                    size={48}
                    className="animate-spin text-indigo-600 mx-auto mb-4"
                  />
                  <p className="text-gray-500">Loading attendance data...</p>
                </div>
              )}

              {/* Attendance Matrix Table */}
              {!isLoadingAttendance &&
                filteredAttendanceData.sessionDates?.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="sticky left-0 bg-gray-50 text-left py-3 px-4 text-sm font-semibold border-b z-10 min-w-[120px]">
                            Student Name
                          </th>
                          <th className="sticky left-32 bg-gray-50 text-left py-3 px-4 text-sm font-semibold border-b z-10 min-w-[100px]">
                            Roll No
                          </th>
                          {filteredAttendanceData.sessionDates.map(
                            (date, index) => (
                              <th
                                key={date}
                                className="text-center py-3 px-2 text-xs font-semibold border-b min-w-[120px] group relative"
                                title={date}
                              >
                                <div>{date}</div>
                                {isTeacher && (
                                  <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                    <button
                                      onClick={() =>
                                        fetchAttendanceForEditing(
                                          filteredAttendanceData
                                            .sessionIsoDates[index]
                                        )
                                      }
                                      className="p-1 hover:bg-gray-200 rounded"
                                      title="Edit attendance for this date"
                                    >
                                      <Icons.Edit2 size={12} />
                                    </button>
                                    <button
                                      onClick={async () => {
                                        const isoDate =
                                          filteredAttendanceData
                                            .sessionIsoDates[index];
                                        const response = await fetch(
                                          `/api/classrooms/${classroom.id}/attendance/by-date?date=${isoDate}`
                                        );
                                        if (response.ok) {
                                          const data = await response.json();
                                          if (data.session?.id) {
                                            showModal(
                                              'warning',
                                              'Delete Attendance Session',
                                              `Are you sure you want to delete the attendance session for ${date}? This action cannot be undone.`,
                                              async () => {
                                                await deleteAttendanceSession(
                                                  data.session.id,
                                                  date
                                                );
                                              }
                                            );
                                          } else {
                                            setErrorMessage(
                                              `No attendance session found for ${date}`
                                            );
                                          }
                                        }
                                      }}
                                      className="p-1 hover:bg-gray-200 rounded text-red-600"
                                      title="Delete session"
                                    >
                                      <Icons.Trash2 size={12} />
                                    </button>
                                  </div>
                                )}
                              </th>
                            )
                          )}
                          <th className="text-center py-3 px-3 text-sm font-semibold border-b bg-blue-50 min-w-[80px]">
                            Total
                          </th>
                          <th className="text-center py-3 px-3 text-sm font-semibold border-b bg-green-50 min-w-[80px]">
                            %
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAttendanceData.students.map((student) => {
                          let presentCount = 0;
                          const sessionStatuses =
                            filteredAttendanceData.sessionDates.map((date) => {
                              const status = student.attendances[date];
                              if (status === 'present') {
                                presentCount++;
                                return 'P';
                              }
                              return 'A';
                            });
                          const badge = getStatusBadge(student.percentage);
                          return (
                            <tr
                              key={student.studentId}
                              className="border-b hover:bg-gray-50"
                            >
                              <td className="sticky left-0 bg-white py-3 px-4 border-r">
                                <p className="font-medium">
                                  {student.studentName}
                                </p>
                              </td>
                              <td className="sticky left-32 bg-white py-3 px-4 text-sm font-mono border-r">
                                {student.rollNumber || '-'}
                              </td>
                              {sessionStatuses.map((status, idx) => (
                                <td
                                  key={idx}
                                  className={`text-center py-3 px-2 text-sm font-semibold ${
                                    status === 'P'
                                      ? 'text-green-600 bg-green-50'
                                      : 'text-red-600 bg-red-50'
                                  }`}
                                >
                                  {status}
                                </td>
                              ))}
                              <td className="text-center py-3 px-3 text-sm font-bold bg-blue-50">
                                <span className="text-blue-700 font-semibold">
                                  {presentCount}
                                </span>
                              </td>
                              <td className="text-center py-3 px-3 text-sm font-bold">
                                <span
                                  className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${badge.bg}`}
                                >
                                  {student.percentage.toFixed(1)}%
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

              {!isLoadingAttendance &&
                filteredAttendanceData.sessionDates?.length === 0 && (
                  <div className="text-center py-12">
                    <Icons.Clipboard
                      size={48}
                      className="text-gray-300 mx-auto mb-3"
                    />
                    <p className="text-gray-500">
                      No attendance records found for the selected date range.
                    </p>
                    {isTeacher && (
                      <button
                        onClick={openTakeAttendanceModal}
                        className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                      >
                        Take First Attendance
                      </button>
                    )}
                  </div>
                )}
            </div>
          )}
        </div>
      </div>

      {/* Take Attendance Modal */}
      <AnimatePresence>
        {showAttendanceModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowAttendanceModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">
                    {isEditMode ? 'Edit Attendance' : 'Take Attendance'}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {classroom.name} - {isEditMode ? editingDate : today}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowAttendanceModal(false);
                    resetAttendanceForm();
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <Icons.X size={20} />
                </button>
              </div>

              <div className="p-6">
                {/* Session Details */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-gray-800 mb-3">
                    Session Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Date *
                      </label>
                      <input
                        type="date"
                        value={attendanceForm.date}
                        onChange={(e) =>
                          setAttendanceForm({
                            ...attendanceForm,
                            date: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Start Time
                      </label>
                      <input
                        type="time"
                        value={attendanceForm.startTime}
                        onChange={(e) =>
                          setAttendanceForm({
                            ...attendanceForm,
                            startTime: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        End Time
                      </label>
                      <input
                        type="time"
                        value={attendanceForm.endTime}
                        onChange={(e) =>
                          setAttendanceForm({
                            ...attendanceForm,
                            endTime: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Syllabus Covered
                    </label>
                    <textarea
                      rows={2}
                      value={attendanceForm.syllabusCovered}
                      onChange={(e) =>
                        setAttendanceForm({
                          ...attendanceForm,
                          syllabusCovered: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                      placeholder="Topics covered in today's session..."
                    />
                  </div>
                </div>

                {/* Bulk Actions */}
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-gray-800">
                    Student Attendance
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={markAllPresent}
                      className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 flex items-center gap-1"
                    >
                      <Icons.CheckSquare size={14} /> All Present
                    </button>
                    <button
                      onClick={markAllAbsent}
                      className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 flex items-center gap-1"
                    >
                      <Icons.X size={14} /> All Absent
                    </button>
                  </div>
                </div>

                {/* Attendance Table */}
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left py-3 px-4 w-10">
                          <input
                            type="checkbox"
                            checked={studentAttendance.every(
                              (s) => s.status === 'present'
                            )}
                            onChange={(e) =>
                              toggleAllAttendance(
                                e.target.checked ? 'present' : 'absent'
                              )
                            }
                            className="rounded border-gray-300 text-indigo-600"
                          />
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold">
                          Roll Number
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold">
                          Student Name
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold">
                          Status
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold">
                          Remarks
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentAttendance.map((student) => (
                        <tr
                          key={student.studentId}
                          className="border-b hover:bg-gray-50"
                        >
                          <td className="py-3 px-4">
                            <input
                              type="checkbox"
                              checked={student.status === 'present'}
                              onChange={() =>
                                toggleAttendance(student.studentId)
                              }
                              className="rounded border-gray-300 text-indigo-600"
                            />
                          </td>
                          <td className="py-3 px-4 text-sm">
                            {student.rollNumber || '-'}
                          </td>
                          <td className="py-3 px-4">
                            <p className="font-medium">{student.studentName}</p>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                                student.status === 'present'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {student.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <input
                              type="text"
                              placeholder="Remarks..."
                              value={student.remarks}
                              onChange={(e) =>
                                updateRemarks(student.studentId, e.target.value)
                              }
                              className="w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-indigo-500"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Summary */}
                <div className="mt-4 p-3 bg-gray-50 rounded-lg flex justify-between items-center">
                  <div>
                    <span className="text-sm text-gray-600">
                      Total: <strong>{studentAttendance.length}</strong>
                    </span>
                    <span className="text-sm text-gray-600 ml-4">
                      Present:{' '}
                      <strong className="text-green-600">
                        {
                          studentAttendance.filter(
                            (s) => s.status === 'present'
                          ).length
                        }
                      </strong>
                    </span>
                    <span className="text-sm text-gray-600 ml-4">
                      Absent:{' '}
                      <strong className="text-red-600">
                        {
                          studentAttendance.filter((s) => s.status === 'absent')
                            .length
                        }
                      </strong>
                    </span>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowAttendanceModal(false);
                        resetAttendanceForm();
                      }}
                      className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                      disabled={submitting}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveUpdatedAttendance}
                      disabled={submitting}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      {submitting ? (
                        <Icons.Loader2 size={18} className="animate-spin" />
                      ) : (
                        <Icons.Save size={18} />
                      )}
                      {submitting ? 'Saving...' : 'Save Attendance'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Modal */}
      <CustomModal
        isOpen={modal.isOpen}
        onClose={() => setModal({ ...modal, isOpen: false })}
        onConfirm={modal.onConfirm}
        title={modal.title}
        message={modal.message}
        type={modal.type}
      />
    </div>
  );
}
