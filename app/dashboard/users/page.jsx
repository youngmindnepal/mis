'use client';
import { useRef } from 'react';
import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';
import Avatar from '@/components/user/Avatar';
import UserFormModal from '@/components/user/UserFormModal';
import { usePermissions } from '@/hooks/usePermissions';

export default function UsersPage() {
  const { data: session, update } = useSession();
  const { can, isLoading: permissionsLoading } = usePermissions();

  const [users, setUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [showAll, setShowAll] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  // Timeout refs for auto-dismiss
  const successTimeoutRef = useRef(null);
  const errorTimeoutRef = useRef(null);

  const hasReadPermission = can('users', 'read');
  const hasCreatePermission = can('users', 'create');
  const hasUpdatePermission = can('users', 'update');
  const hasDeletePermission = can('users', 'delete');

  // Auto-dismiss success message
  useEffect(() => {
    if (successMessage) {
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
      successTimeoutRef.current = setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    }
    return () => {
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
    };
  }, [successMessage]);

  // Auto-dismiss error message
  useEffect(() => {
    if (errorMessage) {
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
      errorTimeoutRef.current = setTimeout(() => {
        setErrorMessage(null);
      }, 3000);
    }
    return () => {
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
    };
  }, [errorMessage]);

  const fetchAllUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: 1,
        limit: 100,
        ...(search && { search }),
        ...(selectedStatus !== 'all' && { status: selectedStatus }),
        ...(selectedRole !== 'all' && { role: selectedRole }),
      });

      const response = await fetch(`/api/users?${params}`);
      if (!response.ok) throw new Error('Failed to fetch users');

      const data = await response.json();
      const sortedUsers = [...data.users].sort((a, b) =>
        a.name?.localeCompare(b.name)
      );
      setAllUsers(sortedUsers);
      setUsers(sortedUsers);
      setShowAll(true);
    } catch (err) {
      setErrorMessage(err.message);
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSingleUser = async (userId) => {
    try {
      const response = await fetch(`/api/users/${userId}`);
      if (!response.ok) throw new Error('Failed to fetch user');
      const data = await response.json();
      return data;
    } catch (err) {
      console.error('Error fetching user:', err);
      return null;
    }
  };

  const applyFilters = useCallback(
    (usersList) => {
      let filtered = [...usersList];

      if (search) {
        const searchLower = search.toLowerCase();
        filtered = filtered.filter(
          (user) =>
            user.name?.toLowerCase().includes(searchLower) ||
            user.email?.toLowerCase().includes(searchLower) ||
            user.phone?.toLowerCase().includes(searchLower)
        );
      }

      if (selectedStatus !== 'all') {
        filtered = filtered.filter((user) => user.status === selectedStatus);
      }

      if (selectedRole !== 'all') {
        filtered = filtered.filter((user) =>
          user.roles?.some((role) => role.name === selectedRole)
        );
      }

      filtered.sort((a, b) => a.name?.localeCompare(b.name));

      return filtered;
    },
    [search, selectedStatus, selectedRole]
  );

  useEffect(() => {
    if (showAll && allUsers.length > 0) {
      const filtered = applyFilters(allUsers);
      setUsers(filtered);
    } else if (!showAll && users.length > 0) {
      const filtered = applyFilters(users);
      setUsers(filtered);
    }
  }, [search, selectedStatus, selectedRole, showAll, allUsers, applyFilters]);

  useEffect(() => {
    if (hasReadPermission) {
      fetchAllUsers();
    }
  }, [hasReadPermission]);

  const handleCreateUser = async (formData) => {
    if (!hasCreatePermission) {
      setErrorMessage("You don't have permission to create users");
      return;
    }

    try {
      setFormLoading(true);

      const response = await fetch('/api/users', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create user');
      }

      const newUser = await response.json();

      const singleUser = await fetchSingleUser(newUser.id);
      if (singleUser) {
        setUsers([singleUser]);
        setShowAll(false);
      }

      setSuccessMessage('User created successfully!');
      setIsFormModalOpen(false);
    } catch (err) {
      setErrorMessage(err.message);
      console.error('Error creating user:', err);
      throw err;
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateUser = async (userId, formData) => {
    if (!hasUpdatePermission) {
      setErrorMessage("You don't have permission to update users");
      return;
    }

    try {
      setFormLoading(true);

      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update user');
      }

      const updatedUser = await response.json();

      const singleUser = await fetchSingleUser(userId);
      if (singleUser) {
        setUsers([singleUser]);
        setShowAll(false);
      }

      if (allUsers.length > 0) {
        const updatedAllUsers = allUsers.map((u) =>
          u.id === userId ? singleUser : u
        );
        setAllUsers(updatedAllUsers);
      }

      setSuccessMessage('User updated successfully!');
      setIsFormModalOpen(false);
      setEditingUser(null);

      if (selectedUser?.id === userId) {
        setIsModalOpen(false);
        setSelectedUser(null);
      }
    } catch (err) {
      setErrorMessage(err.message);
      console.error('Error updating user:', err);
      throw err;
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!hasDeletePermission) {
      setErrorMessage("You don't have permission to delete users");
      return;
    }

    if (userId === session?.user?.id) {
      setErrorMessage('You cannot delete your own account!');
      return;
    }

    try {
      setDeleting(true);
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete user');
      }

      if (allUsers.length > 0) {
        const updatedAllUsers = allUsers.filter((u) => u.id !== userId);
        setAllUsers(updatedAllUsers);

        if (showAll) {
          setUsers(updatedAllUsers);
        } else {
          setUsers([]);
          setShowAll(false);
        }
      } else {
        setUsers([]);
        setShowAll(false);
      }

      setSuccessMessage('User deleted successfully!');
      setShowDeleteConfirm(false);
      setUserToDelete(null);
      setSelectedUsers((prev) => prev.filter((id) => id !== userId));

      if (selectedUser?.id === userId) {
        setIsModalOpen(false);
        setSelectedUser(null);
      }
    } catch (err) {
      setErrorMessage(err.message);
      console.error('Error deleting user:', err);
    } finally {
      setDeleting(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!hasDeletePermission) {
      setErrorMessage("You don't have permission to delete users");
      return;
    }

    const usersToDelete = selectedUsers.filter(
      (id) => id !== session?.user?.id
    );

    if (usersToDelete.length === 0) {
      setErrorMessage('Cannot delete your own account or no users selected!');
      return;
    }

    try {
      setDeleting(true);
      const response = await fetch('/api/users/bulk-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userIds: usersToDelete }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete users');
      }

      const data = await response.json();

      if (allUsers.length > 0) {
        const updatedAllUsers = allUsers.filter(
          (u) => !usersToDelete.includes(u.id)
        );
        setAllUsers(updatedAllUsers);

        if (showAll) {
          setUsers(updatedAllUsers);
        }
      }

      setSelectedUsers([]);
      setSuccessMessage(`Successfully deleted ${data.deletedCount} user(s)`);
      setShowBulkDeleteConfirm(false);
    } catch (err) {
      setErrorMessage(err.message);
      console.error('Error bulk deleting users:', err);
    } finally {
      setDeleting(false);
    }
  };

  const toggleUserSelection = (userId) => {
    if (userId === session?.user?.id) return;

    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const toggleSelectAll = () => {
    const selectableUsers = users.filter((u) => u.id !== session?.user?.id);
    if (selectedUsers.length === selectableUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(selectableUsers.map((u) => u.id));
    }
  };

  // Helper function to prepare user data for editing
  const prepareUserForEdit = (user) => {
    let roleId = null;
    if (user.roleId) {
      roleId = user.roleId;
    } else if (user.role && user.role.id) {
      roleId = user.role.id;
    } else if (user.roles && user.roles.length > 0) {
      roleId = user.roles[0].id;
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: user.address,
      status: user.status,
      profilePicture: user.profilePicture,
      roleId: roleId,
      role: user.role || (user.roles && user.roles[0]) || null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { color: 'bg-green-100 text-green-800', icon: Icons.CheckCircle },
      inactive: { color: 'bg-red-100 text-red-800', icon: Icons.XCircle },
    };

    const config = statusConfig[status] || statusConfig.active;
    const Icon = config.icon;

    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}
      >
        <Icon size={12} />
        {status}
      </span>
    );
  };

  const UserDetailModal = ({ user, onClose }) => (
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
          <h2 className="text-xl font-bold text-gray-800">User Details</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Icons.X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex items-center gap-4">
            <Avatar
              src={user.profilePicture}
              alt={user.name}
              size={80}
              className="rounded-xl"
            />
            <div>
              <h3 className="text-xl font-semibold text-gray-800">
                {user.name}
              </h3>
              <p className="text-gray-500">{user.email}</p>
              {getStatusBadge(user.status)}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500">Phone</label>
              <p className="text-sm font-medium text-gray-800">
                {user.phone || 'N/A'}
              </p>
            </div>
            <div>
              <label className="text-xs text-gray-500">Address</label>
              <p className="text-sm font-medium text-gray-800">
                {user.address || 'N/A'}
              </p>
            </div>
            <div>
              <label className="text-xs text-gray-500">Joined</label>
              <p className="text-sm font-medium text-gray-800">
                {new Date(user.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div>
              <label className="text-xs text-gray-500">Last Updated</label>
              <p className="text-sm font-medium text-gray-800">
                {new Date(user.updatedAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-gray-800 mb-2">Role</h4>
            <div className="flex flex-wrap gap-2">
              {user.roles?.map((role) => (
                <span
                  key={role.id}
                  className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm"
                >
                  {role.name}
                </span>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t flex gap-3">
            {user.id !== session?.user?.id && hasUpdatePermission && (
              <button
                onClick={() => {
                  onClose();
                  const formattedUser = prepareUserForEdit(user);
                  setEditingUser(formattedUser);
                  setIsFormModalOpen(true);
                }}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
              >
                <Icons.Edit size={18} />
                Edit User
              </button>
            )}
            {user.id !== session?.user?.id && hasDeletePermission && (
              <button
                onClick={() => {
                  onClose();
                  setUserToDelete(user);
                  setShowDeleteConfirm(true);
                }}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
              >
                <Icons.Trash2 size={18} />
                Delete User
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );

  if (permissionsLoading || (loading && users.length === 0 && showAll)) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

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
            You don't have permission to view users.
          </p>
          <p className="text-red-500 text-sm mt-2">
            Required permission: users:read
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Success Toast */}
      <AnimatePresence>
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            transition={{ duration: 0.3 }}
            className="fixed top-20 right-6 z-50 bg-green-50 border-l-4 border-green-500 text-green-800 px-4 py-3 rounded-lg shadow-lg min-w-[280px]"
          >
            <div className="flex items-center gap-2">
              <Icons.CheckCircle size={20} className="text-green-500" />
              <span className="font-medium">{successMessage}</span>
              <button
                onClick={() => setSuccessMessage(null)}
                className="ml-auto hover:text-green-900"
              >
                <Icons.X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Toast */}
      <AnimatePresence>
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            transition={{ duration: 0.3 }}
            className="fixed top-20 right-6 z-50 bg-red-50 border-l-4 border-red-500 text-red-800 px-4 py-3 rounded-lg shadow-lg min-w-[280px]"
          >
            <div className="flex items-center gap-2">
              <Icons.AlertCircle size={20} className="text-red-500" />
              <span className="font-medium">{errorMessage}</span>
              <button
                onClick={() => setErrorMessage(null)}
                className="ml-auto hover:text-red-900"
              >
                <Icons.X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Users Management</h1>
          <p className="text-gray-500 mt-1">
            Manage and monitor all users in the system
          </p>
          {!showAll && users.length === 1 && (
            <p className="text-sm text-indigo-600 mt-1">
              Showing newly{' '}
              {users[0]?.createdAt && !users[0]?.updatedAt
                ? 'created'
                : 'updated'}{' '}
              user. Click Refresh to see all users.
            </p>
          )}
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchAllUsers}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
          >
            <Icons.RefreshCw
              size={18}
              className={loading ? 'animate-spin' : ''}
            />
            Refresh
          </button>
          {hasCreatePermission && (
            <button
              onClick={() => {
                setEditingUser(null);
                setIsFormModalOpen(true);
              }}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
            >
              <Icons.UserPlus size={18} />
              Add New User
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Icons.Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                type="text"
                placeholder="Search by name, email, or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Roles</option>
            <option value="SYSTEM_ADMIN">System Admin</option>
            <option value="ADMIN">Admin</option>
            <option value="COORDINATOR">Coordinator</option>
            <option value="COUNSELOR">Counselor</option>
            <option value="TU_ADMIN">TU Admin</option>
            <option value="FACILITY_ADMIN">Facility Admin</option>
            <option value="IT_ADMIN">IT Admin</option>
            <option value="LIBRARIAN">Librarian</option>
            <option value="GENERAL_STAFF">General Staff</option>
            <option value="STUDENT">Student</option>
            <option value="FACULTY">Faculty</option>
            <option value="PARENT">Parent</option>
          </select>

          {hasDeletePermission && selectedUsers.length > 0 && (
            <button
              onClick={() => setShowBulkDeleteConfirm(true)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
            >
              <Icons.Trash2 size={18} />
              Delete Selected ({selectedUsers.length})
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left py-3 px-4 w-10">
                  {hasDeletePermission && users.length > 0 && (
                    <input
                      type="checkbox"
                      checked={
                        selectedUsers.length > 0 &&
                        selectedUsers.length ===
                          users.filter((u) => u.id !== session?.user?.id).length
                      }
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      disabled={
                        users.filter((u) => u.id !== session?.user?.id)
                          .length === 0
                      }
                    />
                  )}
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                  User
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                  Contact
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                  Role
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                  Status
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                  Joined
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-12">
                    <div className="text-gray-500">
                      <Icons.Users
                        size={48}
                        className="mx-auto mb-4 text-gray-300"
                      />
                      <p>No users found</p>
                      <p className="text-sm mt-2">
                        {search ||
                        selectedStatus !== 'all' ||
                        selectedRole !== 'all'
                          ? 'Try adjusting your filters'
                          : 'Click Refresh to load users'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                users.map((user, index) => {
                  const isCurrentUser = user.id === session?.user?.id;
                  return (
                    <motion.tr
                      key={user.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="border-b hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-3 px-4">
                        {hasDeletePermission && !isCurrentUser && (
                          <input
                            type="checkbox"
                            checked={selectedUsers.includes(user.id)}
                            onChange={() => toggleUserSelection(user.id)}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <Avatar
                            src={user.profilePicture}
                            alt={user.name}
                            size={40}
                          />
                          <div>
                            <p className="font-medium text-gray-800">
                              {user.name}
                              {isCurrentUser && (
                                <span className="ml-2 text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                                  You
                                </span>
                              )}
                            </p>
                            <p className="text-sm text-gray-500">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-sm text-gray-600">
                          {user.phone || 'N/A'}
                        </p>
                        <p className="text-xs text-gray-400 truncate max-w-[200px]">
                          {user.address || 'No address'}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {user.roles?.map((role) => (
                            <span
                              key={role.id}
                              className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded text-xs"
                            >
                              {role.name}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {getStatusBadge(user.status)}
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-sm text-gray-600">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setIsModalOpen(true);
                            }}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Icons.Eye size={18} className="text-gray-500" />
                          </button>
                          {hasUpdatePermission && (
                            <button
                              onClick={() => {
                                const formattedUser = prepareUserForEdit(user);
                                setEditingUser(formattedUser);
                                setIsFormModalOpen(true);
                              }}
                              className="p-2 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Edit User"
                            >
                              <Icons.Edit
                                size={18}
                                className="text-indigo-500"
                              />
                            </button>
                          )}
                          {hasDeletePermission && !isCurrentUser && (
                            <button
                              onClick={() => {
                                setUserToDelete(user);
                                setShowDeleteConfirm(true);
                              }}
                              className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete User"
                            >
                              <Icons.Trash2
                                size={18}
                                className="text-red-500"
                              />
                            </button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <UserFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingUser(null);
        }}
        onSubmit={
          editingUser
            ? (data) => handleUpdateUser(editingUser.id, data)
            : handleCreateUser
        }
        initialData={editingUser}
        loading={formLoading}
      />

      <AnimatePresence>
        {showDeleteConfirm && userToDelete && (
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
                Delete User
              </h3>
              <p className="text-gray-600 text-center mb-4">
                Are you sure you want to delete{' '}
                <strong>{userToDelete.name}</strong>? This action cannot be
                undone.
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
                  onClick={() => handleDeleteUser(userToDelete.id)}
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

      <AnimatePresence>
        {showBulkDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowBulkDeleteConfirm(false)}
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
                Bulk Delete Users
              </h3>
              <p className="text-gray-600 text-center mb-4">
                Are you sure you want to delete{' '}
                <strong>{selectedUsers.length}</strong> user(s)? This action
                cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowBulkDeleteConfirm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkDelete}
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
                      Delete All
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isModalOpen && selectedUser && (
          <UserDetailModal
            user={selectedUser}
            onClose={() => {
              setIsModalOpen(false);
              setSelectedUser(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
