// components/PermissionManager.js
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';

export default function PermissionManager({
  isOpen,
  onClose,
  permissions,
  onPermissionsChange,
}) {
  const [localPermissions, setLocalPermissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editingPermission, setEditingPermission] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [search, setSearch] = useState('');
  const [groupBy, setGroupBy] = useState('category');

  useEffect(() => {
    if (permissions) {
      setLocalPermissions(permissions);
    }
  }, [permissions]);

  const handleCreatePermission = async (permissionData) => {
    try {
      setLoading(true);
      // Ensure permission name is lowercase
      const dataToSend = {
        ...permissionData,
        name: permissionData.name.toLowerCase(),
      };

      const response = await fetch('/api/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create permission');
      }

      setLocalPermissions([...localPermissions, data]);
      onPermissionsChange();
      setEditingPermission(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePermission = async (id, permissionData) => {
    try {
      setLoading(true);

      // Validate ID
      if (!id) {
        throw new Error('Permission ID is required for update');
      }

      // Ensure permission name is lowercase
      const dataToSend = {
        ...permissionData,
        name: permissionData.name.toLowerCase(),
      };

      const response = await fetch(`/api/permissions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update permission');
      }

      setLocalPermissions(
        localPermissions.map((p) => (p.id === id ? data : p))
      );
      onPermissionsChange();
      setEditingPermission(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  const handleDeletePermission = async (id) => {
    try {
      setLoading(true);

      // Validate ID
      if (!id) {
        throw new Error('Permission ID is required for deletion');
      }

      const response = await fetch(`/api/permissions/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete permission');
      }

      setLocalPermissions(localPermissions.filter((p) => p.id !== id));
      onPermissionsChange();
      setShowDeleteConfirm(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredPermissions = localPermissions.filter(
    (perm) =>
      perm.name.toLowerCase().includes(search.toLowerCase()) ||
      (perm.description &&
        perm.description.toLowerCase().includes(search.toLowerCase()))
  );

  // Group permissions by category
  const groupedPermissions = filteredPermissions.reduce(
    (groups, permission) => {
      const category = permission.category || 'General';
      if (!groups[category]) groups[category] = [];
      groups[category].push(permission);
      return groups;
    },
    {}
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
            className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-6 border-b">
              <div>
                <h2 className="text-xl font-bold text-gray-800">
                  Permission Manager
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Create, edit, and manage system permissions
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Icons.X size={20} />
              </button>
            </div>

            <div className="p-6 border-b">
              <div className="flex flex-wrap gap-3 justify-between items-center">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Icons.Search
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      size={18}
                    />
                    <input
                      type="text"
                      placeholder="Search permissions..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <select
                    value={groupBy}
                    onChange={(e) => setGroupBy(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="category">Group by Category</option>
                    <option value="none">No Grouping</option>
                  </select>
                  <button
                    onClick={() => setEditingPermission({})}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                  >
                    <Icons.Plus size={18} />
                    New Permission
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {error && (
                <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
                  {error}
                  <button
                    onClick={() => setError(null)}
                    className="float-right"
                  >
                    <Icons.X size={16} />
                  </button>
                </div>
              )}

              {groupBy === 'category' ? (
                Object.entries(groupedPermissions).map(([category, perms]) => (
                  <div key={category} className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">
                      {category} Permissions
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {perms.map((permission) => (
                        <PermissionCard
                          key={permission.id}
                          permission={permission}
                          onEdit={() => setEditingPermission(permission)}
                          onDelete={() => setShowDeleteConfirm(permission)}
                          loading={loading}
                        />
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredPermissions.map((permission) => (
                    <PermissionCard
                      key={permission.id}
                      permission={permission}
                      onEdit={() => setEditingPermission(permission)}
                      onDelete={() => setShowDeleteConfirm(permission)}
                      loading={loading}
                    />
                  ))}
                </div>
              )}

              {filteredPermissions.length === 0 && (
                <div className="text-center py-12">
                  <Icons.Key size={48} className="text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No permissions found</p>
                </div>
              )}
            </div>

            {/* Permission Form Modal */}
            <PermissionFormModal
              isOpen={!!editingPermission}
              onClose={() => setEditingPermission(null)}
              onSubmit={(data) => {
                // Check if we're editing (has id) or creating (no id)
                if (editingPermission && editingPermission.id) {
                  handleUpdatePermission(editingPermission.id, data);
                } else {
                  handleCreatePermission(data);
                }
              }}
              initialData={editingPermission}
              loading={loading}
            />

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
              {showDeleteConfirm && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                  onClick={() => setShowDeleteConfirm(null)}
                >
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-white rounded-2xl max-w-md w-full p-6"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-center mb-4">
                      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                        <Icons.AlertTriangle
                          size={32}
                          className="text-red-600"
                        />
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-center text-gray-800 mb-2">
                      Delete Permission
                    </h3>
                    <p className="text-gray-600 text-center mb-4">
                      Are you sure you want to delete{' '}
                      <strong>{showDeleteConfirm.name}</strong>? This action
                      cannot be undone and may affect roles that use this
                      permission.
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowDeleteConfirm(null)}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        disabled={loading}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() =>
                          handleDeletePermission(showDeleteConfirm.id)
                        }
                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        disabled={loading}
                      >
                        {loading ? (
                          <Icons.Loader2 size={18} className="animate-spin" />
                        ) : (
                          <>
                            <Icons.Trash2 size={18} />
                            Delete
                          </>
                        )}
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Permission Card Component
function PermissionCard({ permission, onEdit, onDelete, loading }) {
  return (
    <div className="bg-gray-50 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Icons.Key size={16} className="text-purple-500" />
            <h4 className="font-medium text-gray-800">{permission.name}</h4>
          </div>
          {permission.description && (
            <p className="text-sm text-gray-600 mb-2">
              {permission.description}
            </p>
          )}
          <div className="flex gap-2 text-xs text-gray-500">
            {permission.resource && (
              <span className="px-2 py-0.5 bg-gray-200 rounded">
                Resource: {permission.resource}
              </span>
            )}
            {permission.action && (
              <span className="px-2 py-0.5 bg-gray-200 rounded">
                Action: {permission.action}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-1">
          <button
            onClick={onEdit}
            className="p-1 hover:bg-white rounded transition-colors"
            disabled={loading}
          >
            <Icons.Edit size={16} className="text-indigo-500" />
          </button>
          <button
            onClick={onDelete}
            className="p-1 hover:bg-white rounded transition-colors"
            disabled={loading}
          >
            <Icons.Trash2 size={16} className="text-red-500" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Permission Form Modal
function PermissionFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  loading,
}) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    resource: '',
    action: '',
    category: 'General',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const categories = [
    'User Management',
    'Role Management',
    'Permission Management',
    'Department Management',
    'Menu Management',
    'Dashboard',
    'Profile',
    'Settings',
    'Content Management',
    'Reports',
    'General',
  ];

  const actions = [
    { value: 'read', label: 'Read (View)', icon: Icons.Eye },
    { value: 'create', label: 'Create (Add)', icon: Icons.PlusCircle },
    { value: 'update', label: 'Update (Edit)', icon: Icons.Edit },
    { value: 'delete', label: 'Delete (Remove)', icon: Icons.Trash2 },
    { value: 'manage', label: 'Manage (Full Access)', icon: Icons.Settings },
  ];

  useEffect(() => {
    if (initialData && initialData.id) {
      // Editing existing permission
      setFormData({
        name: initialData.name || '',
        description: initialData.description || '',
        resource: initialData.resource || '',
        action: initialData.action || '',
        category: initialData.category || 'General',
      });
    } else {
      // Creating new permission
      setFormData({
        name: '',
        description: '',
        resource: '',
        action: '',
        category: 'General',
      });
    }
    setErrors({});
  }, [initialData, isOpen]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Permission name is required';
    } else if (!formData.name.includes(':')) {
      newErrors.name =
        'Permission name must be in format "resource:action" (e.g., "users:read")';
    }

    if (!formData.resource.trim()) {
      newErrors.resource = 'Resource is required';
    }

    if (!formData.action.trim()) {
      newErrors.action = 'Action is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setSubmitting(true);
    try {
      // Generate name from resource and action if not provided or different
      const generatedName = `${formData.resource}:${formData.action}`;
      let finalName =
        formData.name !== generatedName ? formData.name : generatedName;

      // Convert permission name to lowercase
      finalName = finalName.toLowerCase();

      await onSubmit({
        ...formData,
        name: finalName,
      });
      onClose();
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (field, value) => {
    // Convert resource and action to lowercase when they're entered
    const processedValue =
      field === 'resource' || field === 'action' ? value.toLowerCase() : value;

    setFormData((prev) => ({ ...prev, [field]: processedValue }));

    // Auto-generate name when resource and action are both filled
    if (field === 'resource' || field === 'action') {
      const newResource =
        field === 'resource' ? processedValue : formData.resource;
      const newAction = field === 'action' ? processedValue : formData.action;

      if (newResource && newAction && !initialData) {
        const generatedName = `${newResource}:${newAction}`.toLowerCase();
        setFormData((prev) => ({
          ...prev,
          name: generatedName,
        }));
      }
    }

    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  if (!isOpen) return null;

  const getIconComponent = () => {
    const selectedAction = actions.find((a) => a.value === formData.action);
    const IconComponent = selectedAction?.icon || Icons.Key;
    return <IconComponent size={18} className="text-gray-400" />;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-2xl max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold text-gray-800">
                {initialData?.id ? 'Edit Permission' : 'Create Permission'}
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Icons.X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Resource *
                </label>
                <input
                  type="text"
                  value={formData.resource}
                  onChange={(e) =>
                    handleChange('resource', e.target.value.toLowerCase())
                  }
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    errors.resource ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="e.g., users, roles, departments"
                  disabled={submitting || initialData?.id}
                />
                {errors.resource && (
                  <p className="mt-1 text-sm text-red-600">{errors.resource}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Action *
                </label>
                <select
                  value={formData.action}
                  onChange={(e) => handleChange('action', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    errors.action ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={submitting || initialData?.id}
                >
                  <option value="">Select action</option>
                  {actions.map((action) => (
                    <option key={action.value} value={action.value}>
                      {action.label}
                    </option>
                  ))}
                </select>
                {errors.action && (
                  <p className="mt-1 text-sm text-red-600">{errors.action}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Permission Name *
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    {getIconComponent()}
                  </div>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono ${
                      errors.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="users:read"
                    disabled={submitting}
                  />
                </div>
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => handleChange('category', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  disabled={submitting}
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Describe what this permission allows..."
                  disabled={submitting}
                />
              </div>

              <div className="flex gap-3 pt-4">
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
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  disabled={submitting || loading}
                >
                  {submitting ? (
                    <Icons.Loader2 size={18} className="animate-spin" />
                  ) : (
                    <>
                      <Icons.Save size={18} />
                      {initialData?.id ? 'Update' : 'Create'}
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
