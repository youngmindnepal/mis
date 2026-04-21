// components/exam/ExamManager.jsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import * as Icons from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ExamManager({
  onRefresh,
  onEdit,
  onDelete,
  onDeleteGroup,
  onEnterResult,
  onPublishResults,
  hasUpdatePermission,
  hasDeletePermission,
  hasResultPermission,
  hasCreatePermission,
  onQuickCreate,
}) {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [expandedMatrixGroups, setExpandedMatrixGroups] = useState({});
  const [searchTerm, setSearchTerm] = useState('');

  // Quick create state (for empty cell clicks)
  const [quickCreateModal, setQuickCreateModal] = useState({
    isOpen: false,
    groupName: '',
    date: '',
    startTime: null,
    endTime: null,
    groupData: null,
  });

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/exams');
      if (response.ok) {
        const data = await response.json();
        const examsWithDynamicStatus = data.map(calculateExamStatus);
        setExams(
          Array.isArray(examsWithDynamicStatus) ? examsWithDynamicStatus : []
        );
      }
    } catch (error) {
      console.error('Error fetching exams:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateExamStatus = (exam) => {
    if (exam.status === 'result_published') {
      return { ...exam, displayStatus: 'result_published' };
    }

    const now = new Date();
    const examDate = new Date(exam.date);
    const examStartTime = exam.startTime ? new Date(exam.startTime) : null;
    const examEndTime = exam.endTime ? new Date(exam.endTime) : null;

    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const examDay = new Date(
      examDate.getFullYear(),
      examDate.getMonth(),
      examDate.getDate()
    );

    let dynamicStatus = 'scheduled';

    if (examDay < today) {
      if (examEndTime && now > examEndTime) {
        dynamicStatus = 'completed';
      } else {
        dynamicStatus = 'scheduled';
      }
    } else if (examDay.getTime() === today.getTime()) {
      if (examStartTime && examEndTime) {
        if (now < examStartTime) {
          dynamicStatus = 'scheduled';
        } else if (now >= examStartTime && now <= examEndTime) {
          dynamicStatus = 'ongoing';
        } else if (now > examEndTime) {
          dynamicStatus = 'completed';
        }
      } else {
        dynamicStatus = 'scheduled';
      }
    } else {
      dynamicStatus = 'scheduled';
    }

    return {
      ...exam,
      dynamicStatus,
      displayStatus:
        exam.status === 'result_published' ? 'result_published' : dynamicStatus,
    };
  };

  const formatDate = (date) => {
    if (!date) return 'No date';
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (time) => {
    if (!time) return '--:--';
    return new Date(time).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      scheduled: {
        bg: 'bg-yellow-50',
        border: 'border-yellow-200',
        dot: 'bg-yellow-500',
        text: 'text-yellow-800',
      },
      ongoing: {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        dot: 'bg-blue-500',
        text: 'text-blue-800',
      },
      completed: {
        bg: 'bg-green-50',
        border: 'border-green-200',
        dot: 'bg-green-500',
        text: 'text-green-800',
      },
      cancelled: {
        bg: 'bg-red-50',
        border: 'border-red-200',
        dot: 'bg-red-500',
        text: 'text-red-800',
      },
      result_published: {
        bg: 'bg-purple-50',
        border: 'border-purple-200',
        dot: 'bg-purple-500',
        text: 'text-purple-800',
      },
    };
    return (
      colors[status] || {
        bg: 'bg-gray-50',
        border: 'border-gray-200',
        dot: 'bg-gray-500',
        text: 'text-gray-800',
      }
    );
  };

  const getStatusLabel = (status) => {
    const labels = {
      scheduled: 'Scheduled',
      ongoing: 'Ongoing',
      completed: 'Completed',
      cancelled: 'Cancelled',
      result_published: 'Published',
    };
    return labels[status] || status;
  };

  const toggleGroup = (groupName) => {
    setExpandedGroups((prev) => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  const toggleMatrixGroup = (groupName) => {
    setExpandedMatrixGroups((prev) => ({
      ...prev,
      [groupName]: !prev[groupName],
    }));
  };

  const handleDeleteExamGroup = (examName) => {
    if (
      confirm(`Are you sure you want to delete all exams named "${examName}"?`)
    ) {
      onDeleteGroup(examName);
    }
  };

  const handleEmptyCellClick = (group, date, timeSlot) => {
    if (!hasCreatePermission) {
      alert("You don't have permission to create exams");
      return;
    }
    setQuickCreateModal({
      isOpen: true,
      groupName: group.name,
      date: date,
      startTime: timeSlot.start,
      endTime: timeSlot.end,
      groupData: group,
    });
  };

  const handleQuickCreateSubmit = async (classroomId) => {
    if (!classroomId) {
      alert('Please select a classroom');
      return;
    }

    const { groupData, date, startTime, endTime } = quickCreateModal;
    const examData = {
      name: groupData.name,
      examTypeId: groupData.examType?.id,
      academicYear: groupData.academicYear,
      semester: groupData.semester,
      date: new Date(date).toISOString(),
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      departmentId: groupData.batch?.departmentId,
      batchId: groupData.batch?.id,
      classroomId: parseInt(classroomId),
    };

    if (onQuickCreate) {
      await onQuickCreate(examData);
    }
    setQuickCreateModal({
      isOpen: false,
      groupName: '',
      date: '',
      startTime: null,
      endTime: null,
      groupData: null,
    });
    fetchExams();
  };

  const groupedExams = useMemo(() => {
    const groups = {};
    const sortedExams = [...exams].sort((a, b) => {
      if (!a.date || !b.date) return 0;
      const dateCompare = new Date(a.date) - new Date(b.date);
      if (dateCompare !== 0) return dateCompare;
      if (!a.startTime || !b.startTime) return 0;
      return new Date(a.startTime) - new Date(b.startTime);
    });

    sortedExams.forEach((exam) => {
      if (!groups[exam.name]) {
        groups[exam.name] = {
          name: exam.name,
          examType: exam.examType,
          academicYear: exam.academicYear,
          semester: exam.semester,
          batch: exam.batch,
          exams: [],
          totalClassrooms: 0,
          scheduledCount: 0,
          ongoingCount: 0,
          completedCount: 0,
          publishedCount: 0,
        };
      }
      groups[exam.name].exams.push(exam);
      groups[exam.name].totalClassrooms++;

      const displayStatus = exam.displayStatus || exam.status;
      if (displayStatus === 'scheduled') groups[exam.name].scheduledCount++;
      if (displayStatus === 'ongoing') groups[exam.name].ongoingCount++;
      if (displayStatus === 'completed') groups[exam.name].completedCount++;
      if (displayStatus === 'result_published')
        groups[exam.name].publishedCount++;
    });

    return Object.values(groups);
  }, [exams]);

  const filteredGroups = useMemo(() => {
    if (!groupedExams) return [];
    return groupedExams.filter((group) => {
      const matchesSearch =
        group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.examType?.name
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        group.batch?.name?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
  }, [groupedExams, searchTerm]);

  const getGroupMatrixData = (groupExams) => {
    if (groupExams.length === 0)
      return { dates: [], timeSlots: [], cellSpans: {} };

    const dates = [
      ...new Set(groupExams.map((e) => e.date).filter(Boolean)),
    ].sort((a, b) => new Date(a) - new Date(b));

    let overallMinTime = Infinity;
    let overallMaxTime = -Infinity;

    groupExams.forEach((exam) => {
      if (!exam.startTime || !exam.endTime) return;
      const startMinutes =
        new Date(exam.startTime).getHours() * 60 +
        new Date(exam.startTime).getMinutes();
      const endMinutes =
        new Date(exam.endTime).getHours() * 60 +
        new Date(exam.endTime).getMinutes();
      if (startMinutes < overallMinTime) overallMinTime = startMinutes;
      if (endMinutes > overallMaxTime) overallMaxTime = endMinutes;
    });

    if (overallMinTime === Infinity || overallMaxTime === -Infinity)
      return { dates, timeSlots: [], cellSpans: {} };

    const minHour = Math.floor(overallMinTime / 60);
    const maxHour = Math.ceil(overallMaxTime / 60);
    const startMinutesWithBuffer = Math.max(0, minHour * 60 - 60);
    const endMinutesWithBuffer = Math.min(24 * 60, maxHour * 60 + 60);

    const timeSlots = [];
    for (
      let minutes = startMinutesWithBuffer;
      minutes < endMinutesWithBuffer;
      minutes += 60
    ) {
      const startHour = Math.floor(minutes / 60);
      const endMinutes = minutes + 60;
      const endHour = Math.floor(endMinutes / 60);

      const startTime = new Date();
      startTime.setHours(startHour, 0, 0, 0);
      const endTime = new Date();
      endTime.setHours(endHour, 0, 0, 0);

      timeSlots.push({
        start: startTime,
        end: endTime,
        label: `${formatTime(startTime)} - ${formatTime(endTime)}`,
        startMinutes: minutes,
        endMinutes: minutes + 60,
      });
    }

    const cellSpans = {};
    dates.forEach((date) => {
      cellSpans[date] = {};
      timeSlots.forEach((slot, slotIndex) => {
        cellSpans[date][slotIndex] = [];
      });

      const dateExams = groupExams.filter((exam) => exam.date === date);
      dateExams.forEach((exam) => {
        if (!exam.startTime || !exam.endTime) return;

        const examStart = new Date(exam.startTime);
        const examEnd = new Date(exam.endTime);
        const examStartMinutes =
          examStart.getHours() * 60 + examStart.getMinutes();
        const examEndMinutes = examEnd.getHours() * 60 + examEnd.getMinutes();

        let startSlotIndex = -1,
          endSlotIndex = -1;
        for (let i = 0; i < timeSlots.length; i++) {
          const slot = timeSlots[i];
          if (
            startSlotIndex === -1 &&
            examStartMinutes >= slot.startMinutes &&
            examStartMinutes < slot.endMinutes
          )
            startSlotIndex = i;
          if (
            examEndMinutes > slot.startMinutes &&
            examEndMinutes <= slot.endMinutes
          ) {
            endSlotIndex = i;
            break;
          }
          if (i > 0 && examEndMinutes === slot.startMinutes) {
            endSlotIndex = i - 1;
            break;
          }
        }

        if (startSlotIndex !== -1 && endSlotIndex !== -1) {
          const rowspan = endSlotIndex - startSlotIndex + 1;
          const displayStatus = exam.displayStatus || exam.status;
          cellSpans[date][startSlotIndex].push({
            examId: exam.id,
            exam,
            classroom: exam.classroom,
            status: displayStatus,
            startTime: formatTime(examStart),
            endTime: formatTime(examEnd),
            rowspan,
          });
        }
      });
    });

    return { dates, timeSlots, cellSpans };
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Icons.Loader2 size={32} className="animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Icons.Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={18}
          />
          <input
            type="text"
            placeholder="Search exam groups by name, type, or batch..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="space-y-4">
        {filteredGroups.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Icons.FileText size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">No exam groups found</p>
            <p className="text-sm mt-1">Try adjusting your search term</p>
          </div>
        ) : (
          filteredGroups.map((group) => {
            const groupMatrixData = getGroupMatrixData(group.exams);
            return (
              <motion.div
                key={`group-${group.name}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
              >
                <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleGroup(group.name)}
                        className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        <Icons.ChevronRight
                          size={18}
                          className={`transition-transform ${
                            expandedGroups[group.name] ? 'rotate-90' : ''
                          }`}
                        />
                      </button>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {group.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-600">
                          <span className="flex items-center gap-1">
                            <Icons.BookOpen size={12} />
                            {group.examType?.name || 'No Type'}
                          </span>
                          <span className="w-1 h-1 bg-gray-400 rounded-full" />
                          <span className="flex items-center gap-1">
                            <Icons.Users size={12} />
                            {group.batch?.name || 'No Batch'}
                          </span>
                          <span className="w-1 h-1 bg-gray-400 rounded-full" />
                          <span className="flex items-center gap-1">
                            <Icons.DoorOpen size={12} />
                            {group.totalClassrooms} Room
                            {group.totalClassrooms !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">
                          {group.scheduledCount}
                        </span>
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                          {group.ongoingCount || 0}
                        </span>
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                          {group.completedCount}
                        </span>
                        {group.publishedCount > 0 && (
                          <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-medium">
                            {group.publishedCount}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => toggleMatrixGroup(group.name)}
                        className={`p-2 rounded-lg transition-all ${
                          expandedMatrixGroups[group.name]
                            ? 'bg-blue-100 text-blue-600 shadow-sm'
                            : 'text-gray-500 hover:bg-gray-100'
                        }`}
                        title={
                          expandedMatrixGroups[group.name]
                            ? 'Hide Schedule Matrix'
                            : 'View Schedule Matrix'
                        }
                      >
                        <Icons.Grid3x3 size={18} />
                      </button>
                      {hasDeletePermission && (
                        <button
                          onClick={() => onDeleteGroup(group.name)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Exam Group"
                        >
                          <Icons.Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {expandedMatrixGroups[group.name] &&
                    groupMatrixData.timeSlots.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="border-b border-gray-200 bg-gray-50"
                      >
                        <div className="p-3">
                          <div className="overflow-auto max-h-[400px] border border-gray-200 rounded-lg bg-white">
                            <div className="min-w-max">
                              <table className="border-collapse w-full">
                                <thead className="sticky top-0 z-10">
                                  <tr>
                                    <th className="sticky left-0 z-20 bg-gray-100 p-2 border-b border-r border-gray-300 min-w-[120px]">
                                      <div className="font-semibold text-gray-700 text-xs">
                                        Time / Date
                                      </div>
                                    </th>
                                    {groupMatrixData.dates.map((date) => (
                                      <th
                                        key={`date-${date}`}
                                        className="bg-gray-100 p-2 border-b border-r border-gray-300 min-w-[150px]"
                                      >
                                        <div className="font-semibold text-gray-700 text-xs">
                                          {formatDate(date)}
                                        </div>
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {groupMatrixData.timeSlots.map(
                                    (timeSlot, slotIndex) => (
                                      <tr key={`slot-${slotIndex}`}>
                                        <td className="sticky left-0 z-10 bg-gray-50 p-2 border-b border-r border-gray-300 font-medium text-xs">
                                          <div className="flex items-center gap-1.5">
                                            <Icons.Clock
                                              size={10}
                                              className="text-gray-500"
                                            />
                                            {timeSlot.label}
                                          </div>
                                        </td>
                                        {groupMatrixData.dates.map((date) => {
                                          let isCovered = false;
                                          for (let i = 0; i < slotIndex; i++) {
                                            const cells =
                                              groupMatrixData.cellSpans[date]?.[
                                                i
                                              ] || [];
                                            cells.forEach((cell) => {
                                              if (
                                                cell.rowspan &&
                                                i + cell.rowspan > slotIndex
                                              )
                                                isCovered = true;
                                            });
                                          }
                                          if (isCovered) return null;

                                          const cells =
                                            groupMatrixData.cellSpans[date]?.[
                                              slotIndex
                                            ] || [];
                                          return (
                                            <td
                                              key={`cell-${date}-${slotIndex}`}
                                              className="p-0 border-b border-r border-gray-300 align-top bg-white"
                                              style={{
                                                minWidth: '150px',
                                                height: '1px',
                                              }}
                                              rowSpan={
                                                cells.length > 0 &&
                                                cells[0].rowspan > 1
                                                  ? cells[0].rowspan
                                                  : 1
                                              }
                                            >
                                              {cells.map((cell) => {
                                                const statusColors =
                                                  getStatusColor(cell.status);
                                                return (
                                                  <motion.div
                                                    key={`exam-cell-${cell.examId}`}
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    className={`h-full p-2 cursor-pointer hover:shadow-md transition-all ${
                                                      statusColors.bg
                                                    } border-l-4 ${statusColors.border.replace(
                                                      'border',
                                                      'border-l'
                                                    )}`}
                                                    onClick={() =>
                                                      onEdit(cell.exam)
                                                    }
                                                  >
                                                    <div className="flex flex-col h-full">
                                                      <div className="flex items-center gap-1.5 mb-1">
                                                        <span
                                                          className={`w-2 h-2 rounded-full flex-shrink-0 ${statusColors.dot}`}
                                                        />
                                                        <span className="font-semibold text-gray-900 text-xs truncate">
                                                          {cell.classroom?.name}
                                                        </span>
                                                      </div>
                                                      <div className="space-y-1 text-[10px]">
                                                        <div className="flex items-center gap-1 text-gray-600">
                                                          <Icons.Clock
                                                            size={10}
                                                          />
                                                          <span>
                                                            {cell.startTime} -{' '}
                                                            {cell.endTime}
                                                          </span>
                                                        </div>
                                                        <div className="flex items-center gap-1 text-gray-600">
                                                          <Icons.Users
                                                            size={10}
                                                          />
                                                          <span>
                                                            Cap:{' '}
                                                            {cell.classroom
                                                              ?.capacity ||
                                                              'N/A'}
                                                          </span>
                                                        </div>
                                                        <span
                                                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${statusColors.bg} ${statusColors.text}`}
                                                        >
                                                          {getStatusLabel(
                                                            cell.status
                                                          )}
                                                        </span>
                                                      </div>
                                                      <div className="flex items-center gap-0.5 mt-2 pt-1.5 border-t border-gray-200">
                                                        {hasUpdatePermission && (
                                                          <button
                                                            onClick={(e) => {
                                                              e.stopPropagation();
                                                              onEdit(cell.exam);
                                                            }}
                                                            className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                            title="Edit"
                                                          >
                                                            <Icons.Edit
                                                              size={12}
                                                            />
                                                          </button>
                                                        )}
                                                        {hasResultPermission &&
                                                          cell.status !==
                                                            'result_published' && (
                                                            <button
                                                              onClick={(e) => {
                                                                e.stopPropagation();
                                                                onEnterResult(
                                                                  cell.exam
                                                                );
                                                              }}
                                                              className="p-1 text-green-500 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                                                              title="Enter Marks"
                                                            >
                                                              <Icons.FileText
                                                                size={12}
                                                              />
                                                            </button>
                                                          )}
                                                        {cell.status ===
                                                          'completed' && (
                                                          <button
                                                            onClick={(e) => {
                                                              e.stopPropagation();
                                                              onPublishResults(
                                                                cell.exam.id
                                                              );
                                                            }}
                                                            className="p-1 text-purple-500 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
                                                            title="Publish"
                                                          >
                                                            <Icons.Send
                                                              size={12}
                                                            />
                                                          </button>
                                                        )}
                                                        {hasDeletePermission && (
                                                          <button
                                                            onClick={(e) => {
                                                              e.stopPropagation();
                                                              onDelete(
                                                                cell.exam.id
                                                              );
                                                            }}
                                                            className="p-1 text-red-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors ml-auto"
                                                            title="Delete"
                                                          >
                                                            <Icons.Trash2
                                                              size={12}
                                                            />
                                                          </button>
                                                        )}
                                                      </div>
                                                    </div>
                                                  </motion.div>
                                                );
                                              })}
                                              {cells.length === 0 && (
                                                <div
                                                  className="h-full min-h-[60px] flex items-center justify-center text-gray-400 text-xs cursor-pointer hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                                  onClick={() =>
                                                    handleEmptyCellClick(
                                                      group,
                                                      date,
                                                      timeSlot
                                                    )
                                                  }
                                                >
                                                  <div className="flex flex-col items-center gap-1">
                                                    <Icons.Plus size={16} />
                                                    <span>
                                                      Click to schedule
                                                    </span>
                                                  </div>
                                                </div>
                                              )}
                                            </td>
                                          );
                                        })}
                                      </tr>
                                    )
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                  {expandedGroups[group.name] && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="divide-y divide-gray-100"
                    >
                      {group.exams.map((exam) => {
                        const displayStatus = exam.displayStatus || exam.status;
                        const statusColors = getStatusColor(displayStatus);
                        return (
                          <div
                            key={`exam-${exam.id}`}
                            className="p-3 hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-8 h-8 rounded-full flex items-center justify-center ${statusColors.bg} ${statusColors.text}`}
                                >
                                  <Icons.BookOpen size={14} />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <p className="font-medium text-gray-900 text-sm">
                                      {exam.classroom?.name}
                                    </p>
                                    <span
                                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${statusColors.bg} ${statusColors.text}`}
                                    >
                                      {getStatusLabel(displayStatus)}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3 text-xs text-gray-500">
                                    <span className="flex items-center gap-1">
                                      <Icons.Calendar size={10} />
                                      {formatDate(exam.date)}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Icons.Clock size={10} />
                                      {formatTime(exam.startTime)} -{' '}
                                      {formatTime(exam.endTime)}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Icons.Users size={10} />
                                      Cap: {exam.classroom?.capacity || 'N/A'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                {hasUpdatePermission && (
                                  <button
                                    onClick={() => onEdit(exam)}
                                    className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                    title="Edit"
                                  >
                                    <Icons.Edit size={14} />
                                  </button>
                                )}
                                {hasResultPermission &&
                                  displayStatus !== 'result_published' && (
                                    <button
                                      onClick={() => onEnterResult(exam)}
                                      className="p-1.5 text-green-500 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                                      title="Enter Marks"
                                    >
                                      <Icons.FileText size={14} />
                                    </button>
                                  )}
                                {displayStatus === 'completed' && (
                                  <button
                                    onClick={() => onPublishResults(exam.id)}
                                    className="p-1.5 text-purple-500 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
                                    title="Publish"
                                  >
                                    <Icons.Send size={14} />
                                  </button>
                                )}
                                {hasDeletePermission && (
                                  <button
                                    onClick={() => onDelete(exam.id)}
                                    className="p-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                    title="Delete"
                                  >
                                    <Icons.Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Quick Create Modal (Single Slot) */}
      <AnimatePresence>
        {quickCreateModal.isOpen && (
          <QuickCreateExamModal
            isOpen={quickCreateModal.isOpen}
            onClose={() =>
              setQuickCreateModal({
                isOpen: false,
                groupName: '',
                date: '',
                startTime: null,
                endTime: null,
                groupData: null,
              })
            }
            onSubmit={handleQuickCreateSubmit}
            groupData={quickCreateModal.groupData}
            date={quickCreateModal.date}
            startTime={quickCreateModal.startTime}
            endTime={quickCreateModal.endTime}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Quick Create Exam Modal Component (Single Slot)
function QuickCreateExamModal({
  isOpen,
  onClose,
  onSubmit,
  groupData,
  date,
  startTime,
  endTime,
}) {
  const [selectedClassroom, setSelectedClassroom] = useState('');
  const [availableClassrooms, setAvailableClassrooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && groupData?.batch?.id) {
      fetchAvailableClassrooms();
    }
  }, [isOpen, groupData]);

  const fetchAvailableClassrooms = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/classrooms?limit=100');
      if (response.ok) {
        const data = await response.json();
        let classrooms = data?.classrooms || (Array.isArray(data) ? data : []);
        const filtered = classrooms.filter(
          (c) =>
            !c.batchId ||
            c.batchId.toString() === groupData.batch?.id?.toString()
        );
        setAvailableClassrooms(filtered);
      }
    } catch (error) {
      console.error('Error fetching classrooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    await onSubmit(selectedClassroom);
    setSubmitting(false);
  };

  const formatTime = (time) =>
    time
      ? new Date(time).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })
      : '';
  const formatDate = (date) =>
    date
      ? new Date(date).toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        })
      : '';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6"
        >
          <div className="absolute right-0 top-0 pr-4 pt-4">
            <button
              onClick={onClose}
              className="rounded-md bg-white text-gray-400 hover:text-gray-500"
            >
              <Icons.X size={20} />
            </button>
          </div>
          <div>
            <h3 className="text-lg font-semibold leading-6 text-gray-900 flex items-center gap-2">
              <Icons.PlusCircle className="text-blue-600" size={20} />
              Quick Schedule Exam
            </h3>
            <div className="mt-4 space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500">
                    Exam Name
                  </label>
                  <p className="text-sm font-medium text-gray-900">
                    {groupData?.name}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500">
                      Date
                    </label>
                    <p className="text-sm text-gray-900">{formatDate(date)}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500">
                      Time
                    </label>
                    <p className="text-sm text-gray-900">
                      {formatTime(startTime)} - {formatTime(endTime)}
                    </p>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Classroom <span className="text-red-500">*</span>
                </label>
                {loading ? (
                  <div className="flex justify-center py-4">
                    <Icons.Loader2
                      size={20}
                      className="animate-spin text-blue-600"
                    />
                  </div>
                ) : (
                  <select
                    value={selectedClassroom}
                    onChange={(e) => setSelectedClassroom(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Select a classroom</option>
                    {availableClassrooms.map((classroom) => (
                      <option key={classroom.id} value={classroom.id}>
                        {classroom.name} - {classroom.building || 'Main'}{' '}
                        (Capacity: {classroom.capacity})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </div>
          <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse gap-3">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!selectedClassroom || submitting}
              className="inline-flex w-full justify-center rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed sm:ml-3 sm:w-auto"
            >
              {submitting ? (
                <>
                  <Icons.Loader2 size={16} className="animate-spin mr-2" />
                  Scheduling...
                </>
              ) : (
                <>
                  <Icons.Calendar size={16} className="mr-2" />
                  Schedule Exam
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
