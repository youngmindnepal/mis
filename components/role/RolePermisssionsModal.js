// components/RolePermissionsModal.js
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';

export default function RolePermissionsModal({
  isOpen,
  onClose,
  role,
  permissions,
  onUpdatePermissions,
}) {
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectAll, setSelectAll] = useState(false);

  // Initialize selected permissions when role changes
  useEffect(() => {
    if (role) {
      console.log('=== RolePermissionsModal Debug ===');
      console.log('Role object:', role);
      console.log('Role ID:', role.id);
      console.log('Role name:', role.name);
      console.log('Role permissions:', role.permissions);

      if (!role.id) {
        console.error('Role ID is missing!');
        setError('Invalid role data: Missing role ID');
        return;
      }

      if (role.permissions && Array.isArray(role.permissions)) {
        const permissionIds = role.permissions.map((p) => Number(p.id));
        console.log(
          'Initializing selected permissions with IDs:',
          permissionIds
        );
        setSelectedPermissions(permissionIds);
      } else {
        console.log('Role has no permissions or permissions is not an array');
        setSelectedPermissions([]);
      }
    }
  }, [role]);

  // Filter permissions based on search
  const filteredPermissions = permissions.filter(
    (perm) =>
      perm.name.toLowerCase().includes(search.toLowerCase()) ||
      (perm.description &&
        perm.description.toLowerCase().includes(search.toLowerCase()))
  );

  // Update selectAll state when filtered permissions change
  useEffect(() => {
    if (filteredPermissions.length > 0) {
      const allSelected = filteredPermissions.every((p) =>
        selectedPermissions.includes(Number(p.id))
      );
      setSelectAll(allSelected);
    } else {
      setSelectAll(false);
    }
  }, [selectedPermissions, filteredPermissions]);

  // Group permissions by category
  const groupedPermissions = filteredPermissions.reduce(
    (groups, permission) => {
      const category = permission.name.split('_')[0] || 'general';
      if (!groups[category]) groups[category] = [];
      groups[category].push(permission);
      return groups;
    },
    {}
  );

  // Toggle individual permission
  const togglePermission = (permissionId) => {
    const id = Number(permissionId);
    setSelectedPermissions((prev) => {
      const newSelection = prev.includes(id)
        ? prev.filter((prevId) => prevId !== id)
        : [...prev, id];
      return newSelection;
    });
  };

  // Toggle all permissions in a category
  const toggleGroup = (category) => {
    const groupPermissions = groupedPermissions[category];
    const groupIds = groupPermissions.map((p) => Number(p.id));
    const allSelected = groupIds.every((id) =>
      selectedPermissions.includes(id)
    );

    if (allSelected) {
      setSelectedPermissions((prev) =>
        prev.filter((id) => !groupIds.includes(id))
      );
    } else {
      setSelectedPermissions((prev) => [...new Set([...prev, ...groupIds])]);
    }
  };

  // Handle select all / deselect all
  const handleSelectAll = () => {
    const filteredIds = filteredPermissions.map((p) => Number(p.id));

    if (selectAll) {
      setSelectedPermissions((prev) =>
        prev.filter((id) => !filteredIds.includes(id))
      );
    } else {
      setSelectedPermissions((prev) => [...new Set([...prev, ...filteredIds])]);
    }
  };

  // components/RolePermissionsModal.js - Update handleSubmit
  const handleSubmit = async () => {
    // Validate role data
    if (!role) {
      setError('No role selected');
      return;
    }

    // Get role ID and ensure it's a number
    let roleId = role.id;

    // If role.id is a string, convert it to number
    if (typeof roleId === 'string') {
      roleId = parseInt(roleId, 10);
    }

    console.log('=== Submitting Permission Update ===');
    console.log('Original role object:', role);
    console.log('Role ID from role object:', role.id, 'type:', typeof role.id);
    console.log('Converted role ID:', roleId, 'type:', typeof roleId);

    if (!roleId || isNaN(roleId)) {
      console.error('Invalid role ID:', roleId);
      setError(`Invalid role ID: ${roleId}`);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Ensure all permission IDs are numbers
      const numericPermissionIds = selectedPermissions
        .map((id) => {
          const numId = typeof id === 'string' ? parseInt(id, 10) : id;
          return isNaN(numId) ? null : numId;
        })
        .filter((id) => id !== null);

      console.log('Selected permission IDs (original):', selectedPermissions);
      console.log('Numeric permission IDs:', numericPermissionIds);
      console.log('Permission count:', numericPermissionIds.length);

      if (!onUpdatePermissions) {
        throw new Error('Update function not provided');
      }

      // Make the API call directly here to avoid issues
      const url = `/api/roles/${roleId}/permissions`;
      console.log('Making PUT request to:', url);

      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ permissionIds: numericPermissionIds }),
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: Failed to update permissions`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          console.error('Failed to parse error response:', e);
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('Update successful:', data);

      // Call the parent's onUpdatePermissions to refresh the roles list
      if (onUpdatePermissions) {
        await onUpdatePermissions(roleId, numericPermissionIds);
      }

      onClose();
    } catch (err) {
      console.error('Error in handleSubmit:', err);
      setError(err.message || 'Failed to update permissions');
    } finally {
      setLoading(false);
    }
  };
  // Don't render if modal is closed or no role selected
  if (!isOpen) return null;

  if (!role) {
    return (
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          >
            <div className="bg-white rounded-2xl max-w-md w-full p-6">
              <div className="text-center">
                <Icons.AlertTriangle
                  size={48}
                  className="text-red-500 mx-auto mb-4"
                />
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  Invalid Role Data
                </h3>
                <p className="text-gray-600">
                  No role data available. Please try again.
                </p>
                <button
                  onClick={onClose}
                  className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

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
            className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b">
              <div>
                <h2 className="text-xl font-bold text-gray-800">
                  Manage Permissions: {role.name}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Select the permissions to assign to this role
                </p>
                <p className="text-xs text-gray-400 mt-1">Role ID: {role.id}</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={loading}
              >
                <Icons.X size={20} />
              </button>
            </div>

            {/* Search and Select All */}
            <div className="p-6 border-b">
              <div className="flex gap-3 items-center">
                <div className="flex-1 relative">
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
                    disabled={loading}
                  />
                </div>
                <button
                  onClick={handleSelectAll}
                  className="px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm flex items-center gap-2 disabled:opacity-50"
                  disabled={loading}
                >
                  {selectAll ? (
                    <>
                      <Icons.CheckSquare size={16} />
                      Deselect All
                    </>
                  ) : (
                    <>
                      <Icons.Square size={16} />
                      Select All
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Permissions List */}
            <div className="flex-1 overflow-y-auto p-6">
              {error && (
                <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span>{error}</span>
                    <button
                      onClick={() => setError(null)}
                      className="text-red-700 hover:text-red-900"
                    >
                      <Icons.X size={16} />
                    </button>
                  </div>
                </div>
              )}

              {Object.entries(groupedPermissions).length > 0 ? (
                Object.entries(groupedPermissions).map(([category, perms]) => (
                  <div key={category} className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <button
                        onClick={() => toggleGroup(category)}
                        className="text-sm font-semibold text-gray-700 hover:text-indigo-600 transition-colors"
                        disabled={loading}
                      >
                        {perms.every((p) =>
                          selectedPermissions.includes(Number(p.id))
                        ) ? (
                          <Icons.CheckSquare
                            size={18}
                            className="text-indigo-600"
                          />
                        ) : (
                          <Icons.Square size={18} />
                        )}
                      </button>
                      <h3 className="text-lg font-semibold text-gray-800 capitalize">
                        {category}
                      </h3>
                      <span className="text-xs text-gray-500">
                        (
                        {
                          perms.filter((p) =>
                            selectedPermissions.includes(Number(p.id))
                          ).length
                        }
                        /{perms.length})
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 ml-6">
                      {perms.map((permission) => (
                        <label
                          key={permission.id}
                          className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={selectedPermissions.includes(
                              Number(permission.id)
                            )}
                            onChange={() => togglePermission(permission.id)}
                            className="mt-0.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            disabled={loading}
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Icons.Key
                                size={14}
                                className="text-purple-500"
                              />
                              <span className="text-sm font-medium text-gray-800">
                                {permission.name}
                              </span>
                            </div>
                            {permission.description && (
                              <p className="text-xs text-gray-500 mt-1">
                                {permission.description}
                              </p>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <Icons.Key size={48} className="text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No permissions found</p>
                  <p className="text-xs text-gray-400 mt-2">
                    Create permissions first in the Permission Manager
                  </p>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="p-6 border-t flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Icons.Loader2 size={18} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Icons.Save size={18} />
                    Save Permissions
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
