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

// Custom Confirmation Modal
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

  // Determine effective batch status based on classrooms
  const allClassroomsArchived =
    classrooms.length > 0 && activeClassrooms.length === 0;
  const effectiveStatus = allClassroomsArchived
    ? 'inactive'
    : batch.status || 'active';

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
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors "
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
        let s = '',
          ed = '';
        if (ss) s = new Date(ss.date).toISOString().split('T')[0];
        if (se) ed = new Date(se.date).toISOString().split('T')[0];
        if (s || ed) {
          setSemesterDates({ startDate: s, endDate: ed });
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
      const y = n.getFullYear();
      setSemesterDates({
        startDate: n.getMonth() < 6 ? `${y - 1}-07-01` : `${y}-07-01`,
        endDate: n.getMonth() < 6 ? `${y}-06-30` : `${y + 1}-06-30`,
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
  const [groupedClassrooms, setGroupedClassrooms] = useState({});
  const [batchStudentCounts, setBatchStudentCounts] = useState({});
  const [expandedBatches, setExpandedBatches] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [batchStatusFilter, setBatchStatusFilter] = useState('active');
  const [expandAll, setExpandAll] = useState(false);
  const [showELibrary, setShowELibrary] = useState(false);
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
        Object.keys(grouped).forEach((k) =>
          grouped[k].classrooms.sort((a, b) => a.name.localeCompare(b.name))
        );
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

  // Helper: determine effective batch status based on its classrooms
  const getEffectiveBatchStatus = (batchData) => {
    const batchStatus = batchData.batch?.status || 'active';
    const classrooms = batchData.classrooms || [];
    const hasActiveClassrooms = classrooms.some(
      (c) => !c.status || c.status === 'active'
    );
    // If batch is active but has no active classrooms, treat as inactive
    if (
      batchStatus === 'active' &&
      classrooms.length > 0 &&
      !hasActiveClassrooms
    ) {
      return 'inactive';
    }
    return batchStatus;
  };

  // Filter batches by effective status (active/inactive/all) AND search term
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

  // Compute stats based on effective status
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

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="grid grid-cols-4 gap-4">
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

      {/* Search & Filter Bar */}
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

            {/* Batch Status Filter */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setBatchStatusFilter('active')}
                className={`cursor-pointer px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  batchStatusFilter === 'active'
                    ? 'bg-green-500 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <Icons.CheckCircle size={12} className="inline mr-1" />
                Active ({activeBatches})
              </button>
              <button
                onClick={() => setBatchStatusFilter('inactive')}
                className={`cursor-pointer px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  batchStatusFilter === 'inactive'
                    ? 'bg-gray-500 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <Icons.Archive size={12} className="inline mr-1" />
                Inactive ({inactiveBatches})
              </button>
              <button
                onClick={() => setBatchStatusFilter('all')}
                className={`cursor-pointer px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  batchStatusFilter === 'all'
                    ? 'bg-indigo-500 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <Icons.Layers size={12} className="inline mr-1" />
                All ({allBatches})
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

      {/* Classroom List */}
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
<style jsx global>{`
  button {
    cursor: pointer;
  }
  button:disabled {
    cursor: not-allowed;
  }
  [role='button'] {
    cursor: pointer;
  }
  a {
    cursor: pointer;
  }
  input[type='text'],
  input[type='number'],
  input[type='date'],
  input[type='search'],
  select,
  textarea {
    cursor: text;
  }
  input[type='text']:disabled,
  input[type='number']:disabled,
  input[type='date']:disabled,
  input[type='search']:disabled,
  select:disabled,
  textarea:disabled {
    cursor: not-allowed;
  }
  input[type='date'] {
    cursor: pointer;
  }
  .cursor-pointer {
    cursor: pointer;
  }
  .cursor-not-allowed {
    cursor: not-allowed;
  }
`}</style>;
