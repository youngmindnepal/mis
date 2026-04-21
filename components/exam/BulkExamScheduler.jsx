'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';

export default function BulkExamScheduler({
  isOpen,
  onClose,
  onSubmit,
  examTypes = [],
  loading,
  onExamTypeCreated,
}) {
  const [selectedBatch, setSelectedBatch] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedExamType, setSelectedExamType] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [examName, setExamName] = useState('');

  // Data states
  const [departments, setDepartments] = useState([]);
  const [batches, setBatches] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [localExamTypes, setLocalExamTypes] = useState(examTypes);

  // Loading states
  const [departmentsLoading, setDepartmentsLoading] = useState(false);
  const [batchesLoading, setBatchesLoading] = useState(false);
  const [classroomsLoading, setClassroomsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // New Exam Type Modal states (consistent with ExamFormModal)
  const [showNewExamTypeModal, setShowNewExamTypeModal] = useState(false);
  const [newExamType, setNewExamType] = useState({
    name: '',
    code: '',
    weightage: '',
    description: '',
  });
  const [newExamTypeErrors, setNewExamTypeErrors] = useState({});
  const [addingExamType, setAddingExamType] = useState(false);

  // Matrix data - keyed by classroom
  const [examSchedule, setExamSchedule] = useState({});
  const [errors, setErrors] = useState({});

  // Sync local exam types with prop
  useEffect(() => {
    setLocalExamTypes(Array.isArray(examTypes) ? examTypes : []);
  }, [examTypes]);

  // Initialize academic year
  useEffect(() => {
    setAcademicYear(
      new Date().getFullYear() + '-' + (new Date().getFullYear() + 1)
    );
  }, []);

  // Fetch departments
  useEffect(() => {
    if (isOpen) {
      fetchDepartments();
    }
  }, [isOpen]);

  const fetchDepartments = async () => {
    setDepartmentsLoading(true);
    try {
      const response = await fetch('/api/departments/all');
      if (response.ok) {
        const data = await response.json();
        setDepartments(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
    } finally {
      setDepartmentsLoading(false);
    }
  };

  const fetchBatches = async (departmentId) => {
    if (!departmentId) {
      setBatches([]);
      return;
    }
    setBatchesLoading(true);
    try {
      const response = await fetch(
        `/api/batches?departmentId=${departmentId}&limit=100`
      );
      if (response.ok) {
        const data = await response.json();
        let fetchedBatches = [];
        if (data?.batches) {
          fetchedBatches = Array.isArray(data.batches) ? data.batches : [];
        } else if (Array.isArray(data)) {
          fetchedBatches = data;
        }
        setBatches(fetchedBatches);
      }
    } catch (error) {
      console.error('Error fetching batches:', error);
    } finally {
      setBatchesLoading(false);
    }
  };

  const fetchClassrooms = async (batchId) => {
    if (!batchId) {
      setClassrooms([]);
      return;
    }
    setClassroomsLoading(true);
    try {
      const response = await fetch('/api/classrooms?limit=100');
      if (response.ok) {
        const data = await response.json();
        let fetchedClassrooms = [];
        if (data?.classrooms) {
          fetchedClassrooms = Array.isArray(data.classrooms)
            ? data.classrooms
            : [];
        } else if (Array.isArray(data)) {
          fetchedClassrooms = data;
        }
        // Filter available classrooms (not assigned or assigned to this batch)
        const filtered = fetchedClassrooms.filter(
          (c) => !c.batchId || c.batchId.toString() === batchId.toString()
        );
        setClassrooms(filtered);

        // Initialize schedule matrix with classrooms
        const initialSchedule = {};
        filtered.forEach((classroom) => {
          initialSchedule[classroom.id] = {
            classroomId: classroom.id,
            classroomName: classroom.name,
            building: classroom.building || 'Main',
            capacity: classroom.capacity,
            date: '',
            startTime: '',
            endTime: '',
          };
        });
        setExamSchedule(initialSchedule);
      }
    } catch (error) {
      console.error('Error fetching classrooms:', error);
    } finally {
      setClassroomsLoading(false);
    }
  };

  const handleDepartmentChange = (deptId) => {
    setSelectedDepartment(deptId);
    setSelectedBatch('');
    setBatches([]);
    setClassrooms([]);
    setExamSchedule({});
    if (deptId) {
      fetchBatches(deptId);
    }
  };

  const handleBatchChange = (batchId) => {
    setSelectedBatch(batchId);
    setClassrooms([]);
    setExamSchedule({});
    if (batchId) {
      fetchClassrooms(batchId);
    }
  };

  const handleScheduleChange = (classroomId, field, value) => {
    setExamSchedule((prev) => ({
      ...prev,
      [classroomId]: {
        ...prev[classroomId],
        [field]: value,
      },
    }));
    // Clear error for this field
    if (errors[`${classroomId}-${field}`]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[`${classroomId}-${field}`];
        return newErrors;
      });
    }
  };

  const validateSchedule = () => {
    const newErrors = {};
    let isValid = true;

    if (!selectedBatch) {
      newErrors.batch = 'Please select a batch';
      isValid = false;
    }
    if (!selectedExamType) {
      newErrors.examType = 'Please select an exam type';
      isValid = false;
    }
    if (!examName.trim()) {
      newErrors.examName = 'Please enter an exam name';
      isValid = false;
    }

    // Check each scheduled classroom
    const scheduledClassrooms = Object.values(examSchedule).filter(
      (s) => s.date && s.startTime && s.endTime
    );

    if (scheduledClassrooms.length === 0) {
      newErrors.submit = 'Please schedule at least one exam';
      isValid = false;
    }

    // Check for time conflicts per classroom per day
    const classroomSchedule = {};

    scheduledClassrooms.forEach((schedule) => {
      if (!schedule.date) {
        newErrors[`${schedule.classroomId}-date`] = 'Date is required';
        isValid = false;
      }
      if (!schedule.startTime) {
        newErrors[`${schedule.classroomId}-startTime`] =
          'Start time is required';
        isValid = false;
      }
      if (!schedule.endTime) {
        newErrors[`${schedule.classroomId}-endTime`] = 'End time is required';
        isValid = false;
      }
      if (
        schedule.startTime &&
        schedule.endTime &&
        schedule.startTime >= schedule.endTime
      ) {
        newErrors[`${schedule.classroomId}-endTime`] =
          'End time must be after start time';
        isValid = false;
      }

      // Check for overlapping exams in the same classroom on the same day
      if (schedule.classroomId && schedule.date) {
        const key = `${schedule.classroomId}-${schedule.date}`;
        if (!classroomSchedule[key]) {
          classroomSchedule[key] = [];
        }

        const hasConflict = classroomSchedule[key].some((existing) => {
          return (
            schedule.startTime < existing.endTime &&
            schedule.endTime > existing.startTime
          );
        });

        if (hasConflict) {
          newErrors[`${schedule.classroomId}-time`] =
            'Time conflict with another exam in this classroom';
          isValid = false;
        }

        classroomSchedule[key].push({
          startTime: schedule.startTime,
          endTime: schedule.endTime,
        });
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateSchedule()) {
      return;
    }

    setSubmitting(true);

    try {
      // Get the selected batch details to get departmentId
      const selectedBatchData = batches.find(
        (b) => b.id.toString() === selectedBatch.toString()
      );

      // Determine departmentId: use selected department or fallback to batch's department
      const departmentId = selectedDepartment
        ? parseInt(selectedDepartment)
        : selectedBatchData?.departmentId || null;

      const examsToCreate = Object.values(examSchedule)
        .filter(
          (schedule) => schedule.date && schedule.startTime && schedule.endTime
        )
        .map((schedule) => ({
          name: examName.trim(),
          examTypeId: parseInt(selectedExamType),
          academicYear,
          semester: selectedSemester || null,
          date: schedule.date ? new Date(schedule.date).toISOString() : null,
          startTime: schedule.startTime || null,
          endTime: schedule.endTime || null,
          departmentId: departmentId,
          batchId: parseInt(selectedBatch),
          classroomId: parseInt(schedule.classroomId),
        }));

      const response = await fetch('/api/exams/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ exams: examsToCreate }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to schedule exams');
      }

      await onSubmit(result);
      onClose();
    } catch (error) {
      console.error('Bulk schedule error:', error);
      setErrors((prev) => ({ ...prev, submit: error.message }));
    } finally {
      setSubmitting(false);
    }
  };

  // Validate and create new exam type (consistent with ExamFormModal)
  const validateNewExamType = () => {
    const newErrors = {};
    if (!newExamType.name?.trim()) {
      newErrors.name = 'Exam type name is required';
    }
    if (!newExamType.code?.trim()) {
      newErrors.code = 'Exam type code is required';
    }
    setNewExamTypeErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateExamType = async () => {
    if (!validateNewExamType()) return;

    setAddingExamType(true);
    try {
      const response = await fetch('/api/exam-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newExamType.name.trim(),
          code: newExamType.code.trim().toUpperCase(),
          weightage: newExamType.weightage
            ? parseFloat(newExamType.weightage)
            : null,
          description: newExamType.description || null,
          status: 'active',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create exam type');
      }

      const createdType = await response.json();

      // Add to local list
      setLocalExamTypes((prev) => [...prev, createdType]);

      // Select the newly created exam type
      setSelectedExamType(createdType.id.toString());

      // Callback to parent
      if (onExamTypeCreated) {
        onExamTypeCreated(createdType);
      }

      // Close modal and reset form
      setShowNewExamTypeModal(false);
      setNewExamType({ name: '', code: '', weightage: '', description: '' });
      setNewExamTypeErrors({});
    } catch (error) {
      console.error('Error creating exam type:', error);
      setNewExamTypeErrors((prev) => ({ ...prev, submit: error.message }));
    } finally {
      setAddingExamType(false);
    }
  };

  // Apply date/time to all classrooms
  const applyToAll = (field, value) => {
    if (!value) return;
    const updatedSchedule = { ...examSchedule };
    Object.keys(updatedSchedule).forEach((classroomId) => {
      updatedSchedule[classroomId][field] = value;
    });
    setExamSchedule(updatedSchedule);
  };

  // Clear all schedules
  const clearAllSchedules = () => {
    const clearedSchedule = { ...examSchedule };
    Object.keys(clearedSchedule).forEach((classroomId) => {
      clearedSchedule[classroomId] = {
        ...clearedSchedule[classroomId],
        date: '',
        startTime: '',
        endTime: '',
      };
    });
    setExamSchedule(clearedSchedule);
    setErrors({});
  };

  if (!isOpen) return null;

  const isFormLoading = loading || submitting;
  const hasClassrooms = Object.keys(examSchedule).length > 0;
  const scheduledCount = Object.values(examSchedule).filter(
    (s) => s.date && s.startTime && s.endTime
  ).length;

  return (
    <AnimatePresence>
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
            className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-6xl sm:p-6"
          >
            <div className="absolute right-0 top-0 pr-4 pt-4">
              <button
                onClick={onClose}
                className="rounded-md bg-white text-gray-400 hover:text-gray-500"
                disabled={isFormLoading}
              >
                <Icons.X size={20} />
              </button>
            </div>

            <div>
              <h3 className="text-lg font-semibold leading-6 text-gray-900 flex items-center gap-2">
                <Icons.CalendarDays className="text-blue-600" size={20} />
                Bulk Exam Scheduler
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Schedule the same exam across multiple classrooms at once
              </p>

              {errors.submit && (
                <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  {errors.submit}
                </div>
              )}

              <div className="mt-4 space-y-4">
                {/* Selection Bar */}
                <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                  {/* First Row - 4 columns */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Department
                      </label>
                      <select
                        value={selectedDepartment}
                        onChange={(e) => handleDepartmentChange(e.target.value)}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        disabled={isFormLoading || departmentsLoading}
                      >
                        <option value="">Select Department</option>
                        {departments.map((dept) => (
                          <option key={dept.id} value={dept.id}>
                            {dept.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Batch <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={selectedBatch}
                        onChange={(e) => handleBatchChange(e.target.value)}
                        className={`w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-1 ${
                          errors.batch
                            ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                            : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                        }`}
                        disabled={
                          !selectedDepartment || batchesLoading || isFormLoading
                        }
                      >
                        <option value="">
                          {batchesLoading ? 'Loading...' : 'Select Batch'}
                        </option>
                        {batches.map((batch) => (
                          <option key={batch.id} value={batch.id}>
                            {batch.name} ({batch.academicYear})
                          </option>
                        ))}
                      </select>
                      {errors.batch && (
                        <p className="text-xs text-red-600 mt-1">
                          {errors.batch}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Semester
                      </label>
                      <select
                        value={selectedSemester}
                        onChange={(e) => setSelectedSemester(e.target.value)}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        disabled={isFormLoading}
                      >
                        <option value="">Select Semester</option>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                          <option key={sem} value={`semester${sem}`}>
                            Semester {sem}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Second Row - Academic Year (takes 1/4 width) */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Exam Type <span className="text-red-500">*</span>
                      </label>
                      <div className="flex gap-1">
                        <select
                          value={selectedExamType}
                          onChange={(e) => setSelectedExamType(e.target.value)}
                          className={`min-w-0 flex-1 rounded-md border px-2 py-2 focus:outline-none focus:ring-1 text-sm ${
                            errors.examType
                              ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                              : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                          }`}
                          disabled={isFormLoading}
                        >
                          <option value="">Select</option>
                          {localExamTypes.map((type) => (
                            <option key={type.id} value={type.id}>
                              {type.name}{' '}
                              {type.weightage && `(${type.weightage}%)`}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => setShowNewExamTypeModal(true)}
                          className="px-2 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex-shrink-0 flex items-center gap-0.5"
                          title="Add New Exam Type"
                          disabled={isFormLoading}
                        >
                          <Icons.Plus size={14} />
                          <span className="hidden xl:inline text-xs">Add</span>
                        </button>
                      </div>
                      {errors.examType && (
                        <p className="text-xs text-red-600 mt-1">
                          {errors.examType}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Academic Year
                      </label>
                      <input
                        type="text"
                        value={academicYear}
                        onChange={(e) => setAcademicYear(e.target.value)}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                        placeholder="2024-2025"
                        disabled={isFormLoading}
                      />
                    </div>
                  </div>
                </div>

                {/* Exam Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Exam Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={examName}
                    onChange={(e) => setExamName(e.target.value)}
                    className={`w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-1 ${
                      errors.examName
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                    }`}
                    placeholder="e.g., First Term Examination 2024"
                    disabled={isFormLoading}
                  />
                  {errors.examName && (
                    <p className="text-xs text-red-600 mt-1">
                      {errors.examName}
                    </p>
                  )}
                </div>

                {/* Bulk Actions Bar */}
                {hasClassrooms && (
                  <div className="bg-blue-50 p-3 rounded-lg flex flex-wrap items-center gap-3">
                    <span className="text-sm font-medium text-blue-700">
                      Apply to all classrooms:
                    </span>
                    <input
                      type="date"
                      placeholder="Date"
                      className="rounded-md border border-blue-300 px-3 py-1.5 text-sm"
                      onChange={(e) => applyToAll('date', e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                    />
                    <input
                      type="time"
                      placeholder="Start Time"
                      className="rounded-md border border-blue-300 px-3 py-1.5 text-sm"
                      onChange={(e) => applyToAll('startTime', e.target.value)}
                    />
                    <input
                      type="time"
                      placeholder="End Time"
                      className="rounded-md border border-blue-300 px-3 py-1.5 text-sm"
                      onChange={(e) => applyToAll('endTime', e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={clearAllSchedules}
                      className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-md text-sm hover:bg-gray-300 transition-colors"
                    >
                      Clear All
                    </button>
                    <span className="ml-auto text-sm text-blue-700">
                      {scheduledCount} of {Object.keys(examSchedule).length}{' '}
                      classrooms scheduled
                    </span>
                  </div>
                )}

                {/* Schedule Matrix - Classrooms as rows */}
                {classroomsLoading ? (
                  <div className="flex justify-center py-12">
                    <Icons.Loader2
                      size={32}
                      className="animate-spin text-blue-600"
                    />
                  </div>
                ) : hasClassrooms ? (
                  <div className="overflow-x-auto max-h-96">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Classroom
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Building
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Capacity
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date <span className="text-red-500">*</span>
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Start Time <span className="text-red-500">*</span>
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            End Time <span className="text-red-500">*</span>
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {Object.values(examSchedule).map((schedule) => (
                          <tr
                            key={schedule.classroomId}
                            className={`hover:bg-gray-50 ${
                              schedule.date &&
                              schedule.startTime &&
                              schedule.endTime
                                ? 'bg-green-50'
                                : ''
                            }`}
                          >
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="font-medium text-gray-900">
                                {schedule.classroomName}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                              {schedule.building}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                              {schedule.capacity}
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="date"
                                value={schedule.date}
                                onChange={(e) =>
                                  handleScheduleChange(
                                    schedule.classroomId,
                                    'date',
                                    e.target.value
                                  )
                                }
                                className={`w-full rounded-md border px-2 py-1.5 text-sm ${
                                  errors[`${schedule.classroomId}-date`]
                                    ? 'border-red-500'
                                    : 'border-gray-300'
                                }`}
                                min={new Date().toISOString().split('T')[0]}
                              />
                              {errors[`${schedule.classroomId}-date`] && (
                                <p className="text-xs text-red-600 mt-0.5">
                                  {errors[`${schedule.classroomId}-date`]}
                                </p>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="time"
                                value={schedule.startTime}
                                onChange={(e) =>
                                  handleScheduleChange(
                                    schedule.classroomId,
                                    'startTime',
                                    e.target.value
                                  )
                                }
                                className={`w-full rounded-md border px-2 py-1.5 text-sm ${
                                  errors[`${schedule.classroomId}-startTime`]
                                    ? 'border-red-500'
                                    : 'border-gray-300'
                                }`}
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="time"
                                value={schedule.endTime}
                                onChange={(e) =>
                                  handleScheduleChange(
                                    schedule.classroomId,
                                    'endTime',
                                    e.target.value
                                  )
                                }
                                className={`w-full rounded-md border px-2 py-1.5 text-sm ${
                                  errors[`${schedule.classroomId}-endTime`]
                                    ? 'border-red-500'
                                    : 'border-gray-300'
                                }`}
                              />
                              {errors[`${schedule.classroomId}-time`] && (
                                <p className="text-xs text-red-600 mt-0.5">
                                  Time conflict
                                </p>
                              )}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              {schedule.date &&
                              schedule.startTime &&
                              schedule.endTime ? (
                                <span className="inline-flex items-center gap-1 text-green-600 text-sm">
                                  <Icons.CheckCircle size={14} />
                                  Scheduled
                                </span>
                              ) : (
                                <span className="text-gray-400 text-sm">
                                  Pending
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : selectedBatch ? (
                  <div className="text-center py-12 text-gray-500">
                    No classrooms available for this batch
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    Select a batch to view available classrooms
                  </div>
                )}

                {/* Action Buttons */}
                <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse gap-3 border-t pt-4">
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={
                      isFormLoading || !hasClassrooms || scheduledCount === 0
                    }
                    className="inline-flex w-full justify-center rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed sm:ml-3 sm:w-auto"
                  >
                    {isFormLoading ? (
                      <>
                        <Icons.Loader2
                          size={16}
                          className="animate-spin mr-2"
                        />
                        Scheduling...
                      </>
                    ) : (
                      <>
                        <Icons.Calendar size={16} className="mr-2" />
                        Schedule {scheduledCount} Exam
                        {scheduledCount !== 1 ? 's' : ''}
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                    disabled={isFormLoading}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* New Exam Type Modal - Consistent with ExamFormModal */}
      <AnimatePresence>
        {showNewExamTypeModal && (
          <div className="fixed inset-0 z-[60] overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
                onClick={() => setShowNewExamTypeModal(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-md sm:p-6"
              >
                <div className="absolute right-0 top-0 pr-4 pt-4">
                  <button
                    onClick={() => setShowNewExamTypeModal(false)}
                    className="rounded-md bg-white text-gray-400 hover:text-gray-500"
                  >
                    <Icons.X size={20} />
                  </button>
                </div>
                <div>
                  <h3 className="text-lg font-semibold leading-6 text-gray-900 flex items-center gap-2">
                    <Icons.PlusCircle className="text-green-600" size={20} />
                    Add New Exam Type
                  </h3>
                  {newExamTypeErrors.submit && (
                    <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                      {newExamTypeErrors.submit}
                    </div>
                  )}
                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={newExamType.name}
                        onChange={(e) =>
                          setNewExamType((prev) => ({
                            ...prev,
                            name: e.target.value,
                          }))
                        }
                        className={`mt-1 block w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-1 ${
                          newExamTypeErrors.name
                            ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                            : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                        }`}
                        placeholder="e.g., Mid-Term Examination"
                      />
                      {newExamTypeErrors.name && (
                        <p className="mt-1 text-xs text-red-600">
                          {newExamTypeErrors.name}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Code <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={newExamType.code}
                        onChange={(e) =>
                          setNewExamType((prev) => ({
                            ...prev,
                            code: e.target.value.toUpperCase(),
                          }))
                        }
                        className={`mt-1 block w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-1 ${
                          newExamTypeErrors.code
                            ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                            : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                        }`}
                        placeholder="e.g., MID"
                        maxLength={10}
                      />
                      {newExamTypeErrors.code && (
                        <p className="mt-1 text-xs text-red-600">
                          {newExamTypeErrors.code}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Weightage (%)
                      </label>
                      <input
                        type="number"
                        value={newExamType.weightage}
                        onChange={(e) =>
                          setNewExamType((prev) => ({
                            ...prev,
                            weightage: e.target.value,
                          }))
                        }
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="e.g., 25"
                        min="0"
                        max="100"
                        step="0.1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Description
                      </label>
                      <textarea
                        value={newExamType.description}
                        onChange={(e) =>
                          setNewExamType((prev) => ({
                            ...prev,
                            description: e.target.value,
                          }))
                        }
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        rows="2"
                        placeholder="Optional description..."
                      />
                    </div>
                  </div>
                </div>
                <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse gap-3">
                  <button
                    type="button"
                    onClick={handleCreateExamType}
                    disabled={addingExamType}
                    className="inline-flex w-full justify-center rounded-md bg-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-green-500 disabled:opacity-50 sm:ml-3 sm:w-auto"
                  >
                    {addingExamType ? (
                      <>
                        <Icons.Loader2
                          size={16}
                          className="animate-spin mr-2"
                        />{' '}
                        Creating...
                      </>
                    ) : (
                      <>
                        <Icons.Plus size={16} className="mr-2" /> Create Exam
                        Type
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewExamTypeModal(false);
                      setNewExamType({
                        name: '',
                        code: '',
                        weightage: '',
                        description: '',
                      });
                      setNewExamTypeErrors({});
                    }}
                    className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </AnimatePresence>
  );
}
