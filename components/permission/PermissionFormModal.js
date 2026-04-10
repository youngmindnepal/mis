// components/PermissionFormModal.js
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';

export default function PermissionFormModal({
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
  const [isNewCategory, setIsNewCategory] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [dynamicCategories, setDynamicCategories] = useState([]);

  // Common categories for dropdown
  const defaultCategories = [
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

  // Common actions
  const actions = [
    { value: 'read', label: 'Read (View)', icon: Icons.Eye },
    { value: 'create', label: 'Create (Add)', icon: Icons.PlusCircle },
    { value: 'update', label: 'Update (Edit)', icon: Icons.Edit },
    { value: 'delete', label: 'Delete (Remove)', icon: Icons.Trash2 },
    { value: 'manage', label: 'Manage (Full Access)', icon: Icons.Settings },
  ];

  // Get the selected action icon component
  const getSelectedActionIcon = () => {
    const selectedAction = actions.find((a) => a.value === formData.action);
    return selectedAction?.icon || Icons.Key;
  };

  // Fetch existing categories from API to show in dropdown
  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/permissions/categories');
      if (response.ok) {
        const data = await response.json();
        if (data.categories && data.categories.length > 0) {
          // Combine default categories with existing categories from DB
          const allCategories = [
            ...new Set([...defaultCategories, ...data.categories]),
          ];
          setDynamicCategories(allCategories.sort());
        } else {
          setDynamicCategories(defaultCategories);
        }
      } else {
        setDynamicCategories(defaultCategories);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      setDynamicCategories(defaultCategories);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        description: initialData.description || '',
        resource: initialData.resource || '',
        action: initialData.action || '',
        category: initialData.category || 'General',
      });
      setIsNewCategory(false);
      setNewCategory('');
    } else {
      setFormData({
        name: '',
        description: '',
        resource: '',
        action: '',
        category: 'General',
      });
      setIsNewCategory(false);
      setNewCategory('');
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

    if (isNewCategory && !newCategory.trim()) {
      newErrors.category = 'Please enter a category name';
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
      const finalName =
        formData.name !== generatedName ? formData.name : generatedName;

      // Determine final category value
      let finalCategory = formData.category;
      if (isNewCategory && newCategory.trim()) {
        finalCategory = newCategory.trim();
      }

      // Convert to lowercase before submitting
      await onSubmit({
        ...formData,
        name: finalName.toLowerCase(),
        resource: formData.resource.toLowerCase(),
        action: formData.action.toLowerCase(),
        category: finalCategory,
      });
      onClose();
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (field, value) => {
    // Convert to lowercase for resource and action fields
    let processedValue = value;
    if (field === 'resource' || field === 'action') {
      processedValue = value.toLowerCase();
    }

    // Keep the original value without any transformation
    setFormData((prev) => ({ ...prev, [field]: processedValue }));

    // Auto-generate name when resource and action are both filled
    if (field === 'resource' || field === 'action') {
      const newResource =
        field === 'resource' ? processedValue : formData.resource;
      const newAction = field === 'action' ? processedValue : formData.action;

      if (newResource && newAction && !initialData) {
        const generatedName = `${newResource}:${newAction}`;
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

  const handleCategoryChange = (value) => {
    if (value === 'new') {
      setIsNewCategory(true);
      setFormData((prev) => ({ ...prev, category: '' }));
    } else {
      setIsNewCategory(false);
      setFormData((prev) => ({ ...prev, category: value }));
      setNewCategory('');
    }
  };

  if (!isOpen) return null;

  const SelectedActionIcon = getSelectedActionIcon();

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
                {initialData ? 'Edit Permission' : 'Create New Permission'}
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
              {/* Resource and Action Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Resource *
                  </label>
                  <input
                    type="text"
                    value={formData.resource}
                    onChange={(e) => handleChange('resource', e.target.value)}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      errors.resource ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="e.g., users, roles, departments"
                    disabled={submitting || !!initialData}
                  />
                  {errors.resource && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.resource}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    Will be automatically converted to lowercase
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Action *
                  </label>
                  <select
                    value={formData.action}
                    onChange={(e) => handleChange('action', e.target.value)}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      errors.action ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={submitting || !!initialData}
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
                  <p className="mt-1 text-xs text-gray-500">
                    Actions are in lowercase format
                  </p>
                </div>
              </div>

              {/* Permission Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Permission Name *
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <SelectedActionIcon size={18} className="text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      handleChange('name', e.target.value.toLowerCase())
                    }
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
                <p className="mt-1 text-xs text-gray-500">
                  Format: resource:action (e.g., users:read, roles:create,
                  departments:manage) - automatically converted to lowercase
                </p>
              </div>

              {/* Category - Enhanced with new category option */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                {!isNewCategory ? (
                  <div className="flex gap-2">
                    <select
                      value={formData.category}
                      onChange={(e) => handleCategoryChange(e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      disabled={submitting}
                    >
                      {dynamicCategories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                      <option value="new">+ Add new category...</option>
                    </select>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        placeholder="Enter new category name"
                        className={`flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          errors.category ? 'border-red-500' : 'border-gray-300'
                        }`}
                        autoFocus
                        disabled={submitting}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setIsNewCategory(false);
                          setFormData((prev) => ({
                            ...prev,
                            category: initialData?.category || 'General',
                          }));
                          setNewCategory('');
                          setErrors((prev) => ({ ...prev, category: null }));
                        }}
                        className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                        disabled={submitting}
                      >
                        <Icons.X size={18} />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (newCategory.trim()) {
                          setIsNewCategory(false);
                          setFormData((prev) => ({
                            ...prev,
                            category: newCategory.trim(),
                          }));
                        }
                      }}
                      className="text-sm text-indigo-600 hover:text-indigo-700"
                      disabled={!newCategory.trim()}
                    >
                      Use this category
                    </button>
                    <p className="text-xs text-gray-500">
                      Enter a custom category name for this permission
                    </p>
                  </div>
                )}
                {errors.category && (
                  <p className="mt-1 text-sm text-red-600">{errors.category}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="What does this permission allow?"
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
                      {initialData ? 'Update Permission' : 'Create Permission'}
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
