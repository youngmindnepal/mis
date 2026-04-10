'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';

export default function BatchFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  loading,
}) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    academicYear: '',
    startDate: '',
    endDate: '',
    departmentId: '',
    status: 'active',
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchDepartments();
    }
  }, [isOpen]);

  const fetchDepartments = async () => {
    try {
      setLoadingDepartments(true);
      const response = await fetch('/api/departments?limit=1000');
      if (!response.ok) throw new Error('Failed to fetch departments');
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
      const formattedStartDate = initialData.startDate
        ? new Date(initialData.startDate).toISOString().split('T')[0]
        : '';
      const formattedEndDate = initialData.endDate
        ? new Date(initialData.endDate).toISOString().split('T')[0]
        : '';

      setFormData({
        name: initialData.name || '',
        description: initialData.description || '',
        academicYear: initialData.academicYear || '',
        startDate: formattedStartDate,
        endDate: formattedEndDate,
        departmentId: initialData.departmentId?.toString() || '',
        status: initialData.status || 'active',
        ...(initialData.id && { id: initialData.id }),
      });
    } else {
      setFormData({
        name: '',
        description: '',
        academicYear: '',
        startDate: '',
        endDate: '',
        departmentId: '',
        status: 'active',
      });
    }
    setErrors({});
    setSearchTerm('');
  }, [initialData, isOpen]);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Batch name is required';
    }
    if (formData.startDate && formData.endDate) {
      if (new Date(formData.endDate) < new Date(formData.startDate)) {
        newErrors.endDate = 'End date cannot be before start date';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const submitData = {
        name: formData.name.trim(),
        description: formData.description || null,
        academicYear: formData.academicYear || null,
        startDate: formData.startDate || null,
        endDate: formData.endDate || null,
        departmentId: formData.departmentId
          ? parseInt(formData.departmentId)
          : null,
        status: formData.status,
      };

      if (formData.id) {
        submitData.id = formData.id;
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

  const filteredDepartments = departments.filter((department) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      department.name?.toLowerCase().includes(searchLower) ||
      department.code?.toLowerCase().includes(searchLower)
    );
  });

  const selectedDepartment = departments.find(
    (d) => d.id === parseInt(formData.departmentId)
  );

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
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">
                {initialData?.id ? 'Edit Batch' : 'Add New Batch'}
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg"
                disabled={submitting}
              >
                <Icons.X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Batch Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    errors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="e.g., Batch 2024"
                  disabled={submitting}
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                )}
              </div>

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
                    placeholder="Search departments..."
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
                        className="p-1 hover:bg-indigo-200 rounded"
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
                        <p className="text-gray-500">No departments found</p>
                      </div>
                    ) : (
                      filteredDepartments.map((department) => (
                        <button
                          key={department.id}
                          type="button"
                          onClick={() =>
                            handleChange(
                              'departmentId',
                              department.id.toString()
                            )
                          }
                          className="w-full p-3 text-left hover:bg-gray-50 transition-colors border-b last:border-b-0 flex items-center gap-3"
                        >
                          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                            <Icons.Building2
                              size={16}
                              className="text-gray-600"
                            />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-800">
                              {department.name}
                            </p>
                            <p className="text-sm text-gray-500">
                              Code: {department.code}
                            </p>
                          </div>
                          <Icons.ChevronRight
                            size={16}
                            className="text-gray-400"
                          />
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Academic Year
                </label>
                <input
                  type="text"
                  value={formData.academicYear}
                  onChange={(e) => handleChange('academicYear', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g., 2024-2025"
                  disabled={submitting}
                />
              </div>

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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => handleChange('endDate', e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    errors.endDate ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={submitting}
                />
                {errors.endDate && (
                  <p className="mt-1 text-sm text-red-600">{errors.endDate}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Brief description..."
                  disabled={submitting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  disabled={submitting}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="completed">Completed</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <div className="pt-4 border-t flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || loading}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Icons.Loader2 size={18} className="animate-spin" />
                      {initialData?.id ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    <>
                      <Icons.Save size={18} />
                      {initialData?.id ? 'Update Batch' : 'Create Batch'}
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
