// app/departments/page.js
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';
import DepartmentFormModal from '@/components/department/DepartmentFormModal';
import { usePermissions } from '@/hooks/usePermissions';
import Toast from '@/components/ui/Toast';
import { useDebounce } from '@/hooks/useDebounce'; // Create this hook if you don't have it

export default function DepartmentsPage() {
  const { can, isLoading: permissionsLoading } = usePermissions();

  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [departmentToDelete, setDepartmentToDelete] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [totalDepartments, setTotalDepartments] = useState(0);

  // Debounce search to avoid too many API calls
  const debouncedSearch = useDebounce(search, 500);

  // Track if initial load has happened
  const initialLoadDone = useRef(false);

  // Toast notifications state
  const [toast, setToast] = useState({
    show: false,
    message: '',
    type: 'success',
  });

  // Check permissions
  const hasReadPermission = can('departments', 'read');
  const hasCreatePermission = can('departments', 'create');
  const hasUpdatePermission = can('departments', 'update');
  const hasDeletePermission = can('departments', 'delete');

  // Show toast message
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 3000);
  };

  // Fetch departments with current filters
  const fetchDepartments = useCallback(
    async (showToastMessage = false, resetPage = false) => {
      if (!hasReadPermission) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Reset to page 1 if requested (when filters change)
        const pageToFetch = resetPage ? 1 : currentPage;

        const params = new URLSearchParams({
          page: pageToFetch,
          limit: 10,
          ...(debouncedSearch && { search: debouncedSearch }),
          ...(selectedStatus !== 'all' && { status: selectedStatus }),
        });

        console.log('Fetching departments with params:', params.toString());

        const response = await fetch(`/api/departments?${params}`);
        if (!response.ok) throw new Error('Failed to fetch departments');

        const data = await response.json();
        console.log('Fetched departments count:', data.departments.length);
        console.log('Total pages:', data.pagination.totalPages);
        console.log('Total departments:', data.pagination.total);

        setDepartments(data.departments);
        setTotalPages(data.pagination.totalPages);
        setTotalDepartments(data.pagination.total);

        // Update current page if it was reset
        if (resetPage && pageToFetch !== currentPage) {
          setCurrentPage(pageToFetch);
        }

        if (showToastMessage) {
          showToast('Departments refreshed successfully!', 'success');
        }
      } catch (err) {
        setError(err.message);
        if (showToastMessage) {
          showToast(err.message, 'error');
        }
        console.error('Error fetching departments:', err);
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [hasReadPermission, currentPage, debouncedSearch, selectedStatus]
  );

  // Initial load - only once
  useEffect(() => {
    if (hasReadPermission && !initialLoadDone.current) {
      initialLoadDone.current = true;
      fetchDepartments(false);
    }
  }, [hasReadPermission, fetchDepartments]);

  // Fetch when filters change (search, status, page)
  useEffect(() => {
    if (initialLoadDone.current && hasReadPermission) {
      // Reset to page 1 when search or status changes
      const shouldResetPage = true;
      fetchDepartments(false, shouldResetPage);
    }
  }, [debouncedSearch, selectedStatus, hasReadPermission, fetchDepartments]);

  // Fetch when page changes (but not on initial load)
  useEffect(() => {
    if (initialLoadDone.current && hasReadPermission && currentPage > 1) {
      fetchDepartments(false, false);
    }
  }, [currentPage, hasReadPermission, fetchDepartments]);

  // Refresh handler - resets filters and fetches all departments
  const handleRefresh = () => {
    console.log(
      'Refresh button clicked - resetting filters and fetching all departments'
    );

    // Reset all filters
    setSearch('');
    setSelectedStatus('all');
    setCurrentPage(1);

    // Fetch will be triggered by the filter useEffect
    // But we want to show a toast message
    setTimeout(() => {
      fetchDepartments(true, true);
    }, 0);
  };

  // Clear filters handler
  const handleClearFilters = () => {
    setSearch('');
    setSelectedStatus('all');
    setCurrentPage(1);
    // Fetch will be automatically triggered by the filter useEffect
    showToast('Filters cleared', 'success');
  };

  // Create department - shows ONLY the created department
  const handleCreateDepartment = async (formData) => {
    if (!hasCreatePermission) {
      showToast('You do not have permission to create departments', 'error');
      return;
    }

    try {
      setFormLoading(true);

      console.log('Creating department with data:', formData);

      const response = await fetch('/api/departments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create department');
      }

      console.log('Department created successfully:', data);

      // Show success toast with department name
      showToast(`Department "${data.name}" created successfully!`, 'success');

      setIsFormModalOpen(false);

      // If we have active filters, refresh the list to show proper filtered results
      if (search || selectedStatus !== 'all') {
        // Reset to page 1 and refresh with current filters
        setCurrentPage(1);
        await fetchDepartments(false, true);
      } else {
        // Only add the new department to the top - NO fetching of all departments
        setDepartments((prevDepartments) => {
          console.log('Previous departments count:', prevDepartments.length);
          const newDepartments = [data, ...prevDepartments];
          console.log('New departments count:', newDepartments.length);
          return newDepartments;
        });

        // Update total count
        setTotalDepartments((prev) => prev + 1);
      }
    } catch (err) {
      showToast(err.message, 'error');
      console.error('Error creating department:', err);
    } finally {
      setFormLoading(false);
    }
  };

  // Update department - shows ONLY the updated department
  const handleUpdateDepartment = async (formData) => {
    if (!hasUpdatePermission) {
      showToast('You do not have permission to update departments', 'error');
      return;
    }

    try {
      setFormLoading(true);

      if (!editingDepartment || !editingDepartment.id) {
        throw new Error('No department selected for update');
      }

      const departmentId = parseInt(editingDepartment.id);
      console.log(
        'Updating department ID:',
        departmentId,
        'with data:',
        formData
      );

      const response = await fetch(`/api/departments/${departmentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update department');
      }

      console.log('Department updated successfully:', data);

      // Show success toast with updated department name
      showToast(`Department "${data.name}" updated successfully!`, 'success');

      setIsFormModalOpen(false);
      setEditingDepartment(null);

      // If we have active filters that might exclude this department, refresh the list
      if (search || selectedStatus !== 'all') {
        await fetchDepartments(false, false);
      } else {
        // ONLY update the specific department in the list - NO fetching of all departments
        setDepartments((prevDepartments) => {
          const updatedDepartments = prevDepartments.map((dept) =>
            dept.id === departmentId ? data : dept
          );
          console.log(
            'Updated department in list, new count:',
            updatedDepartments.length
          );
          return updatedDepartments;
        });
      }

      // Also update selected department if it's open
      if (selectedDepartment?.id === departmentId) {
        setSelectedDepartment(data);
      }
    } catch (err) {
      showToast(err.message, 'error');
      console.error('Error updating department:', err);
    } finally {
      setFormLoading(false);
    }
  };

  // Delete department
  const handleDeleteDepartment = async (departmentId) => {
    if (!hasDeletePermission) {
      showToast('You do not have permission to delete departments', 'error');
      return;
    }

    try {
      setDeleting(true);

      const id = parseInt(departmentId);
      console.log('Deleting department ID:', id);

      const response = await fetch(`/api/departments/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete department');
      }

      console.log('Department deleted successfully');

      showToast(`Department deleted successfully!`, 'success');

      setShowDeleteConfirm(false);
      setDepartmentToDelete(null);

      // Remove department from the list
      setDepartments((prevDepartments) => {
        const filteredDepartments = prevDepartments.filter(
          (dept) => dept.id !== id
        );
        console.log(
          'Removed department, new count:',
          filteredDepartments.length
        );
        return filteredDepartments;
      });

      // Update total count
      setTotalDepartments((prev) => prev - 1);

      // If this was the last item on the page and not page 1, go to previous page
      if (departments.length === 1 && currentPage > 1) {
        setCurrentPage((prev) => prev - 1);
        await fetchDepartments(false, false);
      }

      // Close detail modal if it's open
      if (selectedDepartment?.id === id) {
        setIsModalOpen(false);
        setSelectedDepartment(null);
      }
    } catch (err) {
      showToast(err.message, 'error');
      console.error('Error deleting department:', err);
    } finally {
      setDeleting(false);
    }
  };

  // Get status badge styling
  const getStatusBadge = (status) => {
    const safeStatus = status?.toLowerCase() || 'active';

    const statusConfig = {
      active: { color: 'bg-green-100 text-green-800', icon: Icons.CheckCircle },
      inactive: { color: 'bg-red-100 text-red-800', icon: Icons.XCircle },
      archived: { color: 'bg-gray-100 text-gray-800', icon: Icons.Archive },
    };

    const config = statusConfig[safeStatus] || statusConfig.active;
    const Icon = config.icon;

    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}
      >
        <Icon size={12} />
        {safeStatus.charAt(0).toUpperCase() + safeStatus.slice(1)}
      </span>
    );
  };

  // Department Detail Modal
  const DepartmentDetailModal = ({ department, onClose }) => (
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
            Department Details
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <Icons.X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Icons.Building2 size={32} className="text-white" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-800">
                {department.name}
              </h3>
              <p className="text-gray-500 font-mono">{department.code}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500">Department ID</label>
              <p className="text-sm font-medium text-gray-800">
                {department.id}
              </p>
            </div>
            <div>
              <label className="text-xs text-gray-500">Status</label>
              <p className="text-sm">{getStatusBadge(department.status)}</p>
            </div>
            <div>
              <label className="text-xs text-gray-500">
                Head of Department
              </label>
              <p className="text-sm font-medium text-gray-800">
                {department.headOfDepartment?.name || 'Not Assigned'}
              </p>
            </div>

            <div>
              <label className="text-xs text-gray-500">Created At</label>
              <p className="text-sm text-gray-600">
                {new Date(department.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div>
              <label className="text-xs text-gray-500">Last Updated</label>
              <p className="text-sm text-gray-600">
                {new Date(department.updatedAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          {department.description && (
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">Description</h4>
              <p className="text-sm text-gray-600">{department.description}</p>
            </div>
          )}

          <div className="pt-4 border-t flex gap-3">
            {hasUpdatePermission && (
              <button
                onClick={() => {
                  onClose();
                  setEditingDepartment(department);
                  setIsFormModalOpen(true);
                }}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2"
              >
                <Icons.Edit size={18} /> Edit Department
              </button>
            )}
            {hasDeletePermission && (
              <button
                onClick={() => {
                  onClose();
                  setDepartmentToDelete(department);
                  setShowDeleteConfirm(true);
                }}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center gap-2"
              >
                <Icons.Trash2 size={18} /> Delete Department
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );

  // Show loading state
  if (
    permissionsLoading ||
    (loading && departments.length === 0 && !initialLoadDone.current)
  ) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-200 rounded w-1/4"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

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
            You don't have permission to view departments.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Toast Notifications */}
      <Toast
        show={toast.show}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ show: false, message: '', type: 'success' })}
      />

      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Department Management
          </h1>
          <p className="text-gray-500 mt-1">
            Manage and organize departments in the system
          </p>
        </div>
        <div className="flex gap-3">
          {/* Refresh Button - Shows all departments */}
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Icons.RefreshCw
              size={18}
              className={loading ? 'animate-spin' : ''}
            />
            {loading ? 'Loading...' : 'Refresh'}
          </button>

          {hasCreatePermission && (
            <button
              onClick={() => {
                setEditingDepartment(null);
                setIsFormModalOpen(true);
              }}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
            >
              <Icons.Building2 size={18} /> Add New Department
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
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
                placeholder="Search by department name, code, or description..."
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
            <option value="archived">Archived</option>
          </select>

          <button
            onClick={handleClearFilters}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <Icons.X size={16} /> Clear Filters
          </button>
        </div>

        {/* Filter info */}
        {(search || selectedStatus !== 'all') && (
          <div className="mt-3 text-sm text-gray-500">
            Showing {departments.length} of {totalDepartments} departments
            {search && <span> matching "{search}"</span>}
            {selectedStatus !== 'all' && (
              <span> with status: {selectedStatus}</span>
            )}
          </div>
        )}
      </div>

      {/* Departments Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                  Code
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                  Department Name
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                  Head of Department
                </th>

                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                  Status
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && departments.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-12">
                    <div className="flex items-center justify-center">
                      <Icons.Loader2
                        size={32}
                        className="animate-spin text-indigo-600"
                      />
                    </div>
                  </td>
                </tr>
              ) : departments.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-12">
                    <div className="flex flex-col items-center justify-center text-gray-500">
                      <Icons.Building2
                        size={48}
                        className="mb-3 text-gray-300"
                      />
                      <p className="text-lg font-medium">
                        No departments found
                      </p>
                      <p className="text-sm mt-1">
                        {search || selectedStatus !== 'all'
                          ? 'Try adjusting your filters'
                          : 'Click "Add New Department" to create one'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                departments.map((department, index) => (
                  <motion.tr
                    key={department.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-b hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <p className="text-sm font-mono font-medium text-gray-800">
                        {department.code}
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-medium text-gray-800">
                        {department.name}
                      </p>
                      {department.description && (
                        <p className="text-xs text-gray-500 truncate max-w-[300px]">
                          {department.description}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-sm text-gray-800">
                        {department.headOfDepartment?.name || '-'}
                      </p>
                      {department.headOfDepartment?.email && (
                        <p className="text-xs text-gray-500">
                          {department.headOfDepartment.email}
                        </p>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      {getStatusBadge(department.status)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedDepartment(department);
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
                              setEditingDepartment(department);
                              setIsFormModalOpen(true);
                            }}
                            className="p-2 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Edit Department"
                          >
                            <Icons.Edit size={18} className="text-indigo-500" />
                          </button>
                        )}
                        {hasDeletePermission && (
                          <button
                            onClick={() => {
                              setDepartmentToDelete(department);
                              setShowDeleteConfirm(true);
                            }}
                            className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Department"
                          >
                            <Icons.Trash2 size={18} className="text-red-500" />
                          </button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center p-4 border-t">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1 || loading}
              className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || loading}
              className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Department Form Modal */}
      <DepartmentFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingDepartment(null);
        }}
        onSubmit={
          editingDepartment ? handleUpdateDepartment : handleCreateDepartment
        }
        initialData={editingDepartment}
        loading={formLoading}
      />

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && departmentToDelete && (
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
                Delete Department
              </h3>
              <p className="text-gray-600 text-center mb-4">
                Are you sure you want to delete{' '}
                <strong>{departmentToDelete.name}</strong>? This action cannot
                be undone.
                {departmentToDelete._count?.users > 0 && (
                  <span className="block mt-2 text-red-600">
                    Warning: This department has{' '}
                    {departmentToDelete._count.users} employee(s) assigned.
                  </span>
                )}
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
                  onClick={() => handleDeleteDepartment(departmentToDelete.id)}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  disabled={deleting || departmentToDelete._count?.users > 0}
                >
                  {deleting ? (
                    <Icons.Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Icons.Trash2 size={18} />
                  )}
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Department Detail Modal */}
      <AnimatePresence>
        {isModalOpen && selectedDepartment && (
          <DepartmentDetailModal
            department={selectedDepartment}
            onClose={() => {
              setIsModalOpen(false);
              setSelectedDepartment(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
