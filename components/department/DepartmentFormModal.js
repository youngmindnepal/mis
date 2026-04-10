// components/department/DepartmentFormModal.js
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';

export default function DepartmentFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  loading,
}) {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    headOfDepartmentId: '',
    status: 'active',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [users, setUsers] = useState([]);
  const [coordinators, setCoordinators] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        code: initialData.code || '',
        description: initialData.description || '',
        headOfDepartmentId:
          initialData.headOfDepartmentId ||
          initialData.headOfDepartment?.id ||
          '',
        status: initialData.status || 'active',
      });
    } else {
      setFormData({
        name: '',
        code: '',
        description: '',
        headOfDepartmentId: '',
        status: 'active',
      });
    }
    setErrors({});
  }, [initialData, isOpen]);

  // Fetch users for coordinator dropdown
  useEffect(() => {
    const fetchUsers = async () => {
      if (!isOpen) return;

      try {
        setLoadingUsers(true);
        const response = await fetch('/api/users?limit=100');

        if (!response.ok) {
          console.error(
            'Failed to fetch users:',
            response.status,
            response.statusText
          );
          throw new Error('Failed to fetch users');
        }

        const data = await response.json();
        console.log('Fetched users data:', data);

        // Extract users array from response (handle different response structures)
        let usersArray = [];
        if (Array.isArray(data)) {
          usersArray = data;
        } else if (data.users && Array.isArray(data.users)) {
          usersArray = data.users;
        } else if (data.data && Array.isArray(data.data)) {
          usersArray = data.data;
        } else {
          usersArray = [];
        }

        setUsers(usersArray);

        // Filter users with coordinator role
        const coordinatorUsers = usersArray.filter((user) => {
          // Check role object (from relation)
          if (user.role && typeof user.role === 'object') {
            const roleName = user.role.name?.toUpperCase();
            return (
              roleName === 'COORDINATOR' ||
              roleName === 'HOD' ||
              roleName === 'MANAGER' ||
              roleName === 'ADMIN'
            );
          }
          // Check role string (if directly available)
          if (user.role && typeof user.role === 'string') {
            const roleName = user.role.toUpperCase();
            return (
              roleName === 'COORDINATOR' ||
              roleName === 'HOD' ||
              roleName === 'MANAGER' ||
              roleName === 'ADMIN'
            );
          }
          // Check roles array (if user has multiple roles)
          if (user.roles && Array.isArray(user.roles)) {
            return user.roles.some((role) => {
              const roleName =
                typeof role === 'object'
                  ? role.name?.toUpperCase()
                  : role?.toUpperCase();
              return (
                roleName === 'COORDINATOR' ||
                roleName === 'HOD' ||
                roleName === 'MANAGER' ||
                roleName === 'ADMIN'
              );
            });
          }
          return false;
        });

        console.log('Filtered coordinators:', coordinatorUsers);
        setCoordinators(coordinatorUsers);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoadingUsers(false);
      }
    };

    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Department name is required';
    }

    if (!formData.code.trim()) {
      newErrors.code = 'Department code is required';
    } else if (!/^[A-Z0-9_-]+$/i.test(formData.code)) {
      newErrors.code =
        'Code should contain only letters, numbers, underscores, and hyphens';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setSubmitting(true);
    try {
      console.log('Submitting department data:', formData);

      // Prepare submit data - convert empty string to null for headOfDepartmentId
      const submitData = {
        name: formData.name,
        code: formData.code,
        description: formData.description,
        headOfDepartmentId:
          formData.headOfDepartmentId === ''
            ? null
            : parseInt(formData.headOfDepartmentId),
        status: formData.status,
      };

      console.log('Submit data prepared:', submitData);
      await onSubmit(submitData);
      onClose();
    } catch (error) {
      console.error('Form submission error:', error);
      // Don't close the modal on error
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
                {initialData ? 'Edit Department' : 'Create New Department'}
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
              {/* Department Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Department Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    errors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="e.g., Human Resources, IT Department"
                  disabled={submitting}
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                )}
              </div>

              {/* Department Code */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Department Code *
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) =>
                    handleChange('code', e.target.value.toUpperCase())
                  }
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono ${
                    errors.code ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="e.g., HR, IT, FIN"
                  disabled={submitting}
                />
                {errors.code && (
                  <p className="mt-1 text-sm text-red-600">{errors.code}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Unique identifier for the department (uppercase letters,
                  numbers, underscores, hyphens)
                </p>
              </div>

              {/* Head of Department */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Head of Department
                </label>
                <select
                  value={formData.headOfDepartmentId}
                  onChange={(e) =>
                    handleChange('headOfDepartmentId', e.target.value)
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  disabled={submitting || loadingUsers}
                >
                  <option value="">Select Head of Department</option>
                  {loadingUsers ? (
                    <option disabled>Loading users...</option>
                  ) : (
                    coordinators.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.email}) -{' '}
                        {user.role?.name || user.role || 'No Role'}
                      </option>
                    ))
                  )}
                </select>
                {coordinators.length === 0 && !loadingUsers && (
                  <p className="mt-1 text-xs text-amber-600">
                    No coordinators found. Please ensure users with coordinator
                    role exist.
                  </p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Select a user with Coordinator, HOD, Manager, or Admin role to
                  lead this department
                </p>
              </div>

              {/* Status */}
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
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Describe the department's purpose and responsibilities..."
                  disabled={submitting}
                />
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
                      {initialData ? 'Update Department' : 'Create Department'}
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
