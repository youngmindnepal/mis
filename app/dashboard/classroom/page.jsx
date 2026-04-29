// app/classrooms/page.jsx
'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import ClassroomFormModal from '@/components/classroom/ClassroomFormModal';
import AttendanceSummaryReport from '@/components/classroom/AttendanceSummaryReport';
import AcademicCalendar3D from '@/components/classroom/AcademicCalendar3D';
import { Calendar } from 'lucide-react';

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

const BatchAccordion = ({
  batch,
  classrooms,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
  onOpenCalendar,
  hasUpdatePermission,
  hasDeletePermission,
  studentCount,
}) => {
  const activeClassrooms = classrooms.filter((c) => c.status !== 'archived');
  const totalSessions = classrooms.reduce(
    (sum, c) => sum + (c._count?.sessions || 0),
    0
  );

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
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
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer"
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
            </p>
          </div>
        </div>
        <div
          className="flex items-center gap-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-2 text-sm">
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {activeClassrooms.length} Room
              {activeClassrooms.length !== 1 ? 's' : ''}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              {studentCount} Active Student{studentCount !== 1 ? 's' : ''}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              {totalSessions} Session{totalSessions !== 1 ? 's' : ''}
            </span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenCalendar(null, batch.id);
            }}
            className="px-3 py-1.5 text-xs bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 flex items-center gap-1.5 transition-colors"
            title="Open Batch Calendar"
          >
            <Icons.CalendarDays size={14} /> Batch Calendar
          </button>
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${
              batch.status === 'active'
                ? 'bg-green-100 text-green-800'
                : batch.status === 'completed'
                ? 'bg-gray-100 text-gray-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {batch.status}
          </span>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="border-t border-gray-200">
              {classrooms.length === 0 ? (
                <div className="text-center py-12">
                  <Icons.BookOpen
                    size={48}
                    className="text-gray-300 mx-auto mb-3"
                  />
                  <p className="text-gray-500">No classrooms in this batch</p>
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
                      {classrooms.map((classroom) => (
                        <tr
                          key={classroom.id}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                                <Icons.BookOpen
                                  size={18}
                                  className="text-white"
                                />
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
                                classroom.status === 'active'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
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
                                title="View Details"
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
                                title="Classroom Calendar"
                              >
                                <Icons.CalendarDays size={16} />
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
                                  onClick={() => onDelete(classroom.id)}
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
    </div>
  );
};

export default function ClassroomPage() {
  const { can, isLoading: permissionsLoading } = usePermissions();
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingClassroom, setEditingClassroom] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [showAttendanceReport, setShowAttendanceReport] = useState(false);
  const [showAcademicCalendar, setShowAcademicCalendar] = useState(false);
  const [calendarClassroomId, setCalendarClassroomId] = useState(null);
  const [calendarBatchId, setCalendarBatchId] = useState(null);
  const [groupedClassrooms, setGroupedClassrooms] = useState({});
  const [batchStudentCounts, setBatchStudentCounts] = useState({});
  const [expandedBatches, setExpandedBatches] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandAll, setExpandAll] = useState(false);

  const hasReadPermission = can('classroom', 'read');
  const hasCreatePermission = can('classroom', 'create');
  const hasUpdatePermission = can('classroom', 'update');
  const hasDeletePermission = can('classroom', 'delete');

  const handleOpenCalendar = (classroomId = null, batchId = null) => {
    setCalendarClassroomId(classroomId);
    setCalendarBatchId(batchId);
    setShowAcademicCalendar(true);
  };

  const fetchClassrooms = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        '/api/classrooms?include=batch,course,faculty,_count'
      );
      if (response.ok) {
        const data = await response.json();
        const classrooms = data.classrooms || data || [];
        const grouped = {};
        const batchIds = new Set();

        classrooms.forEach((classroom) => {
          const batchKey = classroom.batchId
            ? classroom.batchId.toString()
            : 'unassigned';
          if (classroom.batchId) batchIds.add(classroom.batchId);
          if (!grouped[batchKey]) {
            grouped[batchKey] = {
              batch: classroom.batch || {
                id: 'unassigned',
                name: 'Unassigned',
                status: 'active',
              },
              classrooms: [],
            };
          }
          grouped[batchKey].classrooms.push(classroom);
        });

        Object.keys(grouped).forEach((key) =>
          grouped[key].classrooms.sort((a, b) => a.name.localeCompare(b.name))
        );
        setGroupedClassrooms(grouped);

        const batchKeys = Object.keys(grouped);
        if (batchKeys.length > 0 && Object.keys(expandedBatches).length === 0) {
          setExpandedBatches({ [batchKeys[0]]: true });
        }

        // Fetch active student counts per batch
        const studentCounts = {};
        for (const bid of batchIds) {
          try {
            const res = await fetch(`/api/batches/${bid}/students`);
            if (res.ok) {
              const studentsData = await res.json();
              const students = studentsData.students || studentsData || [];
              const activeCount = Array.isArray(students)
                ? students.filter((s) => !s.status || s.status === 'active')
                    .length
                : studentsData.count || students.length || 0;
              studentCounts[bid] = activeCount;
            } else {
              studentCounts[bid] =
                grouped[bid.toString()]?.classrooms?.reduce(
                  (sum, c) => sum + (c._count?.enrollments || 0),
                  0
                ) || 0;
            }
          } catch (e) {
            studentCounts[bid] =
              grouped[bid.toString()]?.classrooms?.reduce(
                (sum, c) => sum + (c._count?.enrollments || 0),
                0
              ) || 0;
          }
        }
        setBatchStudentCounts(studentCounts);
      }
    } catch (error) {
      console.error('Error fetching classrooms:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (hasReadPermission) fetchClassrooms();
  }, [hasReadPermission, refreshTrigger, fetchClassrooms]);

  const showMessage = (message, type = 'success') => {
    if (type === 'success') {
      setSuccessMessage(message);
      setTimeout(() => setSuccessMessage(null), 3000);
    } else {
      setErrorMessage(message);
      setTimeout(() => setErrorMessage(null), 3000);
    }
  };

  const handleRefresh = useCallback(
    () => setRefreshTrigger((prev) => prev + 1),
    []
  );
  const toggleBatch = (batchKey) =>
    setExpandedBatches((prev) => ({ ...prev, [batchKey]: !prev[batchKey] }));
  const toggleAllBatches = () => {
    const newExpandAll = !expandAll;
    setExpandAll(newExpandAll);
    const newExpanded = {};
    Object.keys(groupedClassrooms).forEach((key) => {
      newExpanded[key] = newExpandAll;
    });
    setExpandedBatches(newExpanded);
  };

  const handleCreateClassroom = async (formData) => {
    if (!hasCreatePermission) {
      showMessage("You don't have permission to create classrooms", 'error');
      return;
    }
    try {
      setFormLoading(true);
      const response = await fetch('/api/classrooms', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        let em = 'Failed';
        try {
          em = (await response.json()).error || em;
        } catch (e) {}
        throw new Error(em);
      }
      showMessage('Classroom created!', 'success');
      setIsFormModalOpen(false);
      handleRefresh();
    } catch (err) {
      showMessage(err.message, 'error');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteClassroom = async (classroomId) => {
    if (!confirm('Delete this classroom?')) return;
    try {
      const response = await fetch(`/api/classrooms/${classroomId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete');
      showMessage('Classroom deleted!', 'success');
      handleRefresh();
    } catch (err) {
      showMessage(err.message, 'error');
    }
  };

  const filteredBatches = Object.entries(groupedClassrooms).filter(
    ([, data]) => {
      const batchName = data.batch?.name?.toLowerCase() || '';
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm ||
        batchName.includes(searchLower) ||
        data.classrooms.some(
          (c) =>
            c.name?.toLowerCase().includes(searchLower) ||
            c.course?.name?.toLowerCase().includes(searchLower) ||
            c.course?.code?.toLowerCase().includes(searchLower)
        );
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && data.batch?.status === 'active') ||
        (statusFilter === 'inactive' && data.batch?.status !== 'active');
      return matchesSearch && matchesStatus;
    }
  );

  const getBatchStudentCount = (batchKey, batchId) => {
    if (batchStudentCounts[batchId] !== undefined)
      return batchStudentCounts[batchId];
    const data = groupedClassrooms[batchKey];
    if (!data) return 0;
    return data.classrooms.reduce(
      (sum, c) => sum + (c._count?.enrollments || 0),
      0
    );
  };

  const totalStudents = useMemo(
    () =>
      Object.values(batchStudentCounts).reduce((sum, count) => sum + count, 0),
    [batchStudentCounts]
  );

  if (permissionsLoading)
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <LoadingState />
        </div>
      </div>
    );

  if (!hasReadPermission)
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
            <Icons.Lock size={32} className="text-red-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-red-800 mb-2">
              Access Denied
            </h2>
            <p className="text-red-600">
              You don't have permission to view classrooms.
            </p>
          </div>
        </div>
      </div>
    );

  const totalBatches = Object.keys(groupedClassrooms).length;
  const totalClassrooms = Object.values(groupedClassrooms).reduce(
    (sum, d) => sum + d.classrooms.length,
    0
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
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            className="fixed top-20 right-6 z-50 bg-red-50 border-l-4 border-red-500 text-red-800 px-4 py-3 rounded-lg shadow-lg min-w-[280px]"
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

      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4">
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
                  Grouped by batch with academic calendar
                </p>
              </div>
              <div className="flex gap-3 flex-wrap">
                <button
                  onClick={handleRefresh}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
                >
                  <Icons.RefreshCw size={18} /> Refresh
                </button>
                <button
                  onClick={() => handleOpenCalendar(null, null)}
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 flex items-center gap-2"
                >
                  <Icons.CalendarDays size={18} /> Global Calendar
                </button>
                <button
                  onClick={() => setShowAttendanceReport(true)}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
                >
                  <Icons.BarChart3 size={18} /> Report
                </button>
                {hasCreatePermission && (
                  <button
                    onClick={() => {
                      setEditingClassroom(null);
                      setIsFormModalOpen(true);
                    }}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
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
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="grid grid-cols-3 gap-4">
          {[
            {
              icon: Icons.Layers,
              color: 'bg-indigo-100 text-indigo-600',
              label: 'Total Batches',
              value: totalBatches,
            },
            {
              icon: Icons.BookOpen,
              color: 'bg-blue-100 text-blue-600',
              label: 'Total Classrooms',
              value: totalClassrooms,
            },
            {
              icon: Icons.Users,
              color: 'bg-green-100 text-green-600',
              label: 'Total Active Students',
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
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="all">All Batches</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
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
            <p className="text-gray-500">No classrooms found</p>
            {hasCreatePermission && (
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
            {filteredBatches.map(([batchKey, data]) => (
              <BatchAccordion
                key={batchKey}
                batch={data.batch}
                classrooms={data.classrooms}
                isExpanded={!!expandedBatches[batchKey]}
                onToggle={() => toggleBatch(batchKey)}
                onEdit={(classroom) => {
                  setEditingClassroom(classroom);
                  setIsFormModalOpen(true);
                }}
                onDelete={handleDeleteClassroom}
                onOpenCalendar={handleOpenCalendar}
                hasUpdatePermission={hasUpdatePermission}
                hasDeletePermission={hasDeletePermission}
                studentCount={getBatchStudentCount(batchKey, data.batch.id)}
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
        onSubmit={handleCreateClassroom}
        initialData={editingClassroom}
        loading={formLoading}
      />
      <AnimatePresence>
        {showAttendanceReport && (
          <AttendanceSummaryReport
            onClose={() => setShowAttendanceReport(false)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showAcademicCalendar && (
          <AcademicCalendar3D
            classroomId={calendarClassroomId}
            batchId={calendarBatchId}
            isOpen={showAcademicCalendar}
            onClose={() => setShowAcademicCalendar(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
