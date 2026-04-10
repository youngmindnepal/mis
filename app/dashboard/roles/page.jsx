'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';
import RoleFormModal from '@/components/role/RoleFormModal';
import PermissionManager from '@/components/permission/PermissionManager';
import RolePermissionsModal from '@/components/role/RolePermisssionsModal';
import { usePermissions } from '@/hooks/usePermissions';

export default function RolesPage() {
  const { can, isLoading: permissionsLoading } = usePermissions();

  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [successMessage, setSuccessMessage] = useState(null);

  // Modal states
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [isPermissionManagerOpen, setIsPermissionManagerOpen] = useState(false);
  const [isRolePermissionsOpen, setIsRolePermissionsOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  // Delete confirmation
  const [roleToDelete, setRoleToDelete] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Check permissions
  const hasReadPermission = can('roles', 'read');
  const hasCreatePermission = can('roles', 'create');
  const hasUpdatePermission = can('roles', 'update');
  const hasDeletePermission = can('roles', 'delete');
  const hasManagePermissions = can('permissions', 'manage');

  // Effect to debug role data
  useEffect(() => {
    if (selectedRole) {
      console.log('Selected role for permissions:', {
        id: selectedRole.id,
        name: selectedRole.name,
        permissions: selectedRole.permissions,
        permissionsCount: selectedRole.permissions?.length,
      });
    }
  }, [selectedRole]);

  // Fetch roles from API
  const fetchRoles = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Fetching roles from API...');
      const response = await fetch('/api/roles');

      console.log('Response status:', response.status);
      console.log('Response ok?', response.ok);

      // Try to get the response text first
      const responseText = await response.text();
      console.log('Raw response:', responseText);

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse JSON:', parseError);
        throw new Error(
          `Invalid JSON response: ${responseText.substring(0, 100)}`
        );
      }

      if (!response.ok) {
        console.error('API error response:', data);
        throw new Error(
          data.error || `HTTP ${response.status}: Failed to fetch roles`
        );
      }

      console.log('Roles data received:', data);
      setRoles(data);
    } catch (err) {
      console.error('Error fetching roles:', err);
      setError(`Failed to load roles: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch permissions from API
  const fetchPermissions = async () => {
    try {
      const response = await fetch('/api/permissions');
      if (!response.ok) throw new Error('Failed to fetch permissions');
      const data = await response.json();
      setPermissions(data);
    } catch (err) {
      console.error('Error fetching permissions:', err);
    }
  };

  useEffect(() => {
    fetchRoles();
    fetchPermissions();
  }, []);

  // Auto-hide success message
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Filter roles based on search
  const filteredRoles = roles.filter(
    (role) =>
      role.name.toLowerCase().includes(search.toLowerCase()) ||
      (role.description &&
        role.description.toLowerCase().includes(search.toLowerCase()))
  );

  // Create role
  const handleCreateRole = async (formData) => {
    if (!hasCreatePermission) {
      setError("You don't have permission to create roles");
      return;
    }

    try {
      setFormLoading(true);
      const response = await fetch('/api/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create role');
      }

      setSuccessMessage('Role created successfully!');
      setIsRoleModalOpen(false);
      fetchRoles();
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setFormLoading(false);
    }
  };

  // Update role
  const handleUpdateRole = async (roleId, formData) => {
    if (!hasUpdatePermission) {
      setError("You don't have permission to update roles");
      return;
    }

    try {
      setFormLoading(true);
      const response = await fetch(`/api/roles/${roleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update role');
      }

      setSuccessMessage('Role updated successfully!');
      setIsRoleModalOpen(false);
      setEditingRole(null);
      fetchRoles();
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setFormLoading(false);
    }
  };

  // Delete role
  const handleDeleteRole = async (roleId) => {
    if (!hasDeletePermission) {
      setError("You don't have permission to delete roles");
      return;
    }

    try {
      setDeleting(true);
      const response = await fetch(`/api/roles/${roleId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete role');
      }

      setSuccessMessage('Role deleted successfully!');
      setShowDeleteConfirm(false);
      setRoleToDelete(null);
      fetchRoles();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  // Update role permissions
  const handleUpdateRolePermissions = async (roleId, permissionIds) => {
    try {
      setError(null);

      // Validate and convert roleId
      if (!roleId && roleId !== 0) {
        throw new Error('Role ID is required');
      }

      // Ensure roleId is a number
      const numericRoleId =
        typeof roleId === 'string' ? parseInt(roleId, 10) : roleId;

      if (isNaN(numericRoleId)) {
        throw new Error(`Invalid role ID: ${roleId}`);
      }

      console.log('=== Updating Role Permissions ===');
      console.log('Original roleId:', roleId, 'type:', typeof roleId);
      console.log(
        'Numeric roleId:',
        numericRoleId,
        'type:',
        typeof numericRoleId
      );
      console.log('Permission IDs:', permissionIds);

      // Validate permission IDs
      const numericPermissionIds = permissionIds
        .map((id) => (typeof id === 'string' ? parseInt(id, 10) : id))
        .filter((id) => !isNaN(id));

      console.log('Numeric permission IDs:', numericPermissionIds);

      // Construct URL with the numeric role ID
      const url = `/api/roles/${numericRoleId}/permissions`;
      console.log('Request URL:', url);

      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ permissionIds: numericPermissionIds }),
      });

      console.log('Response status:', response.status);
      console.log('Response status text:', response.statusText);

      // Get the response text
      const responseText = await response.text();
      console.log('Raw response text:', responseText);

      // Parse JSON
      let data;
      try {
        data = responseText ? JSON.parse(responseText) : null;
      } catch (parseError) {
        console.error('Failed to parse response as JSON:', parseError);
        throw new Error(
          `Invalid response format: ${responseText.substring(0, 100)}`
        );
      }

      // Check response
      if (!response.ok) {
        console.error('API error response:', data);
        const errorMessage =
          data?.error ||
          data?.message ||
          `HTTP ${response.status}: Failed to update permissions`;
        throw new Error(errorMessage);
      }

      // Validate response
      if (!data || !data.id) {
        console.error('Invalid response data:', data);
        throw new Error('Received invalid response from server');
      }

      console.log('Permissions updated successfully:', data);
      setSuccessMessage('Permissions updated successfully!');
      setIsRolePermissionsOpen(false);
      setSelectedRole(null);

      // Refresh roles
      await fetchRoles();
    } catch (err) {
      console.error('Error updating permissions:', err);
      setError(err.message || 'Failed to update permissions');
      throw err;
    }
  };

  // Get role badge color based on role type
  const getRoleBadgeColor = (roleName) => {
    const colors = {
      SYSTEM_ADMIN: 'bg-purple-100 text-purple-800 border-purple-200',
      ADMIN: 'bg-blue-100 text-blue-800 border-blue-200',
      COORDINATOR: 'bg-green-100 text-green-800 border-green-200',
      USER: 'bg-gray-100 text-gray-800 border-gray-200',
    };
    return (
      colors[roleName] || 'bg-indigo-100 text-indigo-800 border-indigo-200'
    );
  };

  // Show loading state
  if (permissionsLoading || (loading && roles.length === 0)) {
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

  // Access denied if no read permission
  if (!hasReadPermission) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icons.Lock size={32} className="text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-red-800 mb-2">
            Access Denied
          </h2>
          <p className="text-red-600">
            You don't have permission to view roles.
          </p>
          <p className="text-red-500 text-sm mt-2">
            Required permission: roles:read
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
          <h1 className="text-2xl font-bold text-gray-800">Role Management</h1>
          <p className="text-gray-500 mt-1">Manage roles and permissions</p>
        </div>
        <div className="flex gap-3">
          {hasManagePermissions && (
            <button
              onClick={() => setIsPermissionManagerOpen(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
            >
              <Icons.Key size={18} />
              Manage Permissions
            </button>
          )}
          {hasCreatePermission && (
            <button
              onClick={() => {
                setEditingRole(null);
                setIsRoleModalOpen(true);
              }}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
            >
              <Icons.Plus size={18} />
              Create Role
            </button>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="relative">
          <Icons.Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={18}
          />
          <input
            type="text"
            placeholder="Search roles by name or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Roles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRoles.map((role, index) => (
          <motion.div
            key={role.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden border border-gray-100"
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg ${getRoleBadgeColor(role.name)}`}
                  >
                    <Icons.Shield size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">
                      {role.name}
                    </h3>
                    {role.description && (
                      <p className="text-sm text-gray-500 mt-1">
                        {role.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  {/* Permission Management Button */}
                  {hasManagePermissions && (
                    <button
                      onClick={() => {
                        setSelectedRole(role);
                        setIsRolePermissionsOpen(true);
                      }}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Manage Permissions"
                    >
                      <Icons.Key size={18} className="text-purple-500" />
                    </button>
                  )}
                  {/* Edit Role Button */}
                  {hasUpdatePermission && (
                    <button
                      onClick={() => {
                        setEditingRole(role);
                        setIsRoleModalOpen(true);
                      }}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Edit Role"
                    >
                      <Icons.Edit size={18} className="text-indigo-500" />
                    </button>
                  )}
                  {/* Delete Role Button */}
                  {hasDeletePermission && role.name !== 'SYSTEM_ADMIN' && (
                    <button
                      onClick={() => {
                        setRoleToDelete(role);
                        setShowDeleteConfirm(true);
                      }}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Delete Role"
                    >
                      <Icons.Trash2 size={18} className="text-red-500" />
                    </button>
                  )}
                </div>
              </div>

              {/* Permissions Section */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    Permissions
                  </span>
                  <span className="text-xs text-gray-500">
                    {role.permissions?.length || 0} total
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                  {role.permissions && role.permissions.length > 0 ? (
                    role.permissions.slice(0, 8).map((perm) => (
                      <span
                        key={perm.id}
                        className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                        title={perm.description}
                      >
                        {perm.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-gray-400 italic">
                      No permissions assigned
                    </span>
                  )}
                  {role.permissions && role.permissions.length > 8 && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded text-xs">
                      +{role.permissions.length - 8} more
                    </span>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Users with role</span>
                  <p className="text-lg font-semibold text-gray-800">
                    {role._count?.users || 0}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Created</span>
                  <p className="text-sm text-gray-600">
                    {new Date(role.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Empty State */}
      {filteredRoles.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icons.Shield size={40} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No roles found
          </h3>
          <p className="text-gray-500 mb-4">
            {search
              ? 'Try adjusting your search'
              : 'Create your first role to get started'}
          </p>
          {!search && hasCreatePermission && (
            <button
              onClick={() => setIsRoleModalOpen(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Create Role
            </button>
          )}
        </div>
      )}

      {/* Role Form Modal */}
      <RoleFormModal
        isOpen={isRoleModalOpen}
        onClose={() => {
          setIsRoleModalOpen(false);
          setEditingRole(null);
        }}
        onSubmit={
          editingRole
            ? (data) => handleUpdateRole(editingRole.id, data)
            : handleCreateRole
        }
        initialData={editingRole}
        loading={formLoading}
      />

      {/* Permission Manager Modal */}
      {hasManagePermissions && (
        <PermissionManager
          isOpen={isPermissionManagerOpen}
          onClose={() => setIsPermissionManagerOpen(false)}
          permissions={permissions}
          onPermissionsChange={fetchPermissions}
        />
      )}

      {/* Role Permissions Modal */}
      <RolePermissionsModal
        isOpen={isRolePermissionsOpen}
        onClose={() => {
          setIsRolePermissionsOpen(false);
          setSelectedRole(null);
        }}
        role={selectedRole}
        permissions={permissions}
        onUpdatePermissions={handleUpdateRolePermissions}
      />

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && roleToDelete && (
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
                Delete Role
              </h3>
              <p className="text-gray-600 text-center mb-4">
                Are you sure you want to delete{' '}
                <strong>{roleToDelete.name}</strong>?
                {roleToDelete._count?.users > 0 && (
                  <span className="block mt-2 text-red-600">
                    Warning: This role is assigned to{' '}
                    {roleToDelete._count.users} user(s). Deleting it may affect
                    their permissions.
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
                  onClick={() => handleDeleteRole(roleToDelete.id)}
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
