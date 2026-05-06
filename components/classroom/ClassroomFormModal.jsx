// components/classroom/ClassroomFormModal.jsx
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';

// Custom Searchable Dropdown Component
function SearchableSelect({
  value,
  onChange,
  options,
  placeholder,
  label,
  error,
  disabled,
  searchPlaceholder,
  required,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const query = search.toLowerCase();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(query) ||
        (opt.subLabel && opt.subLabel.toLowerCase().includes(query))
    );
  }, [options, search]);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const handleSelect = (optionValue) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label} {required && '*'}
        </label>
      )}
      <button
        type="button"
        onClick={() => {
          if (!disabled) {
            setIsOpen(!isOpen);
            if (!isOpen) setSearch('');
          }
        }}
        disabled={disabled}
        className={`w-full px-4 py-2 border rounded-lg text-left focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors ${
          error ? 'border-red-500' : 'border-gray-300'
        } ${
          disabled
            ? 'bg-gray-100 cursor-not-allowed'
            : 'bg-white hover:border-gray-400'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className={selectedOption ? 'text-gray-900' : 'text-gray-400'}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <Icons.ChevronDown
            size={18}
            className={`text-gray-400 transition-transform ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </div>
      </button>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-hidden"
          >
            <div className="sticky top-0 bg-white border-b border-gray-100 p-2">
              <div className="relative">
                <Icons.Search
                  size={16}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={searchPlaceholder || 'Search...'}
                  className="w-full pl-9 pr-8 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  onClick={(e) => e.stopPropagation()}
                />
                {search && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSearch('');
                    }}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <Icons.X size={14} />
                  </button>
                )}
              </div>
            </div>
            <div className="overflow-y-auto max-h-48">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelect(option.value)}
                    className={`w-full px-4 py-2.5 text-left hover:bg-indigo-50 transition-colors flex items-center justify-between ${
                      option.value === value
                        ? 'bg-indigo-50 text-indigo-700 font-medium'
                        : 'text-gray-700'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <span className="text-sm">{option.label}</span>
                      {option.subLabel && (
                        <span className="text-xs text-gray-400 ml-2">
                          {option.subLabel}
                        </span>
                      )}
                    </div>
                    {option.value === value && (
                      <Icons.Check
                        size={16}
                        className="text-indigo-600 flex-shrink-0 ml-2"
                      />
                    )}
                  </button>
                ))
              ) : (
                <div className="px-4 py-3 text-sm text-gray-500 text-center">
                  No results found
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ==================== MAIN FORM MODAL ====================
export default function ClassroomFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  loading,
}) {
  const [formData, setFormData] = useState({
    name: '',
    startDate: '',
    endDate: '',
    capacity: '',
    courseId: '',
    facultyId: '',
    batchId: '',
    departmentId: '',
    status: 'active', // ADDED status field
  });
  const [errors, setErrors] = useState({});
  const [courses, setCourses] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [batches, setBatches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchCourses();
      fetchFaculties();
      fetchBatches();
      fetchDepartments();
    }
  }, [isOpen]);

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        startDate: initialData.startDate
          ? new Date(initialData.startDate).toISOString().split('T')[0]
          : '',
        endDate: initialData.endDate
          ? new Date(initialData.endDate).toISOString().split('T')[0]
          : '',
        capacity: initialData.capacity || '',
        courseId: initialData.courseId ? String(initialData.courseId) : '',
        facultyId: initialData.facultyId ? String(initialData.facultyId) : '',
        batchId: initialData.batchId ? String(initialData.batchId) : '',
        departmentId: initialData.departmentId
          ? String(initialData.departmentId)
          : '',
        status: initialData.status || 'active', // ADDED
      });
    } else {
      setFormData({
        name: '',
        startDate: '',
        endDate: '',
        capacity: '',
        courseId: '',
        facultyId: '',
        batchId: '',
        departmentId: '',
        status: 'active',
      });
    }
    setErrors({});
  }, [initialData, isOpen]);

  const fetchCourses = async () => {
    try {
      const r = await fetch('/api/courses?limit=200');
      if (r.ok) setCourses((await r.json()).courses || []);
    } catch {}
  };
  const fetchFaculties = async () => {
    try {
      const r = await fetch('/api/faculty/list?limit=200');
      if (r.ok) setFaculties((await r.json()).faculties || []);
    } catch {}
  };
  const fetchBatches = async () => {
    try {
      const r = await fetch('/api/batches?limit=200');
      if (r.ok) setBatches((await r.json()).batches || []);
    } catch {}
  };
  const fetchDepartments = async () => {
    try {
      const r = await fetch('/api/departments?limit=200');
      if (r.ok) setDepartments((await r.json()).departments || []);
    } catch {}
  };

  const courseOptions = useMemo(
    () =>
      courses
        .map((c) => ({
          value: String(c.id),
          label: c.name,
          subLabel: c.code || '',
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [courses]
  );
  const facultyOptions = useMemo(
    () =>
      faculties
        .map((f) => ({
          value: String(f.id),
          label: f.name,
          subLabel: f.designation || f.department?.name || '',
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [faculties]
  );
  const batchOptions = useMemo(
    () =>
      batches
        .map((b) => ({
          value: String(b.id),
          label: b.name,
          subLabel: b.academicYear || '',
        }))
        .sort((a, b) => {
          const yc = (b.subLabel || '').localeCompare(a.subLabel || '');
          if (yc !== 0) return yc;
          return a.label.localeCompare(b.label);
        }),
    [batches]
  );
  const departmentOptions = useMemo(
    () =>
      departments
        .map((d) => ({
          value: String(d.id),
          label: d.name,
          subLabel: d.code || '',
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [departments]
  );

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Classroom name is required';
    if (!formData.courseId) newErrors.courseId = 'Course is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      const submitData = new FormData();
      if (initialData?.id) submitData.append('id', initialData.id);
      submitData.append('name', formData.name.trim());
      submitData.append('startDate', formData.startDate);
      submitData.append('endDate', formData.endDate);
      submitData.append('capacity', formData.capacity);
      submitData.append('courseId', formData.courseId);
      submitData.append('facultyId', formData.facultyId);
      submitData.append('batchId', formData.batchId);
      submitData.append('departmentId', formData.departmentId);
      submitData.append('status', formData.status); // ADDED
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
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: null }));
  };

  if (!isOpen) return null;

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
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center z-10">
              <div>
                <h2 className="text-xl font-bold text-gray-800">
                  {initialData ? 'Edit Classroom' : 'Add New Classroom'}
                </h2>
                {initialData && (
                  <p className="text-sm text-gray-500 mt-0.5">
                    Current Status:{' '}
                    <span
                      className={`font-medium ${
                        initialData.status === 'archived'
                          ? 'text-red-600'
                          : 'text-green-600'
                      }`}
                    >
                      {initialData.status || 'active'}
                    </span>
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={submitting}
              >
                <Icons.X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Status Toggle - Active / Inactive */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-800">
                      Classroom Status
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {formData.status === 'active'
                        ? 'Classroom is active and visible in listings'
                        : 'Classroom is archived and hidden by default'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleChange(
                        'status',
                        formData.status === 'active' ? 'archived' : 'active'
                      )
                    }
                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                      formData.status === 'active'
                        ? 'bg-green-500'
                        : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-sm ${
                        formData.status === 'active'
                          ? 'translate-x-6'
                          : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      formData.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {formData.status === 'active' ? '🟢 Active' : '🔴 Inactive'}
                  </span>
                  <span className="text-xs text-gray-400">
                    {formData.status === 'active'
                      ? 'Students can be enrolled and sessions can be created'
                      : 'Classroom is hidden from main view but data is preserved'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Classroom Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Classroom Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      errors.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="e.g., Room 101, CS Lab"
                    disabled={submitting}
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                  )}
                </div>

                {/* Capacity */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Capacity
                  </label>
                  <input
                    type="number"
                    value={formData.capacity}
                    onChange={(e) => handleChange('capacity', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Number of students"
                    min="1"
                    disabled={submitting}
                  />
                </div>

                {/* Course */}
                <div>
                  <SearchableSelect
                    value={formData.courseId}
                    onChange={(v) => handleChange('courseId', v)}
                    options={courseOptions}
                    placeholder="Select Course"
                    label="Course"
                    required
                    error={errors.courseId}
                    disabled={submitting}
                    searchPlaceholder="Search courses..."
                  />
                </div>

                {/* Faculty */}
                <div>
                  <SearchableSelect
                    value={formData.facultyId}
                    onChange={(v) => handleChange('facultyId', v)}
                    options={facultyOptions}
                    placeholder="Select Faculty"
                    label="Faculty"
                    disabled={submitting}
                    searchPlaceholder="Search faculty..."
                  />
                </div>

                {/* Batch */}
                <div>
                  <SearchableSelect
                    value={formData.batchId}
                    onChange={(v) => handleChange('batchId', v)}
                    options={batchOptions}
                    placeholder="Select Batch"
                    label="Batch"
                    disabled={submitting}
                    searchPlaceholder="Search batches..."
                  />
                </div>

                {/* Department */}
                <div>
                  <SearchableSelect
                    value={formData.departmentId}
                    onChange={(v) => handleChange('departmentId', v)}
                    options={departmentOptions}
                    placeholder="Select Department"
                    label="Department"
                    disabled={submitting}
                    searchPlaceholder="Search departments..."
                  />
                </div>

                {/* Start Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => handleChange('startDate', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    disabled={submitting}
                  />
                </div>

                {/* End Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => handleChange('endDate', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    disabled={submitting}
                  />
                </div>
              </div>

              {/* Form Actions */}
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
                      {initialData ? 'Update Classroom' : 'Create Classroom'}
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
