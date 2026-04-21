'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';

export default function ExamFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  examTypes = [],
  loading,
  onExamTypeCreated,
}) {
  const [formData, setFormData] = useState({
    name: '',
    examTypeId: '',
    academicYear: '',
    semester: '',
    date: '',
    startTime: '',
    endTime: '',
    departmentId: '',
    batchId: '',
    classroomId: '',
    description: '',
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const [departments, setDepartments] = useState([]);
  const [batches, setBatches] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [filteredClassrooms, setFilteredClassrooms] = useState([]);
  const [localExamTypes, setLocalExamTypes] = useState([]);

  const [departmentsLoading, setDepartmentsLoading] = useState(false);
  const [batchesLoading, setBatchesLoading] = useState(false);
  const [classroomsLoading, setClassroomsLoading] = useState(false);
  const [addingExamType, setAddingExamType] = useState(false);

  const [showNewExamTypeModal, setShowNewExamTypeModal] = useState(false);
  const [newExamType, setNewExamType] = useState({
    name: '',
    code: '',
    weightage: '',
    description: '',
  });
  const [newExamTypeErrors, setNewExamTypeErrors] = useState({});

  const isEditing = !!(initialData && initialData.id);

  // Update local exam types when prop changes
  useEffect(() => {
    setLocalExamTypes(Array.isArray(examTypes) ? examTypes : []);
  }, [examTypes]);

  // Fetch departments when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchDepartments();
    }
  }, [isOpen]);

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      setBatches([]);
      setClassrooms([]);
      setFilteredClassrooms([]);
      setErrors({});
    }
  }, [isOpen]);

  // Initialize form data when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        const examTypeId =
          initialData.examTypeId?.toString() ||
          initialData.examType?.id?.toString() ||
          '';

        const formatTimeString = (timeValue) => {
          if (!timeValue) return '';
          try {
            const date = new Date(timeValue);
            if (isNaN(date.getTime())) return timeValue.slice(0, 5);
            return date.toTimeString().slice(0, 5);
          } catch {
            return timeValue.slice(0, 5);
          }
        };

        const formatDateString = (dateValue) => {
          if (!dateValue) return '';
          try {
            return new Date(dateValue).toISOString().split('T')[0];
          } catch {
            return '';
          }
        };

        // Handle semester value
        let semesterValue = '';
        if (initialData.semester) {
          const semStr = initialData.semester.toString().toLowerCase();
          if (semStr.includes('semester')) {
            semesterValue = semStr;
          } else {
            const match = semStr.match(/\d+/);
            if (match) {
              semesterValue = `semester${match[0]}`;
            }
          }
        }

        setFormData({
          name: initialData.name || '',
          examTypeId: examTypeId,
          academicYear:
            initialData.academicYear ||
            new Date().getFullYear() + '-' + (new Date().getFullYear() + 1),
          semester: semesterValue,
          date: formatDateString(initialData.date),
          startTime: formatTimeString(initialData.startTime),
          endTime: formatTimeString(initialData.endTime),
          departmentId: initialData.departmentId?.toString() || '',
          batchId: initialData.batchId?.toString() || '',
          classroomId: initialData.classroomId?.toString() || '',
          description: initialData.description || '',
        });
      } else {
        setFormData({
          name: '',
          examTypeId: '',
          academicYear:
            new Date().getFullYear() + '-' + (new Date().getFullYear() + 1),
          semester: '',
          date: '',
          startTime: '',
          endTime: '',
          departmentId: '',
          batchId: '',
          classroomId: '',
          description: '',
        });
        setBatches([]);
        setClassrooms([]);
        setFilteredClassrooms([]);
      }
      setErrors({});
    }
  }, [isOpen, initialData]);

  // Fetch batches when departmentId changes (for both edit and new)
  useEffect(() => {
    if (isOpen && formData.departmentId) {
      fetchBatches(formData.departmentId);
    } else {
      setBatches([]);
    }
  }, [isOpen, formData.departmentId]);

  // Fetch classrooms when batchId changes and batches are loaded
  useEffect(() => {
    if (isOpen && formData.batchId && batches.length > 0) {
      fetchClassrooms(formData.batchId);
    } else {
      setClassrooms([]);
      setFilteredClassrooms([]);
    }
  }, [isOpen, formData.batchId, batches]);

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
      setFilteredClassrooms([]);
      return;
    }
    setClassroomsLoading(true);
    try {
      const selectedBatch = batches.find(
        (b) => b.id.toString() === batchId.toString()
      );
      const studentCount =
        selectedBatch?.studentCount || selectedBatch?._count?.students || 0;

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
        setClassrooms(fetchedClassrooms);

        const filtered = fetchedClassrooms.filter((c) => {
          const isAvailable =
            !c.batchId || c.batchId.toString() === batchId.toString();
          const hasCapacity =
            studentCount > 0 ? c.capacity >= studentCount : true;
          return isAvailable && hasCapacity;
        });
        setFilteredClassrooms(filtered);
      }
    } catch (error) {
      console.error('Error fetching classrooms:', error);
    } finally {
      setClassroomsLoading(false);
    }
  };

  const validateNewExamType = () => {
    const newErrors = {};
    if (!newExamType.name?.trim())
      newErrors.name = 'Exam type name is required';
    if (!newExamType.code?.trim())
      newErrors.code = 'Exam type code is required';
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
      setLocalExamTypes((prev) => [...prev, createdType]);
      setFormData((prev) => ({
        ...prev,
        examTypeId: createdType.id.toString(),
      }));
      if (onExamTypeCreated) onExamTypeCreated(createdType);
      setShowNewExamTypeModal(false);
      setNewExamType({ name: '', code: '', weightage: '', description: '' });
    } catch (error) {
      console.error('Error creating exam type:', error);
      setNewExamTypeErrors((prev) => ({ ...prev, submit: error.message }));
    } finally {
      setAddingExamType(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!isEditing && !formData.name?.trim()) {
      newErrors.name = 'Exam name is required';
    }
    if (!formData.examTypeId) {
      newErrors.examTypeId = 'Exam type is required';
    }
    if (!formData.date) {
      newErrors.date = 'Exam date is required';
    }
    if (formData.startTime && formData.endTime) {
      if (formData.startTime >= formData.endTime) {
        newErrors.endTime = 'End time must be after start time';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    setErrors((prev) => ({ ...prev, submit: null }));

    try {
      const examData = {
        name: formData.name.trim(),
        examTypeId: parseInt(formData.examTypeId),
        academicYear: formData.academicYear || null,
        semester: formData.semester || null,
        date: formData.date ? new Date(formData.date).toISOString() : null,
        startTime: formData.startTime || null,
        endTime: formData.endTime || null,
        departmentId: formData.departmentId
          ? parseInt(formData.departmentId)
          : null,
        batchId: formData.batchId ? parseInt(formData.batchId) : null,
        classroomId: formData.classroomId
          ? parseInt(formData.classroomId)
          : null,
        description: formData.description || null,
      };

      const url = isEditing ? `/api/exams/${initialData.id}` : '/api/exams';
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(examData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || `Failed to ${isEditing ? 'update' : 'create'} exam`
        );
      }

      await onSubmit(result);
      onClose();
    } catch (error) {
      console.error('Form submission error:', error);
      setErrors((prev) => ({ ...prev, submit: error.message }));
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const handleDepartmentChange = (departmentId) => {
    handleInputChange('departmentId', departmentId);
    handleInputChange('batchId', '');
    handleInputChange('classroomId', '');
  };

  const handleBatchChange = (batchId) => {
    handleInputChange('batchId', batchId);
    handleInputChange('classroomId', '');
  };

  if (!isOpen) return null;

  const isFormLoading = loading || submitting;

  return (
    <>
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
              className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:p-6"
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

              <div className="sm:flex sm:items-start">
                <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                  <h3 className="text-lg font-semibold leading-6 text-gray-900 flex items-center gap-2">
                    <Icons.BookOpen className="text-blue-600" size={20} />
                    {isEditing ? 'Edit Exam' : 'Schedule New Exam'}
                  </h3>

                  {isEditing && (
                    <p className="text-sm text-amber-600 mt-1 bg-amber-50 p-2 rounded-md">
                      ⚠️ Exam name cannot be changed when editing.
                    </p>
                  )}

                  {errors.submit && (
                    <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                      {errors.submit}
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Exam Name */}
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Exam Name{' '}
                          {!isEditing && (
                            <span className="text-red-500">*</span>
                          )}
                        </label>
                        <input
                          type="text"
                          required={!isEditing}
                          value={formData.name}
                          onChange={(e) =>
                            handleInputChange('name', e.target.value)
                          }
                          disabled={isFormLoading || isEditing}
                          readOnly={isEditing}
                          className={`mt-1 block w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-1 ${
                            errors.name
                              ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                              : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                          } ${
                            isEditing ? 'bg-gray-100 cursor-not-allowed' : ''
                          }`}
                          placeholder="e.g., First Term Examination 2024"
                        />
                        {errors.name && (
                          <p className="mt-1 text-xs text-red-600">
                            {errors.name}
                          </p>
                        )}
                      </div>

                      {/* Exam Type */}
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Exam Type <span className="text-red-500">*</span>
                        </label>
                        <div className="flex gap-2">
                          <select
                            required
                            value={formData.examTypeId}
                            onChange={(e) =>
                              handleInputChange('examTypeId', e.target.value)
                            }
                            className={`mt-1 block w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-1 ${
                              errors.examTypeId
                                ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                                : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                            }`}
                            disabled={isFormLoading}
                          >
                            <option value="">Select Exam Type</option>
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
                            className="mt-1 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center gap-1 whitespace-nowrap"
                            disabled={isFormLoading}
                          >
                            <Icons.Plus size={16} />
                            Add New
                          </button>
                        </div>
                        {errors.examTypeId && (
                          <p className="mt-1 text-xs text-red-600">
                            {errors.examTypeId}
                          </p>
                        )}
                      </div>

                      {/* Academic Year */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Academic Year
                        </label>
                        <input
                          type="text"
                          value={formData.academicYear}
                          onChange={(e) =>
                            handleInputChange('academicYear', e.target.value)
                          }
                          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="2024-2025"
                          disabled={isFormLoading}
                        />
                      </div>

                      {/* Semester */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Semester
                        </label>
                        <select
                          value={formData.semester}
                          onChange={(e) =>
                            handleInputChange('semester', e.target.value)
                          }
                          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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

                      {/* Date */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Exam Date <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          required
                          value={formData.date}
                          onChange={(e) =>
                            handleInputChange('date', e.target.value)
                          }
                          className={`mt-1 block w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-1 ${
                            errors.date
                              ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                              : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                          }`}
                          disabled={isFormLoading}
                        />
                        {errors.date && (
                          <p className="mt-1 text-xs text-red-600">
                            {errors.date}
                          </p>
                        )}
                      </div>

                      {/* Time */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Start Time
                          </label>
                          <input
                            type="time"
                            value={formData.startTime}
                            onChange={(e) =>
                              handleInputChange('startTime', e.target.value)
                            }
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            disabled={isFormLoading}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            End Time
                          </label>
                          <input
                            type="time"
                            value={formData.endTime}
                            onChange={(e) =>
                              handleInputChange('endTime', e.target.value)
                            }
                            className={`mt-1 block w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-1 ${
                              errors.endTime
                                ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                                : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                            }`}
                            disabled={isFormLoading}
                          />
                          {errors.endTime && (
                            <p className="mt-1 text-xs text-red-600">
                              {errors.endTime}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Department */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Department
                        </label>
                        <div className="relative">
                          <select
                            value={formData.departmentId}
                            onChange={(e) =>
                              handleDepartmentChange(e.target.value)
                            }
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                            disabled={isFormLoading || departmentsLoading}
                          >
                            <option value="">
                              {departmentsLoading
                                ? 'Loading...'
                                : 'Select Department'}
                            </option>
                            {departments.map((dept) => (
                              <option key={dept.id} value={dept.id}>
                                {dept.name} ({dept.code})
                              </option>
                            ))}
                          </select>
                          {departmentsLoading && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              <Icons.Loader2
                                size={16}
                                className="animate-spin text-gray-400"
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Batch */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Batch
                        </label>
                        <div className="relative">
                          <select
                            value={formData.batchId}
                            onChange={(e) => handleBatchChange(e.target.value)}
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                            disabled={
                              !formData.departmentId ||
                              batchesLoading ||
                              isFormLoading
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
                          {batchesLoading && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              <Icons.Loader2
                                size={16}
                                className="animate-spin text-gray-400"
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Classroom */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Classroom
                        </label>
                        <div className="relative">
                          <select
                            value={formData.classroomId}
                            onChange={(e) =>
                              handleInputChange('classroomId', e.target.value)
                            }
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                            disabled={
                              !formData.batchId ||
                              classroomsLoading ||
                              isFormLoading
                            }
                          >
                            <option value="">
                              {classroomsLoading
                                ? 'Loading...'
                                : 'Select Classroom'}
                            </option>
                            {filteredClassrooms.map((classroom) => (
                              <option key={classroom.id} value={classroom.id}>
                                {classroom.name} -{' '}
                                {classroom.building || 'Main'} (Capacity:{' '}
                                {classroom.capacity})
                              </option>
                            ))}
                          </select>
                          {classroomsLoading && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              <Icons.Loader2
                                size={16}
                                className="animate-spin text-gray-400"
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Description */}
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Description
                        </label>
                        <textarea
                          value={formData.description}
                          onChange={(e) =>
                            handleInputChange('description', e.target.value)
                          }
                          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          rows="2"
                          placeholder="Additional notes..."
                          disabled={isFormLoading}
                        />
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse gap-3">
                      <button
                        type="submit"
                        disabled={isFormLoading}
                        className="inline-flex w-full justify-center rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed sm:ml-3 sm:w-auto"
                      >
                        {isFormLoading ? (
                          <>
                            <Icons.Loader2
                              size={16}
                              className="animate-spin mr-2"
                            />
                            {isEditing ? 'Updating...' : 'Saving...'}
                          </>
                        ) : isEditing ? (
                          <>
                            <Icons.Save size={16} className="mr-2" />
                            Update Exam
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
                        disabled={isFormLoading}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </AnimatePresence>

      {/* New Exam Type Modal */}
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
                            ? 'border-red-500'
                            : 'border-gray-300'
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
                            ? 'border-red-500'
                            : 'border-gray-300'
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
    </>
  );
}
