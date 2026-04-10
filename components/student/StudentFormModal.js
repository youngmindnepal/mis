// components/student/StudentFormModal.jsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';

export default function StudentFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  loading,
}) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    rollNo: '', // Changed from rollNumber to rollNo to match schema
    enrollmentNo: '', // Changed from registrationNumber to enrollmentNo
    examRollNumber: '',
    enrollmentDate: new Date().toISOString().split('T')[0],
    dateOfBirth: '',
    bloodGroup: '',
    guardianName: '',
    guardianContact: '',
    guardianEmail: '',
    emergencyContact: '',
    batchId: '',
    status: 'active',
    photo: null,
    photoPreview: null,
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [batches, setBatches] = useState([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef(null);

  // Fetch batches when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchBatches();
    }
  }, [isOpen]);

  const fetchBatches = async () => {
    try {
      setLoadingBatches(true);
      const response = await fetch('/api/batches?limit=1000');
      if (!response.ok) {
        throw new Error('Failed to fetch batches');
      }
      const data = await response.json();
      setBatches(data.batches || []);
    } catch (error) {
      console.error('Error fetching batches:', error);
      setBatches([]);
    } finally {
      setLoadingBatches(false);
    }
  };

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.user?.name || initialData.name || '',
        email: initialData.user?.email || initialData.email || '',
        phone: initialData.phone || '',
        address: initialData.address || '',
        rollNo: initialData.rollNo || initialData.rollNumber || '', // Handle both field names
        enrollmentNo:
          initialData.enrollmentNo || initialData.registrationNumber || '',
        examRollNumber: initialData.examRollNumber || '',
        enrollmentDate: initialData.enrollmentDate
          ? new Date(initialData.enrollmentDate).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
        dateOfBirth: initialData.dateOfBirth
          ? new Date(initialData.dateOfBirth).toISOString().split('T')[0]
          : '',
        bloodGroup: initialData.bloodGroup || '',
        guardianName: initialData.guardianName || '',
        guardianContact: initialData.guardianContact || '',
        guardianEmail: initialData.guardianEmail || '',
        emergencyContact: initialData.emergencyContact || '',
        batchId: initialData.batchId?.toString() || '',
        status: initialData.status || 'active',
        photo: null,
        photoPreview: initialData.profilePicture || initialData.photo || null,
      });
    } else {
      setFormData({
        name: '',
        email: '',
        phone: '',
        address: '',
        rollNo: '',
        enrollmentNo: '',
        examRollNumber: '',
        enrollmentDate: new Date().toISOString().split('T')[0],
        dateOfBirth: '',
        bloodGroup: '',
        guardianName: '',
        guardianContact: '',
        guardianEmail: '',
        emergencyContact: '',
        batchId: '',
        status: 'active',
        photo: null,
        photoPreview: null,
      });
    }
    setErrors({});
    setSearchTerm('');
  }, [initialData, isOpen]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Student name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^[0-9]{10}$/.test(formData.phone.replace(/\D/g, ''))) {
      newErrors.phone = 'Phone number must be 10 digits';
    }

    if (formData.dateOfBirth) {
      const dob = new Date(formData.dateOfBirth);
      const today = new Date();
      const age = today.getFullYear() - dob.getFullYear();
      if (age < 5 || age > 100) {
        newErrors.dateOfBirth = 'Age must be between 5 and 100 years';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setErrors({ ...errors, photo: 'Please select an image file' });
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setErrors({ ...errors, photo: 'File size must be less than 5MB' });
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({
          ...formData,
          photo: file,
          photoPreview: reader.result,
        });
      };
      reader.readAsDataURL(file);
      setErrors({ ...errors, photo: null });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const submitData = new FormData();

      // Student fields (using correct schema field names)
      submitData.append('name', formData.name.trim());
      submitData.append('email', formData.email.trim());
      submitData.append('phone', formData.phone.trim());
      submitData.append('address', formData.address || '');

      // IMPORTANT: Use 'rollNo' not 'rollNumber' to match schema
      submitData.append('rollNo', formData.rollNo || '');
      submitData.append('enrollmentNo', formData.enrollmentNo || '');
      submitData.append('examRollNumber', formData.examRollNumber || '');

      submitData.append('enrollmentDate', formData.enrollmentDate);
      submitData.append('dateOfBirth', formData.dateOfBirth || '');
      submitData.append('bloodGroup', formData.bloodGroup || '');
      submitData.append('guardianName', formData.guardianName || '');
      submitData.append('guardianContact', formData.guardianContact || '');
      submitData.append('guardianEmail', formData.guardianEmail || '');
      submitData.append('emergencyContact', formData.emergencyContact || '');
      submitData.append('batchId', formData.batchId || '');
      submitData.append('status', formData.status);

      if (formData.photo && formData.photo instanceof File) {
        submitData.append('profilePicture', formData.photo);
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

  const filteredBatches = batches.filter((batch) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (batch.name && batch.name.toLowerCase().includes(searchLower)) ||
      (batch.academicYear &&
        batch.academicYear.toLowerCase().includes(searchLower))
    );
  });

  const selectedBatch = batches.find(
    (b) => b.id === parseInt(formData.batchId)
  );

  if (!isOpen) return null;

  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

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
                {initialData ? 'Edit Student' : 'Add New Student'}
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
              {/* Photo Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Student Photo
                </label>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    {formData.photoPreview ? (
                      <div className="relative">
                        <img
                          src={formData.photoPreview}
                          alt="Student preview"
                          className="w-24 h-24 rounded-full object-cover border-2 border-indigo-200"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setFormData({
                              ...formData,
                              photo: null,
                              photoPreview: null,
                            });
                            if (fileInputRef.current) {
                              fileInputRef.current.value = '';
                            }
                          }}
                          className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                        >
                          <Icons.X size={12} />
                        </button>
                      </div>
                    ) : (
                      <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center border-2 border-dashed border-gray-300">
                        <Icons.Camera size={32} className="text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="hidden"
                      id="photo-upload"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Choose Photo
                    </button>
                    <p className="text-xs text-gray-500 mt-1">
                      Max size: 5MB. Supported formats: JPG, PNG, GIF
                    </p>
                  </div>
                </div>
                {errors.photo && (
                  <p className="mt-1 text-sm text-red-600">{errors.photo}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Personal Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
                    Personal Information
                  </h3>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        errors.name ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter student's full name"
                      disabled={submitting}
                    />
                    {errors.name && (
                      <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        errors.email ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="student@example.com"
                      disabled={submitting}
                    />
                    {errors.email && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.email}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        errors.phone ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="10-digit mobile number"
                      disabled={submitting}
                    />
                    {errors.phone && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.phone}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) =>
                        handleChange('dateOfBirth', e.target.value)
                      }
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        errors.dateOfBirth
                          ? 'border-red-500'
                          : 'border-gray-300'
                      }`}
                      disabled={submitting}
                    />
                    {errors.dateOfBirth && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.dateOfBirth}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Blood Group
                    </label>
                    <select
                      value={formData.bloodGroup}
                      onChange={(e) =>
                        handleChange('bloodGroup', e.target.value)
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      disabled={submitting}
                    >
                      <option value="">Select Blood Group</option>
                      {bloodGroups.map((bg) => (
                        <option key={bg} value={bg}>
                          {bg}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Academic Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
                    Academic Information
                  </h3>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Roll Number
                    </label>
                    <input
                      type="text"
                      value={formData.rollNo}
                      onChange={(e) => handleChange('rollNo', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="e.g., 2024CS001"
                      disabled={submitting}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Enrollment Number
                    </label>
                    <input
                      type="text"
                      value={formData.enrollmentNo}
                      onChange={(e) =>
                        handleChange('enrollmentNo', e.target.value)
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="University enrollment number"
                      disabled={submitting}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Exam Roll Number
                    </label>
                    <input
                      type="text"
                      value={formData.examRollNumber}
                      onChange={(e) =>
                        handleChange('examRollNumber', e.target.value)
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Exam roll number"
                      disabled={submitting}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Enrollment Date
                    </label>
                    <input
                      type="date"
                      value={formData.enrollmentDate}
                      onChange={(e) =>
                        handleChange('enrollmentDate', e.target.value)
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      disabled={submitting}
                    />
                  </div>

                  {/* Batch Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Batch
                    </label>

                    <div className="relative mb-2">
                      <Icons.Search
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        size={18}
                      />
                      <input
                        type="text"
                        placeholder="Search batches by name or academic year..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        disabled={submitting || loadingBatches}
                      />
                    </div>

                    {selectedBatch && (
                      <div className="mb-3 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                            <Icons.GraduationCap
                              size={20}
                              className="text-indigo-600"
                            />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-800">
                              {selectedBatch.name}
                            </p>
                            <p className="text-sm text-gray-600">
                              {selectedBatch.academicYear}
                            </p>
                            {selectedBatch.department && (
                              <p className="text-xs text-gray-500">
                                Department: {selectedBatch.department.name}
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleChange('batchId', '')}
                            className="p-1 hover:bg-indigo-200 rounded transition-colors"
                            disabled={submitting}
                          >
                            <Icons.X size={16} className="text-indigo-600" />
                          </button>
                        </div>
                      </div>
                    )}

                    {!selectedBatch && (
                      <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                        {loadingBatches ? (
                          <div className="flex items-center justify-center py-8">
                            <Icons.Loader2
                              size={24}
                              className="animate-spin text-indigo-600"
                            />
                          </div>
                        ) : filteredBatches.length === 0 ? (
                          <div className="text-center py-8">
                            <Icons.GraduationCap
                              size={32}
                              className="text-gray-400 mx-auto mb-2"
                            />
                            <p className="text-gray-500">
                              {searchTerm
                                ? 'No batches found'
                                : 'No batches available'}
                            </p>
                          </div>
                        ) : (
                          filteredBatches.map((batch) => (
                            <button
                              key={batch.id}
                              type="button"
                              onClick={() =>
                                handleChange('batchId', batch.id.toString())
                              }
                              className="w-full p-3 text-left hover:bg-gray-50 transition-colors border-b last:border-b-0"
                              disabled={submitting}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                                  <Icons.GraduationCap
                                    size={16}
                                    className="text-gray-600"
                                  />
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium text-gray-800">
                                    {batch.name}
                                  </p>
                                  <div className="flex gap-2 text-xs text-gray-500">
                                    <span>{batch.academicYear}</span>
                                    {batch.department && (
                                      <span>• {batch.department.name}</span>
                                    )}
                                  </div>
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
                </div>

                {/* Guardian Information */}
                <div className="space-y-4 md:col-span-2">
                  <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
                    Guardian Information
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Guardian Name
                      </label>
                      <input
                        type="text"
                        value={formData.guardianName}
                        onChange={(e) =>
                          handleChange('guardianName', e.target.value)
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Parent or guardian's full name"
                        disabled={submitting}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Guardian Contact
                      </label>
                      <input
                        type="tel"
                        value={formData.guardianContact}
                        onChange={(e) =>
                          handleChange('guardianContact', e.target.value)
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Guardian's phone number"
                        disabled={submitting}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Guardian Email
                      </label>
                      <input
                        type="email"
                        value={formData.guardianEmail}
                        onChange={(e) =>
                          handleChange('guardianEmail', e.target.value)
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Guardian's email address"
                        disabled={submitting}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Emergency Contact
                      </label>
                      <input
                        type="tel"
                        value={formData.emergencyContact}
                        onChange={(e) =>
                          handleChange('emergencyContact', e.target.value)
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Alternative emergency number"
                        disabled={submitting}
                      />
                    </div>
                  </div>
                </div>

                {/* Address */}
                <div className="space-y-4 md:col-span-2">
                  <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
                    Address
                  </h3>

                  <div>
                    <textarea
                      value={formData.address}
                      onChange={(e) => handleChange('address', e.target.value)}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Student's residential address"
                      disabled={submitting}
                    />
                  </div>
                </div>

                {/* Status */}
                <div className="space-y-4 md:col-span-2">
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
                      <option value="graduated">Graduated</option>
                      <option value="transferred">Transferred</option>
                      <option value="suspended">Suspended</option>
                    </select>
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
                      {initialData ? 'Update Student' : 'Create Student'}
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
