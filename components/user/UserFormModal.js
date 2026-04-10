'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';
import Image from 'next/image';

export default function UserFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  loading,
}) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    address: '',
    status: 'active',
    roleId: '',
    profilePicture: '',
  });
  const [errors, setErrors] = useState({});
  const [availableRoles, setAvailableRoles] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: '' });
  const fileInputRef = useRef(null);
  const toastTimeoutRef = useRef(null);
  const closeModalTimeoutRef = useRef(null);

  // Cleanup all timeouts on unmount
  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
      if (closeModalTimeoutRef.current) {
        clearTimeout(closeModalTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchRoles();
    }
  }, [isOpen]);

  // Populate form when editing
  useEffect(() => {
    if (initialData) {
      console.log('Editing user data:', initialData);

      let roleIdValue = '';
      if (initialData.roleId) {
        roleIdValue = initialData.roleId.toString();
      } else if (initialData.role && initialData.role.id) {
        roleIdValue = initialData.role.id.toString();
      }

      setFormData({
        name: initialData.name || '',
        email: initialData.email || '',
        password: '',
        phone: initialData.phone || '',
        address: initialData.address || '',
        status: initialData.status || 'active',
        roleId: roleIdValue,
        profilePicture: initialData.profilePicture || '',
      });
      setPreviewImage(initialData.profilePicture || '');
    } else {
      setFormData({
        name: '',
        email: '',
        password: '',
        phone: '',
        address: '',
        status: 'active',
        roleId: '',
        profilePicture: '',
      });
      setPreviewImage('');
    }
    setErrors({});
  }, [initialData, isOpen]);

  const showToast = (message, type = 'success') => {
    // Clear existing timeout
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }

    // Clear any existing toast
    setToast({ show: false, message: '', type: '' });

    // Small delay to ensure the previous toast is gone
    setTimeout(() => {
      setToast({ show: true, message, type });

      // Auto hide after 3 seconds
      toastTimeoutRef.current = setTimeout(() => {
        setToast({ show: false, message: '', type: '' });
        toastTimeoutRef.current = null;
      }, 3000);
    }, 100);
  };

  const fetchRoles = async () => {
    try {
      setRolesLoading(true);
      const response = await fetch('/api/roles');
      if (!response.ok) throw new Error('Failed to fetch roles');
      const data = await response.json();
      setAvailableRoles(data);
    } catch (error) {
      console.error('Error fetching roles:', error);
      showToast('Failed to load roles', 'error');
    } finally {
      setRolesLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email?.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!initialData && !formData.password) {
      newErrors.password = 'Password is required for new users';
    } else if (formData.password && formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!formData.roleId) {
      newErrors.roleId = 'Please select a role';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    const submitData = new FormData();

    submitData.append('name', formData.name.trim());
    submitData.append('email', formData.email.trim());
    submitData.append('phone', formData.phone || '');
    submitData.append('address', formData.address || '');
    submitData.append('status', formData.status);
    submitData.append('roleId', formData.roleId.toString());

    if (formData.password) {
      submitData.append('password', formData.password);
    }

    if (
      formData.profilePicture &&
      formData.profilePicture.startsWith('data:image')
    ) {
      const response = await fetch(formData.profilePicture);
      const blob = await response.blob();
      submitData.append('profilePicture', blob, 'avatar.jpg');
    }

    try {
      await onSubmit(submitData);
      showToast(
        initialData
          ? 'User updated successfully!'
          : 'User created successfully!',
        'success'
      );

      // Close modal after 1.5 seconds to show success message
      if (closeModalTimeoutRef.current) {
        clearTimeout(closeModalTimeoutRef.current);
      }
      closeModalTimeoutRef.current = setTimeout(() => {
        onClose();
        closeModalTimeoutRef.current = null;
      }, 1500);
    } catch (error) {
      console.error('Error submitting form:', error);
      showToast(error.message || 'Failed to save user', 'error');
    }
  };

  const selectRole = (roleId) => {
    setFormData((prev) => ({
      ...prev,
      roleId: roleId,
    }));
    if (errors.roleId) {
      setErrors((prev) => ({ ...prev, roleId: null }));
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrors({ ...errors, profilePicture: 'Please upload an image file' });
      showToast('Please upload an image file', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrors({ ...errors, profilePicture: 'Image must be less than 5MB' });
      showToast('Image must be less than 5MB', 'error');
      return;
    }

    try {
      setUploadingImage(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result;
        setPreviewImage(base64String);
        setFormData({ ...formData, profilePicture: base64String });
        setErrors({ ...errors, profilePicture: null });
        setUploadingImage(false);
        showToast('Image uploaded successfully!', 'success');
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading image:', error);
      setErrors({ ...errors, profilePicture: 'Failed to upload image' });
      showToast('Failed to upload image', 'error');
      setUploadingImage(false);
    }
  };

  const clearImage = () => {
    setFormData({ ...formData, profilePicture: '' });
    setPreviewImage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    showToast('Image removed', 'info');
  };

  const getRoleBadgeColor = (roleName) => {
    const colors = {
      SYSTEM_ADMIN: 'bg-purple-100 text-purple-800 border-purple-200',
      ADMIN: 'bg-blue-100 text-blue-800 border-blue-200',
      COORDINATOR: 'bg-green-100 text-green-800 border-green-200',
      COUNSELOR: 'bg-pink-100 text-pink-800 border-pink-200',
      TU_ADMIN: 'bg-orange-100 text-orange-800 border-orange-200',
      FACILITY_ADMIN: 'bg-teal-100 text-teal-800 border-teal-200',
      IT_ADMIN: 'bg-cyan-100 text-cyan-800 border-cyan-200',
      LIBRARIAN: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      GENERAL_STAFF: 'bg-gray-100 text-gray-800 border-gray-200',
      STUDENT: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      FACULTY: 'bg-red-100 text-red-800 border-red-200',
      PARENT: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    };
    return colors[roleName] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getRoleIcon = (roleName) => {
    switch (roleName) {
      case 'SYSTEM_ADMIN':
        return <Icons.Shield size={14} />;
      case 'ADMIN':
        return <Icons.UserCog size={14} />;
      case 'COORDINATOR':
        return <Icons.Users size={14} />;
      case 'STUDENT':
        return <Icons.GraduationCap size={14} />;
      case 'FACULTY':
        return <Icons.BookOpen size={14} />;
      default:
        return <Icons.User size={14} />;
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Toast Notification */}
      <AnimatePresence>
        {toast.show && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            className={`fixed top-20 right-4 z-[100] flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg min-w-[280px] max-w-md ${
              toast.type === 'success'
                ? 'bg-green-50 text-green-800 border-l-4 border-green-500'
                : toast.type === 'error'
                ? 'bg-red-50 text-red-800 border-l-4 border-red-500'
                : 'bg-blue-50 text-blue-800 border-l-4 border-blue-500'
            }`}
          >
            <div className="flex-shrink-0">
              {toast.type === 'success' && <Icons.CheckCircle size={20} />}
              {toast.type === 'error' && <Icons.AlertCircle size={20} />}
              {toast.type === 'info' && <Icons.Info size={20} />}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{toast.message}</p>
            </div>
            <button
              onClick={() => {
                if (toastTimeoutRef.current) {
                  clearTimeout(toastTimeoutRef.current);
                  toastTimeoutRef.current = null;
                }
                setToast({ show: false, message: '', type: '' });
              }}
              className="flex-shrink-0 ml-2 hover:opacity-70 transition-opacity"
            >
              <Icons.X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">
                {initialData ? 'Edit User' : 'Create New User'}
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={loading}
              >
                <Icons.X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Profile Picture */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Profile Picture
                </label>

                <div className="flex items-center gap-4 mb-4">
                  <div className="relative">
                    {previewImage ? (
                      <div className="relative">
                        <Image
                          src={previewImage}
                          alt="Profile Preview"
                          width={96}
                          height={96}
                          className="w-24 h-24 rounded-xl object-cover border-2 border-gray-200"
                          onError={() => setPreviewImage('')}
                        />
                        <button
                          type="button"
                          onClick={clearImage}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                          title="Remove image"
                        >
                          <Icons.X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="w-24 h-24 bg-gray-100 rounded-xl flex items-center justify-center border-2 border-dashed border-gray-300">
                        <Icons.User size={32} className="text-gray-400" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
                      disabled={loading || uploadingImage}
                    >
                      <Icons.Upload size={16} />
                      Upload Image
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={loading || uploadingImage}
                    />
                  </div>
                </div>

                {uploadingImage && (
                  <p className="mt-1 text-xs text-gray-500 flex items-center gap-1">
                    <Icons.Loader2 size={12} className="animate-spin" />
                    Uploading image...
                  </p>
                )}
                {errors.profilePicture && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.profilePicture}
                  </p>
                )}
                <p className="mt-1 text-xs text-gray-400">
                  Supported formats: JPG, PNG, GIF, WEBP (max 5MB)
                </p>
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    errors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={loading}
                  placeholder="Enter full name"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    errors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={loading}
                  placeholder="user@example.com"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password {!initialData && '*'}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  placeholder={
                    initialData
                      ? 'Leave blank to keep current password'
                      : 'Enter password (min 6 characters)'
                  }
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    errors.password ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={loading}
                />
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  disabled={loading}
                  placeholder="+1 (555) 000-0000"
                />
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  disabled={loading}
                  placeholder="Enter address"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  disabled={loading}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              {/* Role Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assign Role *
                </label>
                {rolesLoading ? (
                  <div className="flex items-center gap-2 text-gray-500">
                    <Icons.Loader2 size={16} className="animate-spin" />
                    Loading roles...
                  </div>
                ) : (
                  <div>
                    <div className="flex flex-wrap gap-2">
                      {availableRoles.map((role) => {
                        const isSelected =
                          formData.roleId.toString() === role.id.toString();

                        return (
                          <button
                            key={role.id}
                            type="button"
                            onClick={() => selectRole(role.id.toString())}
                            className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                              isSelected
                                ? `${getRoleBadgeColor(
                                    role.name
                                  )} ring-2 ring-offset-2 ring-indigo-500 shadow-md`
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
                            }`}
                            disabled={loading}
                          >
                            {getRoleIcon(role.name)}
                            {role.name}
                            {role.description && (
                              <span className="text-xs opacity-75 ml-1">
                                ({role.description})
                              </span>
                            )}
                            {isSelected && (
                              <Icons.CheckCircle
                                size={14}
                                className="ml-1 text-green-600"
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {formData.roleId && (
                      <div className="mt-3 p-2 bg-indigo-50 rounded-lg border border-indigo-200">
                        <p className="text-xs text-indigo-800 flex items-center gap-1">
                          <Icons.Info size={12} />
                          Currently selected role ID: {formData.roleId}
                        </p>
                      </div>
                    )}
                  </div>
                )}
                {errors.roleId && (
                  <p className="mt-1 text-sm text-red-600">{errors.roleId}</p>
                )}
                <p className="mt-2 text-xs text-gray-500">
                  Click on a role to select it. Selected role will be
                  highlighted.
                </p>
              </div>

              {/* Form Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  disabled={loading || uploadingImage}
                >
                  {loading || uploadingImage ? (
                    <>
                      <Icons.Loader2 size={18} className="animate-spin" />
                      {uploadingImage
                        ? 'Uploading...'
                        : initialData
                        ? 'Updating...'
                        : 'Creating...'}
                    </>
                  ) : (
                    <>
                      <Icons.Save size={18} />
                      {initialData ? 'Update User' : 'Create User'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </>
  );
}
