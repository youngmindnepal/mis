'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';
import BatchFormModal from '@/components/batch/BatchFormModal';
import { usePermissions } from '@/hooks/usePermissions';
import Toast from '@/components/ui/Toast';
import { useDebounce } from '@/hooks/useDebounce';

export default function BatchesPage() {
  const { can, isLoading: permissionsLoading } = usePermissions();

  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [batchToDelete, setBatchToDelete] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [totalBatches, setTotalBatches] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const debouncedSearch = useDebounce(search, 500);
  const initialLoadDone = useRef(false);

  const [toast, setToast] = useState({
    show: false,
    message: '',
    type: 'success',
  });

  const hasReadPermission = can('batches', 'read');
  const hasCreatePermission = can('batches', 'create');
  const hasUpdatePermission = can('batches', 'update');
  const hasDeletePermission = can('batches', 'delete');

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 3000);
  };

  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/departments?limit=1000');
      if (response.ok) {
        const data = await response.json();
        setDepartments(data.departments || []);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchBatches = useCallback(
    async (showToastMessage = false, resetPage = false) => {
      if (!hasReadPermission) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const pageToFetch = resetPage ? 1 : currentPage;

        if (resetPage && currentPage !== 1) {
          setCurrentPage(1);
        }

        const params = new URLSearchParams({
          page: pageToFetch,
          limit: 10,
          ...(debouncedSearch && { search: debouncedSearch }),
          ...(selectedStatus !== 'all' && { status: selectedStatus }),
          ...(selectedDepartment !== 'all' && {
            departmentId: selectedDepartment,
          }),
        });

        const response = await fetch(`/api/batches?${params}`);

        if (!response.ok) {
          let errorMessage = 'Failed to fetch batches';
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          } catch (e) {
            console.error('Could not parse error response');
          }
          throw new Error(errorMessage);
        }

        const data = await response.json();
        setBatches(data.batches || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalBatches(data.pagination?.total || 0);

        if (showToastMessage) {
          showToast('Batches refreshed successfully!', 'success');
        }
      } catch (err) {
        console.error('Error fetching batches:', err);
        setError(err.message);
        if (showToastMessage) {
          showToast(err.message, 'error');
        }
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [
      hasReadPermission,
      currentPage,
      debouncedSearch,
      selectedStatus,
      selectedDepartment,
    ]
  );

  useEffect(() => {
    if (hasReadPermission && !initialLoadDone.current) {
      initialLoadDone.current = true;
      fetchDepartments();
      fetchBatches(false);
    }
  }, [hasReadPermission, fetchBatches]);

  useEffect(() => {
    if (initialLoadDone.current && hasReadPermission) {
      fetchBatches(false, true);
    }
  }, [
    debouncedSearch,
    selectedStatus,
    selectedDepartment,
    hasReadPermission,
    fetchBatches,
  ]);

  useEffect(() => {
    if (initialLoadDone.current && hasReadPermission && currentPage > 1) {
      fetchBatches(false, false);
    }
  }, [currentPage, hasReadPermission, fetchBatches]);

  const handleRefresh = async () => {
    setSearch('');
    setSelectedStatus('all');
    setSelectedDepartment('all');
    setCurrentPage(1);
    setError(null);
    await fetchBatches(true, true);
  };

  const handleClearFilters = () => {
    setSearch('');
    setSelectedStatus('all');
    setSelectedDepartment('all');
    setCurrentPage(1);
    showToast('Filters cleared', 'success');
  };

  const handleCreateBatch = async (formData) => {
    if (!hasCreatePermission) {
      showToast('You do not have permission to create batches', 'error');
      return;
    }

    try {
      setFormLoading(true);
      const response = await fetch('/api/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to create batch');

      showToast(`Batch "${data.name}" created successfully!`, 'success');
      setIsFormModalOpen(false);
      await fetchBatches(false, true);
    } catch (err) {
      showToast(err.message, 'error');
      console.error('Error creating batch:', err);
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateBatch = async (formData) => {
    if (!hasUpdatePermission) {
      showToast('You do not have permission to update batches', 'error');
      return;
    }

    try {
      setFormLoading(true);

      // Get the batch ID from formData
      const batchId = formData.id;

      console.log('🔵 handleUpdateBatch - formData:', formData);
      console.log('🔵 batchId from formData:', batchId);

      if (!batchId) {
        console.error('No batch ID in formData');
        showToast('Cannot update: Missing batch ID', 'error');
        return;
      }

      // Convert to number
      const numericId =
        typeof batchId === 'string' ? parseInt(batchId) : batchId;

      if (isNaN(numericId)) {
        console.error('Invalid batch ID:', batchId);
        showToast('Cannot update: Invalid batch ID', 'error');
        return;
      }

      console.log('🟢 Updating batch with ID:', numericId);

      // Remove the id from formData before sending
      const { id, ...updateData } = formData;

      console.log('🟢 Update URL:', `/api/batches/${numericId}`);
      console.log('🟢 Update data being sent:', updateData);

      const response = await fetch(`/api/batches/${numericId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('API Error Response:', data);
        throw new Error(data.error || 'Failed to update batch');
      }

      showToast(`Batch "${data.name}" updated successfully!`, 'success');
      setIsFormModalOpen(false);
      setEditingBatch(null);

      // Refresh the list
      await fetchBatches(true, true);
    } catch (err) {
      console.error('🔴 Error updating batch:', err);
      showToast(err.message, 'error');
    } finally {
      setFormLoading(false);
    }
  };
  const handleDeleteBatch = async (batchId) => {
    if (!hasDeletePermission) {
      showToast('You do not have permission to delete batches', 'error');
      return;
    }

    try {
      setDeleting(true);
      const id = parseInt(batchId);
      const response = await fetch(`/api/batches/${id}`, { method: 'DELETE' });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Failed to delete batch');

      showToast('Batch deleted successfully!', 'success');
      setShowDeleteConfirm(false);
      setBatchToDelete(null);
      await fetchBatches(false, true);
    } catch (err) {
      showToast(err.message, 'error');
      console.error('Error deleting batch:', err);
    } finally {
      setDeleting(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { color: 'bg-green-100 text-green-800', icon: Icons.CheckCircle },
      inactive: { color: 'bg-red-100 text-red-800', icon: Icons.XCircle },
      completed: {
        color: 'bg-blue-100 text-blue-800',
        icon: Icons.CheckCircle,
      },
      archived: { color: 'bg-gray-100 text-gray-800', icon: Icons.Archive },
    };
    const config = statusConfig[status] || statusConfig.active;
    const Icon = config.icon;
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}
      >
        <Icon size={12} />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  };

  if (
    permissionsLoading ||
    (loading && batches.length === 0 && !initialLoadDone.current)
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
            You don't have permission to view batches.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Toast
        show={toast.show}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ show: false, message: '', type: 'success' })}
      />

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

      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Batch Management</h1>
          <p className="text-gray-500 mt-1">
            Manage and organize student batches by department
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2 disabled:opacity-50"
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
                setEditingBatch(null);
                setIsFormModalOpen(true);
              }}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
            >
              <Icons.GraduationCap size={18} /> Add New Batch
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
                placeholder="Search by batch name, academic year, or description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Departments</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
          {(search ||
            selectedStatus !== 'all' ||
            selectedDepartment !== 'all') && (
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <Icons.X size={16} /> Clear Filters
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                  Batch Name
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                  Department
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                  Academic Year
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                  Duration
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                  Students
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
              {loading && batches.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-12">
                    <div className="flex items-center justify-center">
                      <Icons.Loader2
                        size={32}
                        className="animate-spin text-indigo-600"
                      />
                    </div>
                  </td>
                </tr>
              ) : batches.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-12">
                    <div className="flex flex-col items-center justify-center text-gray-500">
                      <Icons.GraduationCap
                        size={48}
                        className="mb-3 text-gray-300"
                      />
                      <p className="text-lg font-medium">No batches found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                batches.map((batch, index) => (
                  <motion.tr
                    key={batch.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-b hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <p className="font-medium text-gray-800">{batch.name}</p>
                      {batch.description && (
                        <p className="text-xs text-gray-500 truncate max-w-[300px]">
                          {batch.description}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {batch.department ? (
                        <div>
                          <p className="text-sm font-medium text-gray-800">
                            {batch.department.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {batch.department.code}
                          </p>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">
                          Not Assigned
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-sm text-gray-800">
                        {batch.academicYear || '-'}
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-sm text-gray-600">
                        {formatDate(batch.startDate)} -{' '}
                        {formatDate(batch.endDate)}
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <Icons.Users size={14} className="text-gray-400" />
                        <p className="text-sm text-gray-600">
                          {batch._count?.students || 0}
                        </p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {getStatusBadge(batch.status)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedBatch(batch);
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
                              const batchToEdit = {
                                id: batch.id,
                                name: batch.name || '',
                                description: batch.description || '',
                                academicYear: batch.academicYear || '',
                                startDate: batch.startDate || '',
                                endDate: batch.endDate || '',
                                departmentId: batch.departmentId || '',
                                status: batch.status || 'active',
                              };
                              setEditingBatch(batchToEdit);
                              setIsFormModalOpen(true);
                            }}
                            className="p-2 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Edit Batch"
                          >
                            <Icons.Edit size={18} className="text-indigo-500" />
                          </button>
                        )}
                        {hasDeletePermission && (
                          <button
                            onClick={() => {
                              setBatchToDelete(batch);
                              setShowDeleteConfirm(true);
                            }}
                            className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Batch"
                            disabled={batch._count?.students > 0}
                          >
                            <Icons.Trash2
                              size={18}
                              className={
                                batch._count?.students > 0
                                  ? 'text-gray-300'
                                  : 'text-red-500'
                              }
                            />
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
        {totalPages > 1 && (
          <div className="flex justify-between items-center p-4 border-t">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1 || loading}
              className="px-4 py-2 border rounded-lg disabled:opacity-50 hover:bg-gray-50"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || loading}
              className="px-4 py-2 border rounded-lg disabled:opacity-50 hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {(hasCreatePermission || hasUpdatePermission) && (
        <BatchFormModal
          isOpen={isFormModalOpen}
          onClose={() => {
            setIsFormModalOpen(false);
            setEditingBatch(null);
          }}
          onSubmit={editingBatch ? handleUpdateBatch : handleCreateBatch}
          initialData={editingBatch}
          loading={formLoading}
        />
      )}

      <AnimatePresence>
        {showDeleteConfirm && batchToDelete && (
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
                Delete Batch
              </h3>
              <p className="text-gray-600 text-center mb-4">
                Are you sure you want to delete{' '}
                <strong>{batchToDelete.name}</strong>? This action cannot be
                undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteBatch(batchToDelete.id)}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center gap-2 disabled:opacity-50"
                  disabled={deleting}
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

      <AnimatePresence>
        {isModalOpen && selectedBatch && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setIsModalOpen(false)}
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
                  Batch Details
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <Icons.X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <Icons.GraduationCap size={32} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800">
                      {selectedBatch.name}
                    </h3>
                    {selectedBatch.academicYear && (
                      <p className="text-gray-500">
                        {selectedBatch.academicYear}
                      </p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-500">Batch ID</label>
                    <p className="text-sm font-medium text-gray-800">
                      {selectedBatch.id}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Department</label>
                    <p className="text-sm font-medium text-gray-800">
                      {selectedBatch.department?.name || 'Not Assigned'}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Status</label>
                    <p className="text-sm">
                      {getStatusBadge(selectedBatch.status)}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Start Date</label>
                    <p className="text-sm text-gray-800">
                      {formatDate(selectedBatch.startDate)}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">End Date</label>
                    <p className="text-sm text-gray-800">
                      {formatDate(selectedBatch.endDate)}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">
                      Total Students
                    </label>
                    <p className="text-sm font-medium text-gray-800">
                      {selectedBatch._count?.students || 0}
                    </p>
                  </div>
                </div>
                {selectedBatch.description && (
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2">
                      Description
                    </h4>
                    <p className="text-sm text-gray-600">
                      {selectedBatch.description}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
