// components/classroom/ClassroomDetailsClient.jsx
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as Icons from 'lucide-react';
import AcademicCalendar3D from '@/components/classroom/AcademicCalendar3D';

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
                  onClick={async () => {
                    if (onConfirm) await onConfirm();
                    onClose();
                  }}
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
  const [showAcademicCalendar, setShowAcademicCalendar] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Attendance form
  const [attendanceForm, setAttendanceForm] = useState({
    date: new Date().toISOString().split('T')[0],
    startTime: '',
    endTime: '',
    syllabusCovered: '',
  });
  const [studentAttendance, setStudentAttendance] = useState([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingDate, setEditingDate] = useState('');
  const [editingSessionId, setEditingSessionId] = useState(null);

  // Date range filter
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [filteredAttendanceData, setFilteredAttendanceData] = useState({
    students: [],
    sessionDates: [],
    sessionIsoDates: [],
  });
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(false);

  // Modal state
  const [modal, setModal] = useState({
    isOpen: false,
    type: 'confirm',
    title: '',
    message: '',
    onConfirm: null,
  });

  // Auto-dismiss messages
  useEffect(() => {
    if (successMessage) {
      const t = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(t);
    }
  }, [successMessage]);
  useEffect(() => {
    if (errorMessage) {
      const t = setTimeout(() => setErrorMessage(null), 3000);
      return () => clearTimeout(t);
    }
  }, [errorMessage]);

  // Get active students sorted by name
  const getActiveStudentsSorted = () => {
    const active =
      classroom.enrolledStudents?.filter(
        (s) => s.enrollmentStatus === 'active'
      ) || [];
    return [...active].sort((a, b) =>
      (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase())
    );
  };

  const activeStudents = getActiveStudentsSorted();
  const activeStudentIds = new Set(activeStudents.map((s) => s.id));

  // Fetch attendance data
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
      let totalPresent = 0,
        totalPossible = 0;

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
          totalPresent++;
        }
        totalPossible++;
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

      const studentsWithStats = Object.values(attendanceByStudent).map((s) => ({
        ...s,
        percentage:
          s.totalSessions > 0 ? (s.presentCount / s.totalSessions) * 100 : 0,
      }));

      // Add active students with no attendance
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

      studentsWithStats.sort((a, b) =>
        (a.studentName || '')
          .toLowerCase()
          .localeCompare((b.studentName || '').toLowerCase())
      );

      setFilteredAttendanceData({
        students: studentsWithStats,
        sessionDates,
        sessionIsoDates,
      });
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setIsLoadingAttendance(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'attendance') fetchFilteredAttendance();
  }, [fromDate, toDate, activeTab]);

  // Attendance CRUD
  const initializeAttendanceList = () => {
    const list = getActiveStudentsSorted().map((s) => ({
      studentId: s.id,
      studentName: s.name,
      rollNumber: s.rollNumber,
      status: 'present',
      remarks: '',
    }));
    list.sort((a, b) =>
      (a.studentName || '')
        .toLowerCase()
        .localeCompare((b.studentName || '').toLowerCase())
    );
    setStudentAttendance(list);
  };

  const fetchAttendanceForEditing = async (isoDate) => {
    setIsLoadingAttendance(true);
    try {
      const response = await fetch(
        `/api/classrooms/${classroom.id}/attendance/by-date?date=${isoDate}`
      );
      if (!response.ok) throw new Error('Failed to fetch attendance');
      const data = await response.json();
      const activeIds = new Set(getActiveStudentsSorted().map((s) => s.id));
      const filtered = data.attendances.filter((att) =>
        activeIds.has(att.studentId)
      );

      if (data.session?.id) {
        setEditingSessionId(data.session.id);
        setIsEditMode(true);
        setEditingDate(new Date(isoDate).toLocaleDateString());
        const list = filtered.map((att) => ({
          studentId: att.studentId,
          studentName: att.studentName,
          rollNumber: att.rollNumber,
          status: att.status,
          remarks: att.remarks,
        }));
        list.sort((a, b) =>
          (a.studentName || '')
            .toLowerCase()
            .localeCompare((b.studentName || '').toLowerCase())
        );
        setStudentAttendance(list);
      } else {
        initializeAttendanceList();
        setIsEditMode(false);
        setEditingSessionId(null);
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
      setErrorMessage(err.message);
    } finally {
      setIsLoadingAttendance(false);
    }
  };

  const saveAttendance = async () => {
    if (!attendanceForm.date) {
      setErrorMessage('Please select a date');
      return;
    }
    setSubmitting(true);
    try {
      const formattedDate = new Date(attendanceForm.date)
        .toISOString()
        .split('T')[0];
      const url =
        isEditMode && editingSessionId
          ? `/api/classrooms/${classroom.id}/attendance/session/${editingSessionId}`
          : `/api/classrooms/${classroom.id}/attendance`;
      const method = isEditMode && editingSessionId ? 'PUT' : 'POST';

      const body =
        isEditMode && editingSessionId
          ? {
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
            }
          : {
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

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error);
      }

      setSuccessMessage(
        `Attendance ${editingSessionId ? 'updated' : 'marked'} successfully!`
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
      const response = await fetch(
        `/api/classrooms/${classroom.id}/attendance/session/${sessionId}`,
        { method: 'DELETE' }
      );
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error);
      }
      setSuccessMessage(`Attendance session for ${displayDate} deleted!`);
      refreshPage();
      setTimeout(() => fetchFilteredAttendance(), 500);
    } catch (err) {
      setErrorMessage(err.message);
    }
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
      prev.map((s) =>
        s.studentId === studentId
          ? { ...s, status: s.status === 'present' ? 'absent' : 'present' }
          : s
      )
    );
  };

  const toggleAllAttendance = (status) =>
    setStudentAttendance((prev) => prev.map((s) => ({ ...s, status })));
  const markAllPresent = () => toggleAllAttendance('present');
  const markAllAbsent = () => toggleAllAttendance('absent');
  const updateRemarks = (studentId, remarks) =>
    setStudentAttendance((prev) =>
      prev.map((s) => (s.studentId === studentId ? { ...s, remarks } : s))
    );

  // Export CSV
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
    const sorted = [...filteredAttendanceData.students].sort((a, b) =>
      (a.studentName || '')
        .toLowerCase()
        .localeCompare((b.studentName || '').toLowerCase())
    );
    const rows = sorted.map((student) => {
      let presentCount = 0;
      const statuses = filteredAttendanceData.sessionDates.map((date) => {
        if (student.attendances[date] === 'present') {
          presentCount++;
          return 'P';
        }
        return 'A';
      });
      return [
        student.studentName,
        student.rollNumber || '-',
        ...statuses,
        presentCount,
        student.totalSessions,
        student.percentage.toFixed(2),
      ];
    });
    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `attendance_${
      classroom.name
    }_${new Date().toLocaleDateString()}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    setSuccessMessage('Report exported!');
  };

  const showModal = (type, title, message, onConfirm) => {
    setModal({
      isOpen: true,
      type,
      title,
      message,
      onConfirm: async () => {
        if (onConfirm) await onConfirm();
        setModal((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const refreshPage = () => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const formatDate = (d) => (d ? new Date(d).toLocaleDateString() : '-');
  const getStatusBadge = (p) => {
    if (p >= 75) return 'bg-green-100 text-green-800';
    if (p >= 60) return 'bg-yellow-100 text-yellow-800';
    if (p >= 40) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="space-y-6">
      {/* Refreshing Overlay */}
      {isRefreshing && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 flex items-center gap-3 shadow-lg">
            <Icons.Loader2 size={24} className="animate-spin text-indigo-600" />
            <span className="text-gray-700">Refreshing...</span>
          </div>
        </div>
      )}

      {/* Toast Messages */}
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
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 bg-white px-4 py-2 rounded-lg shadow-sm"
      >
        <Icons.ArrowLeft size={20} /> Back to Classrooms
      </Link>

      {/* Course Info Card */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-6">
          <div className="flex justify-between items-start flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white">
                {classroom.name}
              </h1>
              <p className="text-indigo-100 text-lg">
                {classroom.course?.name || 'No Course'}
              </p>
              {classroom.course?.code && (
                <p className="text-indigo-200 text-sm">
                  Code: {classroom.course.code}
                </p>
              )}
            </div>
            <div className="flex gap-3">
              {isTeacher && (
                <>
                  <button
                    onClick={() => {
                      resetAttendanceForm();
                      initializeAttendanceList();
                      setShowAttendanceModal(true);
                    }}
                    className="px-4 py-2 bg-white text-indigo-600 rounded-lg hover:bg-gray-100 font-medium flex items-center gap-2 shadow-md"
                  >
                    <Icons.CheckSquare size={18} /> Take Attendance
                  </button>
                  <button
                    onClick={() => setShowAcademicCalendar(true)}
                    className="px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 font-medium flex items-center gap-2"
                  >
                    <Icons.CalendarDays size={18} /> Calendar
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              icon: Icons.User,
              color: 'bg-indigo-100 text-indigo-600',
              label: 'Faculty',
              value: classroom.faculty?.name || 'Not assigned',
            },
            {
              icon: Icons.GraduationCap,
              color: 'bg-green-100 text-green-600',
              label: 'Batch',
              value: classroom.batch?.name || 'Not assigned',
            },
            {
              icon: Icons.Users,
              color: 'bg-blue-100 text-blue-600',
              label: 'Enrolled',
              value: `${classroom._count?.enrollments || 0} Students`,
            },
            {
              icon: Icons.Calendar,
              color: 'bg-purple-100 text-purple-600',
              label: 'Sessions',
              value: `${classroom._count?.sessions || 0} Held`,
            },
          ].map((stat, i) => (
            <div key={i} className="flex items-center gap-3">
              <div
                className={`w-12 h-12 ${
                  stat.color.split(' ')[0]
                } rounded-xl flex items-center justify-center`}
              >
                <stat.icon size={22} className={stat.color.split(' ')[1]} />
              </div>
              <div>
                <p className="text-xs text-gray-500">{stat.label}</p>
                <p className="font-semibold">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="border-b px-6">
          <div className="flex gap-8">
            {[
              {
                id: 'students',
                icon: Icons.Users,
                label: 'Students',
                count: activeStudents.length,
              },
              {
                id: 'attendance',
                icon: Icons.Clipboard,
                label: 'Attendance Report',
              },
              {
                id: 'calendar',
                icon: Icons.CalendarDays,
                label: 'Academic Calendar',
              },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'text-indigo-600 border-indigo-600'
                    : 'text-gray-500 border-transparent hover:text-gray-700'
                }`}
              >
                <tab.icon size={16} /> {tab.label}{' '}
                {tab.count !== undefined && `(${tab.count})`}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {/* Students Tab */}
          {activeTab === 'students' && (
            <div>
              {activeStudents.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        {['Roll No', 'Name', 'Email', 'Enrolled', 'Status'].map(
                          (h) => (
                            <th
                              key={h}
                              className="text-left py-3 px-4 text-sm font-semibold"
                            >
                              {h}
                            </th>
                          )
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {activeStudents.map((s) => (
                        <tr key={s.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4 text-sm font-mono">
                            {s.rollNumber || '-'}
                          </td>
                          <td className="py-3 px-4 font-medium">{s.name}</td>
                          <td className="py-3 px-4 text-sm">{s.email}</td>
                          <td className="py-3 px-4 text-sm">
                            {formatDate(s.enrolledAt)}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
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
                  <p className="text-gray-500">No active students enrolled.</p>
                </div>
              )}
            </div>
          )}

          {/* Attendance Tab */}
          {activeTab === 'attendance' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Attendance Report</h3>
                <button
                  onClick={exportAttendanceReport}
                  disabled={!filteredAttendanceData.students.length}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                >
                  <Icons.Download size={18} /> Export
                </button>
              </div>

              {/* Date Filter */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex flex-wrap gap-4 items-end">
                  <div className="flex-1 min-w-[150px]">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      From
                    </label>
                    <input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div className="flex-1 min-w-[150px]">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      To
                    </label>
                    <input
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <button
                    onClick={() => {
                      setFromDate('');
                      setToDate('');
                    }}
                    className="px-4 py-2 text-gray-600 border rounded-lg hover:bg-gray-100"
                  >
                    <Icons.X size={16} /> Clear
                  </button>
                </div>
              </div>

              {/* Loading */}
              {isLoadingAttendance && (
                <div className="text-center py-12">
                  <Icons.Loader2
                    size={48}
                    className="animate-spin text-indigo-600 mx-auto mb-4"
                  />
                  <p>Loading...</p>
                </div>
              )}

              {/* Attendance Table */}
              {!isLoadingAttendance &&
                filteredAttendanceData.sessionDates.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="sticky left-0 bg-gray-50 text-left py-3 px-4 text-sm font-semibold border-b z-10">
                            Student
                          </th>
                          <th className="sticky left-32 bg-gray-50 text-left py-3 px-4 text-sm font-semibold border-b z-10">
                            Roll No
                          </th>
                          {filteredAttendanceData.sessionDates.map(
                            (date, i) => (
                              <th
                                key={date}
                                className="text-center py-3 px-2 text-xs font-semibold border-b min-w-[100px] group relative"
                              >
                                <div>
                                  {new Date(
                                    filteredAttendanceData.sessionIsoDates[i]
                                  ).getDate()}
                                  /
                                  {new Date(
                                    filteredAttendanceData.sessionIsoDates[i]
                                  ).getMonth() + 1}
                                </div>
                                {isTeacher && (
                                  <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                    <button
                                      onClick={() =>
                                        fetchAttendanceForEditing(
                                          filteredAttendanceData
                                            .sessionIsoDates[i]
                                        )
                                      }
                                      className="p-1 hover:bg-gray-200 rounded"
                                      title="Edit"
                                    >
                                      <Icons.Edit2 size={12} />
                                    </button>
                                    <button
                                      onClick={async () => {
                                        const r = await fetch(
                                          `/api/classrooms/${classroom.id}/attendance/by-date?date=${filteredAttendanceData.sessionIsoDates[i]}`
                                        );
                                        if (r.ok) {
                                          const d = await r.json();
                                          if (d.session?.id)
                                            showModal(
                                              'warning',
                                              'Delete Session',
                                              `Delete attendance for ${date}?`,
                                              () =>
                                                deleteAttendanceSession(
                                                  d.session.id,
                                                  date
                                                )
                                            );
                                        }
                                      }}
                                      className="p-1 hover:bg-gray-200 rounded text-red-600"
                                      title="Delete"
                                    >
                                      <Icons.Trash2 size={12} />
                                    </button>
                                  </div>
                                )}
                              </th>
                            )
                          )}
                          <th className="text-center py-3 px-3 text-sm font-semibold border-b bg-blue-50">
                            Total
                          </th>
                          <th className="text-center py-3 px-3 text-sm font-semibold border-b bg-green-50">
                            %
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAttendanceData.students.map((student) => {
                          let presentCount = 0;
                          const statuses =
                            filteredAttendanceData.sessionDates.map((date) => {
                              if (student.attendances[date] === 'present') {
                                presentCount++;
                                return 'P';
                              }
                              return 'A';
                            });
                          return (
                            <tr
                              key={student.studentId}
                              className="border-b hover:bg-gray-50"
                            >
                              <td className="sticky left-0 bg-white py-3 px-4 border-r font-medium">
                                {student.studentName}
                              </td>
                              <td className="sticky left-32 bg-white py-3 px-4 text-sm font-mono border-r">
                                {student.rollNumber || '-'}
                              </td>
                              {statuses.map((s, i) => (
                                <td
                                  key={i}
                                  className={`text-center py-3 px-2 text-sm font-semibold ${
                                    s === 'P'
                                      ? 'text-green-600 bg-green-50'
                                      : 'text-red-600 bg-red-50'
                                  }`}
                                >
                                  {s}
                                </td>
                              ))}
                              <td className="text-center py-3 px-3 text-sm font-bold bg-blue-50">
                                {presentCount}
                              </td>
                              <td className="text-center py-3 px-3 text-sm font-bold">
                                <span
                                  className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(
                                    student.percentage
                                  )}`}
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
                filteredAttendanceData.sessionDates.length === 0 && (
                  <div className="text-center py-12">
                    <Icons.Clipboard
                      size={48}
                      className="text-gray-300 mx-auto mb-3"
                    />
                    <p className="text-gray-500">
                      No attendance records found.
                    </p>
                    {isTeacher && (
                      <button
                        onClick={() => {
                          initializeAttendanceList();
                          setShowAttendanceModal(true);
                        }}
                        className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg"
                      >
                        Take First Attendance
                      </button>
                    )}
                  </div>
                )}
            </div>
          )}

          {/* Calendar Tab */}
          {activeTab === 'calendar' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Academic Calendar</h3>
                <button
                  onClick={() => setShowAcademicCalendar(true)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
                >
                  <Icons.Expand size={16} /> Open Full Calendar
                </button>
              </div>
              <div className="text-center py-12 bg-gray-50 rounded-xl">
                <Icons.CalendarDays
                  size={48}
                  className="text-gray-300 mx-auto mb-3"
                />
                <p className="text-gray-500">
                  Click the button above to open the full academic calendar
                </p>
                <p className="text-gray-400 text-sm mt-1">
                  Manage events, notices, and view attendance summary
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Attendance Modal */}
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
                  <h2 className="text-xl font-bold">
                    {isEditMode ? 'Edit Attendance' : 'Take Attendance'}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {classroom.name} -{' '}
                    {isEditMode ? editingDate : new Date().toLocaleDateString()}
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
                  <h3 className="font-semibold mb-3">Session Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
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
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Start
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
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        End
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
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className="block text-sm font-medium mb-1">
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
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="Topics covered..."
                    />
                  </div>
                </div>

                {/* Bulk Actions */}
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold">Students</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={markAllPresent}
                      className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-lg"
                    >
                      <Icons.CheckSquare size={14} /> All Present
                    </button>
                    <button
                      onClick={markAllAbsent}
                      className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-lg"
                    >
                      <Icons.X size={14} /> All Absent
                    </button>
                  </div>
                </div>

                {/* Student List */}
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="py-2 px-4 text-left text-sm">Roll No</th>
                        <th className="py-2 px-4 text-left text-sm">Name</th>
                        <th className="py-2 px-4 text-center text-sm w-24">
                          Status
                        </th>
                        <th className="py-2 px-4 text-left text-sm">Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentAttendance.map((s) => (
                        <tr
                          key={s.studentId}
                          className="border-t hover:bg-gray-50"
                        >
                          <td className="py-2 px-4 text-sm">
                            {s.rollNumber || '-'}
                          </td>
                          <td className="py-2 px-4 font-medium">
                            {s.studentName}
                          </td>
                          <td className="py-2 px-4 text-center">
                            <button
                              onClick={() => toggleAttendance(s.studentId)}
                              className={`px-3 py-1 rounded-full text-xs font-medium ${
                                s.status === 'present'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {s.status.toUpperCase()}
                            </button>
                          </td>
                          <td className="py-2 px-4">
                            <input
                              type="text"
                              value={s.remarks}
                              onChange={(e) =>
                                updateRemarks(s.studentId, e.target.value)
                              }
                              className="w-full px-2 py-1 text-sm border rounded"
                              placeholder="Remarks..."
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Summary & Actions */}
                <div className="mt-4 p-3 bg-gray-50 rounded-lg flex justify-between items-center">
                  <div className="flex gap-4 text-sm">
                    <span>
                      Total: <strong>{studentAttendance.length}</strong>
                    </span>
                    <span>
                      Present:{' '}
                      <strong className="text-green-600">
                        {
                          studentAttendance.filter(
                            (s) => s.status === 'present'
                          ).length
                        }
                      </strong>
                    </span>
                    <span>
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
                      className="px-4 py-2 border rounded-lg"
                      disabled={submitting}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveAttendance}
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

      {/* Academic Calendar Modal */}
      <AnimatePresence>
        {showAcademicCalendar && (
          <AcademicCalendar3D
            classroomId={classroom.id}
            batchId={classroom.batchId}
            isOpen={showAcademicCalendar}
            onClose={() => setShowAcademicCalendar(false)}
          />
        )}
      </AnimatePresence>

      {/* Custom Modal */}
      <CustomModal
        isOpen={modal.isOpen}
        onClose={() => setModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={modal.onConfirm}
        title={modal.title}
        message={modal.message}
        type={modal.type}
      />
    </div>
  );
}
