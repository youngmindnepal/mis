// components/CourseFormModal.js
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';

export default function CourseFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  loading,
}) {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    credits: '',
    description: '',
    lecture: 3,
    tutorial: 0,
    practical: 2,
    noncredit: false,
    couresetype: 'core',
    semester: 'semester1',
    syllabus: null,
    syllabusPreview: null,
    departmentId: '',
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef(null);

  // Fetch departments when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchDepartments();
    }
  }, [isOpen]);

  const fetchDepartments = async () => {
    try {
      setLoadingDepartments(true);
      const response = await fetch('/api/departments?limit=1000');
      if (!response.ok) {
        throw new Error('Failed to fetch departments');
      }
      const data = await response.json();
      setDepartments(data.departments || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
      setDepartments([]);
    } finally {
      setLoadingDepartments(false);
    }
  };

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        code: initialData.code || '',
        credits: initialData.credits?.toString() || '',
        description: initialData.description || '',
        lecture:
          initialData.lecture !== undefined ? parseInt(initialData.lecture) : 3,
        tutorial:
          initialData.tutorial !== undefined
            ? parseInt(initialData.tutorial)
            : 0,
        practical:
          initialData.practical !== undefined
            ? parseInt(initialData.practical)
            : 2,
        noncredit: initialData.noncredit || false,
        couresetype: initialData.couresetype || 'core',
        semester: initialData.semester || 'semester1',
        syllabus: null,
        syllabusPreview: initialData.syllabus || null,
        departmentId: initialData.departmentId?.toString() || '',
      });
    } else {
      setFormData({
        name: '',
        code: '',
        credits: '',
        description: '',
        lecture: 3,
        tutorial: 0,
        practical: 2,
        noncredit: false,
        couresetype: 'core',
        semester: 'semester1',
        syllabus: null,
        syllabusPreview: null,
        departmentId: '',
      });
    }
    setErrors({});
    setSearchTerm('');
  }, [initialData, isOpen]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Course name is required';
    }

    if (!formData.code.trim()) {
      newErrors.code = 'Course code is required';
    } else if (!/^[A-Z0-9]{3,10}$/.test(formData.code.toUpperCase())) {
      newErrors.code = 'Course code must be 3-10 alphanumeric characters';
    }

    if (
      formData.credits &&
      (parseInt(formData.credits) < 0 || parseInt(formData.credits) > 12)
    ) {
      newErrors.credits = 'Credits must be between 0 and 12';
    }

    if (
      formData.lecture !== undefined &&
      (formData.lecture < 0 || formData.lecture > 40)
    ) {
      newErrors.lecture = 'Lecture hours must be between 0 and 40';
    }

    if (
      formData.tutorial !== undefined &&
      (formData.tutorial < 0 || formData.tutorial > 20)
    ) {
      newErrors.tutorial = 'Tutorial hours must be between 0 and 20';
    }

    if (
      formData.practical !== undefined &&
      (formData.practical < 0 || formData.practical > 30)
    ) {
      newErrors.practical = 'Practical hours must be between 0 and 30';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSyllabusChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ];
      if (!allowedTypes.includes(file.type)) {
        setErrors({
          ...errors,
          syllabus: 'Please select a PDF or Word document',
        });
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        setErrors({ ...errors, syllabus: 'File size must be less than 10MB' });
        return;
      }

      setFormData({
        ...formData,
        syllabus: file,
        syllabusPreview: file.name,
      });
      setErrors({ ...errors, syllabus: null });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const submitData = new FormData();

      submitData.append('name', formData.name.trim());
      submitData.append('code', formData.code.trim().toUpperCase());
      submitData.append('credits', formData.credits || '0');
      submitData.append('description', formData.description || '');
      submitData.append('lecture', formData.lecture.toString());
      submitData.append('tutorial', formData.tutorial.toString());
      submitData.append('practical', formData.practical.toString());
      submitData.append('noncredit', formData.noncredit.toString());
      submitData.append('couresetype', formData.couresetype);
      submitData.append('semester', formData.semester);
      submitData.append('departmentId', formData.departmentId || '');

      if (formData.syllabus && formData.syllabus instanceof File) {
        submitData.append('syllabus', formData.syllabus);
      }

      await onSubmit(submitData);
      onClose();
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const handleNumberChange = (field, value) => {
    const numValue = value === '' ? 0 : parseInt(value);
    setFormData((prev) => ({
      ...prev,
      [field]: isNaN(numValue) ? 0 : numValue,
    }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const filteredDepartments = departments.filter((dept) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (dept.name && dept.name.toLowerCase().includes(searchLower)) ||
      (dept.code && dept.code.toLowerCase().includes(searchLower))
    );
  });

  const selectedDepartment = departments.find(
    (d) => d.id === parseInt(formData.departmentId)
  );

  if (!isOpen) return null;

  const courseTypes = [
    { value: 'core', label: 'Core Course' },
    { value: 'elective', label: 'Elective Course' },
  ];

  const semesters = [
    { value: 'semester1', label: 'Semester 1' },
    { value: 'semester2', label: 'Semester 2' },
    { value: 'semester3', label: 'Semester 3' },
    { value: 'semester4', label: 'Semester 4' },
    { value: 'semester5', label: 'Semester 5' },
    { value: 'semester6', label: 'Semester 6' },
    { value: 'semester7', label: 'Semester 7' },
    { value: 'semester8', label: 'Semester 8' },
  ];

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
            className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">
                {initialData ? 'Edit Course' : 'Add New Course'}
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={submitting}
              >
                <Icons.X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Course Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
                    Course Information
                  </h3>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Course Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        errors.name ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="e.g., Introduction to Computer Science"
                      disabled={submitting}
                    />
                    {errors.name && (
                      <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Course Code *
                    </label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) => handleChange('code', e.target.value)}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        errors.code ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="e.g., CS101"
                      disabled={submitting}
                    />
                    {errors.code && (
                      <p className="mt-1 text-sm text-red-600">{errors.code}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Credits
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={formData.credits}
                      onChange={(e) => handleChange('credits', e.target.value)}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        errors.credits ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Number of credits"
                      disabled={submitting}
                    />
                    {errors.credits && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.credits}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Course Type
                    </label>
                    <select
                      value={formData.couresetype}
                      onChange={(e) =>
                        handleChange('couresetype', e.target.value)
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      disabled={submitting}
                    >
                      {courseTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Semester
                    </label>
                    <select
                      value={formData.semester}
                      onChange={(e) => handleChange('semester', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      disabled={submitting}
                    >
                      {semesters.map((sem) => (
                        <option key={sem.value} value={sem.value}>
                          {sem.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.noncredit}
                        onChange={(e) =>
                          handleChange('noncredit', e.target.checked)
                        }
                        className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                        disabled={submitting}
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Non-Credit Course
                      </span>
                    </label>
                  </div>
                </div>

                {/* Department and Hours */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
                    Department & Hours
                  </h3>

                  {/* Department Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Department
                    </label>

                    <div className="relative mb-2">
                      <Icons.Search
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        size={18}
                      />
                      <input
                        type="text"
                        placeholder="Search departments by name or code..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        disabled={submitting || loadingDepartments}
                      />
                    </div>

                    {selectedDepartment && (
                      <div className="mb-3 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                            <Icons.Building2
                              size={20}
                              className="text-indigo-600"
                            />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-800">
                              {selectedDepartment.name}
                            </p>
                            <p className="text-sm text-gray-600">
                              Code: {selectedDepartment.code}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleChange('departmentId', '')}
                            className="p-1 hover:bg-indigo-200 rounded transition-colors"
                            disabled={submitting}
                          >
                            <Icons.X size={16} className="text-indigo-600" />
                          </button>
                        </div>
                      </div>
                    )}

                    {!selectedDepartment && (
                      <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                        {loadingDepartments ? (
                          <div className="flex items-center justify-center py-8">
                            <Icons.Loader2
                              size={24}
                              className="animate-spin text-indigo-600"
                            />
                          </div>
                        ) : filteredDepartments.length === 0 ? (
                          <div className="text-center py-8">
                            <Icons.Building2
                              size={32}
                              className="text-gray-400 mx-auto mb-2"
                            />
                            <p className="text-gray-500">
                              {searchTerm
                                ? 'No departments found'
                                : 'No departments available'}
                            </p>
                          </div>
                        ) : (
                          filteredDepartments.map((dept) => (
                            <button
                              key={dept.id}
                              type="button"
                              onClick={() =>
                                handleChange('departmentId', dept.id.toString())
                              }
                              className="w-full p-3 text-left hover:bg-gray-50 transition-colors border-b last:border-b-0"
                              disabled={submitting}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                                  <Icons.Building2
                                    size={16}
                                    className="text-gray-600"
                                  />
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium text-gray-800">
                                    {dept.name}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    Code: {dept.code}
                                  </p>
                                </div>
                                <Icons.ChevronRight
                                  size={16}
                                  className="text-gray-400"
                                />
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {/* Lecture Hours */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Lecture Hours
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="40"
                      value={formData.lecture}
                      onChange={(e) =>
                        handleNumberChange('lecture', e.target.value)
                      }
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        errors.lecture ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Lecture hours per week"
                      disabled={submitting}
                    />
                    {errors.lecture && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.lecture}
                      </p>
                    )}
                  </div>

                  {/* Tutorial Hours */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tutorial Hours
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="20"
                      value={formData.tutorial}
                      onChange={(e) =>
                        handleNumberChange('tutorial', e.target.value)
                      }
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        errors.tutorial ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Tutorial hours per week"
                      disabled={submitting}
                    />
                    {errors.tutorial && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.tutorial}
                      </p>
                    )}
                  </div>

                  {/* Practical Hours */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Practical Hours
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="30"
                      value={formData.practical}
                      onChange={(e) =>
                        handleNumberChange('practical', e.target.value)
                      }
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        errors.practical ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Practical hours per week"
                      disabled={submitting}
                    />
                    {errors.practical && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.practical}
                      </p>
                    )}
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-4 md:col-span-2">
                  <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
                    Description
                  </h3>

                  <div>
                    <textarea
                      value={formData.description}
                      onChange={(e) =>
                        handleChange('description', e.target.value)
                      }
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Course description, objectives, prerequisites..."
                      disabled={submitting}
                    />
                  </div>
                </div>

                {/* Syllabus Upload */}
                <div className="space-y-4 md:col-span-2">
                  <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
                    Syllabus
                  </h3>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Course Syllabus
                    </label>
                    <div className="flex items-center gap-4">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={handleSyllabusChange}
                        className="hidden"
                        id="syllabus-upload"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
                      >
                        <Icons.Upload size={18} />
                        Upload Syllabus
                      </button>
                      {formData.syllabusPreview && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Icons.FileText size={16} />
                          <span>{formData.syllabusPreview}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setFormData({
                                ...formData,
                                syllabus: null,
                                syllabusPreview: null,
                              });
                              if (fileInputRef.current) {
                                fileInputRef.current.value = '';
                              }
                            }}
                            className="p-1 hover:bg-gray-100 rounded"
                          >
                            <Icons.X size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Supported formats: PDF, DOC, DOCX. Max size: 10MB
                    </p>
                    {errors.syllabus && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.syllabus}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || loading}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Icons.Loader2 size={18} className="animate-spin" />
                      {initialData ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    <>
                      <Icons.Save size={18} />
                      {initialData ? 'Update Course' : 'Create Course'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
