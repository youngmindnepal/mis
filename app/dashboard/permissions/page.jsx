'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import PermissionFormModal from '@/components/permission/PermissionFormModal';

function PermissionDetailsModal({ isOpen, onClose, permission, onEdit }) {
  if (!isOpen || !permission) return null;

  const getActionColor = (action) => {
    const colors = {
      create: 'bg-green-100 text-green-800',
      read: 'bg-blue-100 text-blue-800',
      update: 'bg-yellow-100 text-yellow-800',
      delete: 'bg-red-100 text-red-800',
      manage: 'bg-purple-100 text-purple-800',
    };
    return colors[action?.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">{permission.name}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <Icons.X size={24} />
            </button>
          </div>
          <div className="space-y-4">
            {permission.description && (
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Description
                </label>
                <p className="mt-1">{permission.description}</p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-gray-500">
                Resource
              </label>
              <p className="mt-1 font-mono">{permission.resource}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">
                Action
              </label>
              <div className="mt-1">
                <span
                  className={`inline-flex px-2 py-1 rounded text-xs font-medium ${getActionColor(
                    permission.action
                  )}`}
                >
                  {permission.action}
                </span>
              </div>
            </div>
            {permission.category && (
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Category
                </label>
                <p className="mt-1">{permission.category}</p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-gray-500">
                Used by Roles
              </label>
              <p className="mt-1 text-2xl font-bold">
                {permission._count?.roles || 0}
              </p>
            </div>
          </div>
          <div className="flex gap-3 mt-6 pt-4 border-t">
            <button
              onClick={onEdit}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Edit Permission
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PermissionsPage() {
  const { can, isLoading: permissionsLoading } = usePermissions();

  const [permissions, setPermissions] = useState([]);
  const [allPermissions, setAllPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [successMessage, setSuccessMessage] = useState(null);
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);
  const [editingPermission, setEditingPermission] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedPermission, setSelectedPermission] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [permissionToDelete, setPermissionToDelete] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [groupedPermissions, setGroupedPermissions] = useState({});
  const [showAllMode, setShowAllMode] = useState(true); // Start with true to show all permissions initially
  const [lastOperation, setLastOperation] = useState(null);

  // Group permissions by category
  const groupPermissionsByCategory = useCallback((perms) => {
    const grouped = perms.reduce((acc, permission) => {
      const category = permission.category || 'Uncategorized';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(permission);
      return acc;
    }, {});

    Object.keys(grouped).forEach((category) => {
      grouped[category].sort((a, b) => a.name.localeCompare(b.name));
    });

    return grouped;
  }, []);

  // Fetch all permissions
  const fetchAllPermissions = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/permissions');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch permissions');
      }

      setAllPermissions(data);
      setPermissions(data);
      setShowAllMode(true);
      const grouped = groupPermissionsByCategory(data);
      setGroupedPermissions(grouped);
    } catch (err) {
      console.error('Error fetching permissions:', err);
      setError(`Failed to load permissions: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Initial load - fetch all permissions on mount
  useEffect(() => {
    fetchAllPermissions();
  }, []);

  // Auto-hide success message
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Filter permissions based on search and category
  const filteredPermissions = permissions.filter((permission) => {
    const matchesSearch =
      permission.name.toLowerCase().includes(search.toLowerCase()) ||
      (permission.description &&
        permission.description.toLowerCase().includes(search.toLowerCase())) ||
      (permission.resource &&
        permission.resource.toLowerCase().includes(search.toLowerCase())) ||
      (permission.action &&
        permission.action.toLowerCase().includes(search.toLowerCase()));

    const matchesCategory =
      categoryFilter === 'all' || permission.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  // Get filtered grouped permissions
  const filteredGroupedPermissions = useCallback(() => {
    if (categoryFilter === 'all' && !search) {
      return groupedPermissions;
    }

    const filtered = filteredPermissions.reduce((acc, permission) => {
      const category = permission.category || 'Uncategorized';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(permission);
      return acc;
    }, {});

    Object.keys(filtered).forEach((category) => {
      filtered[category].sort((a, b) => a.name.localeCompare(b.name));
    });

    return filtered;
  }, [filteredPermissions, groupedPermissions, categoryFilter, search]);

  // Get unique categories for filter
  const categories = [
    'all',
    ...new Set(allPermissions.map((p) => p.category).filter(Boolean)),
  ];

  // Create permission
  const handleCreatePermission = async (formData) => {
    try {
      setFormLoading(true);
      setError(null);

      const response = await fetch('/api/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage =
          data.details || data.error || 'Failed to create permission';
        throw new Error(errorMessage);
      }

      // Show ONLY the newly created permission
      setPermissions([data]);
      setShowAllMode(false);
      setLastOperation('created');
      const grouped = groupPermissionsByCategory([data]);
      setGroupedPermissions(grouped);

      // Also add to allPermissions for category filter
      setAllPermissions((prev) => [...prev, data]);

      setSuccessMessage('Permission created successfully!');
      setIsPermissionModalOpen(false);
    } catch (err) {
      console.error('Error creating permission:', err);
      setError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  // Update permission
  const handleUpdatePermission = async (permissionId, formData) => {
    try {
      setFormLoading(true);

      if (!permissionId) {
        throw new Error('Permission ID is required for update');
      }

      const response = await fetch(`/api/permissions/${permissionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update permission');
      }

      // Show ONLY the edited permission
      setPermissions([data]);
      setShowAllMode(false);
      setLastOperation('updated');
      const grouped = groupPermissionsByCategory([data]);
      setGroupedPermissions(grouped);

      // Update in allPermissions as well
      setAllPermissions((prev) =>
        prev.map((p) => (p.id === data.id ? data : p))
      );

      setSuccessMessage('Permission updated successfully!');
      setIsPermissionModalOpen(false);
      setEditingPermission(null);
    } catch (err) {
      console.error('Error updating permission:', err);
      setError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  // Delete permission
  const handleDeletePermission = async (permissionId) => {
    try {
      setDeleting(true);

      if (!permissionId) {
        throw new Error('Permission ID is required for deletion');
      }

      const response = await fetch(`/api/permissions/${permissionId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete permission');
      }

      // Clear permissions after deletion
      setPermissions([]);
      setShowAllMode(false);
      setGroupedPermissions({});
      setLastOperation('deleted');

      // Also remove from allPermissions
      setAllPermissions((prev) =>
        prev.filter((perm) => perm.id !== permissionId)
      );

      setSuccessMessage('Permission deleted successfully!');
      setShowDeleteConfirm(false);
      setPermissionToDelete(null);
    } catch (err) {
      console.error('Error deleting permission:', err);
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  // Get permission badge color based on action type
  const getActionBadgeColor = (action) => {
    const colors = {
      create: 'bg-green-100 text-green-800 border-green-200',
      read: 'bg-blue-100 text-blue-800 border-blue-200',
      update: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      delete: 'bg-red-100 text-red-800 border-red-200',
      manage: 'bg-purple-100 text-purple-800 border-purple-200',
    };
    return (
      colors[action?.toLowerCase()] ||
      'bg-gray-100 text-gray-800 border-gray-200'
    );
  };

  // Get icon for permission
  const getPermissionIcon = (action) => {
    switch (action?.toLowerCase()) {
      case 'create':
        return Icons.PlusCircle;
      case 'read':
        return Icons.Eye;
      case 'update':
        return Icons.Edit;
      case 'delete':
        return Icons.Trash2;
      case 'manage':
        return Icons.Settings;
      default:
        return Icons.Key;
    }
  };

  // Show loading state
  if (permissionsLoading || loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-48 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Check for permission
  const hasReadPermission = can('permissions', 'read');
  const hasCreatePermission = can('permissions', 'create');
  const hasUpdatePermission = can('permissions', 'update');
  const hasDeletePermission = can('permissions', 'delete');

  const displayGroupedPermissions = filteredGroupedPermissions();
  const hasPermissions = Object.keys(displayGroupedPermissions).length > 0;

  // Check if user has read permission
  if (!hasReadPermission) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icons.Lock size={32} className="text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-red-800 mb-2">
            Access Denied
          </h2>
          <p className="text-red-600">
            You don't have permission to view permissions.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Success Message */}
      <AnimatePresence>
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-6 z-50 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg shadow-lg"
          >
            <div className="flex items-center gap-2">
              <Icons.CheckCircle size={20} />
              <span>{successMessage}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-6 z-50 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg shadow-lg"
          >
            <div className="flex items-center gap-2">
              <Icons.AlertCircle size={20} />
              <span>{error}</span>
              <button
                onClick={() => setError(null)}
                className="ml-4 hover:text-red-900"
              >
                <Icons.X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="mb-6 flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Permission Management
          </h1>
          <p className="text-gray-500 mt-1">
            Manage system permissions and access controls
          </p>
          {!showAllMode && permissions.length > 0 && (
            <p className="text-sm text-indigo-600 mt-1">
              Showing {permissions.length} newly {lastOperation} permission.
              Click <strong>Refresh</strong> to see all permissions.
            </p>
          )}
          {showAllMode && allPermissions.length > 0 && (
            <p className="text-sm text-green-600 mt-1">
              Showing all {filteredPermissions.length} of{' '}
              {allPermissions.length} permissions
              {categoryFilter !== 'all' && ` in category "${categoryFilter}"`}
              {search && ` matching "${search}"`}
            </p>
          )}
        </div>
        <div className="flex gap-3">
          {hasCreatePermission && (
            <button
              onClick={() => {
                setEditingPermission(null);
                setIsPermissionModalOpen(true);
              }}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
            >
              <Icons.Plus size={18} />
              Create Permission
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          {/* Search Bar */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Icons.Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                type="text"
                placeholder="Search permissions by name, resource, action..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Category Filter */}
          <div className="relative min-w-[200px]">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none bg-white w-full"
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category === 'all' ? 'All Categories' : category}
                </option>
              ))}
            </select>
            <Icons.Filter
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
          </div>

          {/* Refresh Button */}
          <button
            onClick={fetchAllPermissions}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
            title="Refresh permissions"
          >
            <Icons.RefreshCw
              size={18}
              className={loading ? 'animate-spin' : ''}
            />
            <span className="text-sm">Refresh</span>
          </button>

          {/* Stats */}
          <div className="flex items-center gap-4 ml-auto">
            <div className="text-sm text-gray-600">
              Showing:{' '}
              <span className="font-semibold">
                {filteredPermissions.length}
              </span>{' '}
              permissions
            </div>
          </div>
        </div>
      </div>

      {/* Permissions Grid - Grouped by Category */}
      {hasPermissions ? (
        Object.entries(displayGroupedPermissions).map(([category, perms]) => (
          <div key={category} className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Icons.FolderOpen size={20} className="text-indigo-500" />
              <h2 className="text-xl font-semibold text-gray-800">
                {category}
              </h2>
              <span className="text-sm text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                {perms.length}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {perms.map((permission, index) => {
                const IconComponent = getPermissionIcon(permission.action);
                return (
                  <motion.div
                    key={permission.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden border border-gray-100 cursor-pointer"
                    onClick={() => {
                      setSelectedPermission(permission);
                      setIsDetailsModalOpen(true);
                    }}
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2 rounded-lg ${getActionBadgeColor(
                              permission.action
                            )}`}
                          >
                            <IconComponent size={24} />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-800">
                              {permission.name}
                            </h3>
                            {permission.description && (
                              <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                                {permission.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div
                          className="flex gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {hasUpdatePermission && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingPermission(permission);
                                setIsPermissionModalOpen(true);
                              }}
                              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Edit Permission"
                            >
                              <Icons.Edit
                                size={18}
                                className="text-indigo-500"
                              />
                            </button>
                          )}
                          {hasDeletePermission && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setPermissionToDelete(permission);
                                setShowDeleteConfirm(true);
                              }}
                              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Delete Permission"
                            >
                              <Icons.Trash2
                                size={18}
                                className="text-red-500"
                              />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Permission Details */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Resource:</span>
                          <span className="font-mono text-gray-700">
                            {permission.resource || '-'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Action:</span>
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${getActionBadgeColor(
                              permission.action
                            )}`}
                          >
                            {permission.action || '-'}
                          </span>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="mt-4 pt-4 border-t">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Used in roles</span>
                          <span className="text-lg font-semibold text-gray-800">
                            {permission._count?.roles || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))
      ) : (
        /* Empty State */
        <div className="text-center py-12">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icons.Key size={40} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {permissions.length === 0 && !showAllMode
              ? 'No permissions to display'
              : 'No permissions found'}
          </h3>
          <p className="text-gray-500 mb-4">
            {permissions.length === 0 && !showAllMode ? (
              <>
                Create a new permission or click <strong>Refresh</strong> to
                load existing permissions.
              </>
            ) : search || categoryFilter !== 'all' ? (
              'Try adjusting your filters'
            ) : (
              'Create your first permission to get started'
            )}
          </p>
          {!search && categoryFilter === 'all' && hasCreatePermission && (
            <button
              onClick={() => setIsPermissionModalOpen(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Create Permission
            </button>
          )}
        </div>
      )}

      {/* Permission Form Modal */}
      <PermissionFormModal
        isOpen={isPermissionModalOpen}
        onClose={() => {
          setIsPermissionModalOpen(false);
          setEditingPermission(null);
        }}
        onSubmit={(data) => {
          if (editingPermission && editingPermission.id) {
            handleUpdatePermission(editingPermission.id, data);
          } else {
            handleCreatePermission(data);
          }
        }}
        initialData={editingPermission}
        loading={formLoading}
      />

      {/* Permission Details Modal */}
      <PermissionDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedPermission(null);
        }}
        permission={selectedPermission}
        onEdit={() => {
          setEditingPermission(selectedPermission);
          setIsPermissionModalOpen(true);
          setIsDetailsModalOpen(false);
        }}
      />

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && permissionToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowDeleteConfirm(false)}
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
                  <Icons.AlertTriangle size={32} className="text-red-600" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-center text-gray-800 mb-2">
                Delete Permission
              </h3>
              <p className="text-gray-600 text-center mb-4">
                Are you sure you want to delete{' '}
                <strong>{permissionToDelete.name}</strong>?
                {permissionToDelete._count?.roles > 0 && (
                  <span className="block mt-2 text-red-600">
                    Warning: This permission is used by{' '}
                    {permissionToDelete._count.roles} role(s). Deleting it may
                    affect their permissions.
                  </span>
                )}
                This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeletePermission(permissionToDelete.id)}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  disabled={deleting}
                >
                  {deleting ? (
                    <>
                      <Icons.Loader2 size={18} className="animate-spin" />
                      Deleting...
                    </>
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
    </div>
  );
}
