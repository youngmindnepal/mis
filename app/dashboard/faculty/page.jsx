// app/faculty/page.jsx
'use client';

import { useRef } from 'react';
import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';
import FacultyFormModal from '@/components/faculty/FacultyFormModal';
import { usePermissions } from '@/hooks/usePermissions';
import {
  exportFacultyToExcel,
  importFacultyFromExcel,
  downloadFacultyTemplate,
} from '@/lib/excelUtilsFaculty';

export default function FacultyPage() {
  const { data: session } = useSession();
  const { can, isLoading: permissionsLoading } = usePermissions();

  const [faculty, setFaculty] = useState([]);
  const [allFaculty, setAllFaculty] = useState([]);
  const [showAll, setShowAll] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedFaculty, setSelectedFaculty] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [facultyToDelete, setFacultyToDelete] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [selectedFacultyIds, setSelectedFacultyIds] = useState([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingFaculty, setEditingFaculty] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  // Import/Export states
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importProgress, setImportProgress] = useState(0);
  const [importErrors, setImportErrors] = useState([]);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);

  // Sorting states - default to name ascending
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  // Timeout refs for auto-dismiss
  const successTimeoutRef = useRef(null);
  const errorTimeoutRef = useRef(null);

  // Permission checks using usePermissions hook
  const hasReadPermission = can('faculty', 'read');
  const hasCreatePermission = can('faculty', 'create');
  const hasUpdatePermission = can('faculty', 'update');
  const hasDeletePermission = can('faculty', 'delete');
  const hasExportPermission = can('faculty', 'export') || hasReadPermission;
  const hasImportPermission = can('faculty', 'import') || hasCreatePermission;

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

  // Fetch all faculty
  const fetchAllFaculty = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: 1,
        limit: 100,
        ...(search && { search }),
        ...(selectedStatus !== 'all' && { status: selectedStatus }),
        sortBy,
        sortOrder,
      });

      const response = await fetch(`/api/faculty?${params}`);

      // Enhanced error handling
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error ||
            `Failed to fetch faculty: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      const sortedFaculty = [...(data.faculty || [])].sort((a, b) =>
        a.name?.localeCompare(b.name)
      );
      setAllFaculty(sortedFaculty);
      setFaculty(sortedFaculty);
      setShowAll(true);
    } catch (err) {
      console.error('Error fetching faculty:', err);
      setErrorMessage(`Failed to load faculty: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch single faculty
  const fetchSingleFaculty = async (facultyId) => {
    try {
      const response = await fetch(`/api/faculty/${facultyId}`);
      if (!response.ok) throw new Error('Failed to fetch faculty');
      const data = await response.json();
      return data.faculty;
    } catch (err) {
      console.error('Error fetching faculty:', err);
      return null;
    }
  };

  // Apply filters
  const applyFilters = useCallback(
    (facultyList) => {
      let filtered = [...facultyList];

      if (search) {
        const searchLower = search.toLowerCase();
        filtered = filtered.filter(
          (faculty) =>
            faculty.name?.toLowerCase().includes(searchLower) ||
            faculty.email?.toLowerCase().includes(searchLower) ||
            faculty.phone?.toLowerCase().includes(searchLower) ||
            faculty.designation?.toLowerCase().includes(searchLower)
        );
      }

      if (selectedStatus !== 'all') {
        filtered = filtered.filter(
          (faculty) => faculty.status === selectedStatus
        );
      }

      // Apply sorting
      filtered.sort((a, b) => {
        let aVal, bVal;
        if (sortBy === 'name') {
          aVal = a.name || '';
          bVal = b.name || '';
        } else if (sortBy === 'designation') {
          aVal = a.designation || '';
          bVal = b.designation || '';
        } else if (sortBy === 'status') {
          aVal = a.status || '';
          bVal = b.status || '';
        } else if (sortBy === 'joinedDate') {
          aVal = a.joinedDate || '';
          bVal = b.joinedDate || '';
        } else {
          aVal = a.name || '';
          bVal = b.name || '';
        }

        if (sortOrder === 'asc') {
          return aVal.localeCompare(bVal);
        } else {
          return bVal.localeCompare(aVal);
        }
      });

      return filtered;
    },
    [search, selectedStatus, sortBy, sortOrder]
  );

  useEffect(() => {
    if (showAll && allFaculty.length > 0) {
      const filtered = applyFilters(allFaculty);
      setFaculty(filtered);
    } else if (!showAll && faculty.length > 0) {
      const filtered = applyFilters(faculty);
      setFaculty(filtered);
    }
  }, [
    search,
    selectedStatus,
    sortBy,
    sortOrder,
    showAll,
    allFaculty,
    applyFilters,
  ]);

  useEffect(() => {
    if (hasReadPermission) {
      fetchAllFaculty();
    }
  }, [hasReadPermission]);

  // Handle sort change
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Get sort icon
  const getSortIcon = (field) => {
    if (sortBy !== field) {
      return <Icons.ChevronUp className="w-4 h-4 text-gray-400" />;
    }
    return sortOrder === 'asc' ? (
      <Icons.ChevronUp className="w-4 h-4 text-indigo-600" />
    ) : (
      <Icons.ChevronDown className="w-4 h-4 text-indigo-600" />
    );
  };

  // Export faculty to Excel
  const handleExport = () => {
    if (!hasExportPermission) {
      setErrorMessage("You don't have permission to export faculty data");
      return;
    }

    try {
      exportFacultyToExcel(faculty, 'faculty_export');
      setSuccessMessage('Faculty exported successfully!');
    } catch (err) {
      setErrorMessage('Failed to export faculty: ' + err.message);
    }
  };

  // Download import template
  const handleDownloadTemplate = () => {
    if (!hasImportPermission) {
      setErrorMessage(
        "You don't have permission to download the import template"
      );
      return;
    }

    try {
      downloadFacultyTemplate();
      setSuccessMessage('Template downloaded successfully!');
    } catch (err) {
      setErrorMessage('Failed to download template: ' + err.message);
    }
  };

  // Handle file selection for import
  const handleFileSelect = (e) => {
    if (!hasImportPermission) {
      setErrorMessage("You don't have permission to import faculty");
      return;
    }

    const file = e.target.files[0];
    if (file) {
      if (!file.name.match(/\.(xlsx|xls)$/)) {
        setErrorMessage('Please select an Excel file (.xlsx or .xls)');
        return;
      }
      setImportFile(file);
      setImportErrors([]);
    }
  };

  // Import faculty from Excel
  const handleImport = async () => {
    if (!hasImportPermission) {
      setErrorMessage("You don't have permission to import faculty");
      return;
    }

    if (!importFile) {
      setErrorMessage('Please select a file to import');
      return;
    }

    setImporting(true);
    setImportProgress(0);
    setImportErrors([]);

    try {
      const result = await importFacultyFromExcel(importFile, (progress) => {
        setImportProgress(progress * 100);
      });

      if (result.errors.length > 0) {
        setImportErrors(result.errors);
        setErrorMessage(
          `${result.errors.length} errors found. Please check the errors and try again.`
        );
      }

      if (result.faculty.length > 0) {
        let successCount = 0;
        let failCount = 0;

        for (const facultyMember of result.faculty) {
          try {
            const formData = new FormData();
            formData.append('name', facultyMember.name);
            formData.append('email', facultyMember.email);
            formData.append('phone', facultyMember.phone);
            formData.append('address', facultyMember.address || '');
            formData.append('designation', facultyMember.designation || '');
            formData.append('qualification', facultyMember.qualification || '');
            formData.append(
              'specialization',
              facultyMember.specialization || ''
            );
            formData.append(
              'joinedDate',
              facultyMember.joinedDate || new Date().toISOString().split('T')[0]
            );
            formData.append('status', facultyMember.status || 'active');

            const response = await fetch('/api/faculty', {
              method: 'POST',
              body: formData,
            });

            if (response.ok) {
              const data = await response.json();
              successCount++;
              const singleFaculty = await fetchSingleFaculty(data.faculty.id);
              if (singleFaculty) {
                setFaculty([singleFaculty]);
                setShowAll(false);
              }
            } else {
              const errorData = await response.json();
              setImportErrors((prev) => [
                ...prev,
                {
                  row: `Import`,
                  error: `${facultyMember.name}: ${errorData.error}`,
                },
              ]);
              failCount++;
            }
          } catch (err) {
            failCount++;
            setImportErrors((prev) => [
              ...prev,
              {
                row: `Import`,
                error: `${facultyMember.name}: ${err.message}`,
              },
            ]);
          }
        }

        setSuccessMessage(
          `Import completed! ${successCount} faculty added, ${failCount} failed.`
        );

        if (successCount > 0) {
          setShowImportModal(false);
          setImportFile(null);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
          // Refresh to get all faculty
          setTimeout(() => fetchAllFaculty(), 1000);
        }
      }
    } catch (err) {
      setErrorMessage('Failed to import faculty: ' + err.message);
    } finally {
      setImporting(false);
      setImportProgress(0);
    }
  };

  // Create faculty
  const handleCreateFaculty = async (formData) => {
    if (!hasCreatePermission) {
      setErrorMessage("You don't have permission to create faculty");
      return;
    }

    try {
      setFormLoading(true);

      const response = await fetch('/api/faculty', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create faculty');
      }

      const newFaculty = await response.json();

      const singleFaculty = await fetchSingleFaculty(newFaculty.faculty.id);
      if (singleFaculty) {
        setFaculty([singleFaculty]);
        setShowAll(false);
      }

      setSuccessMessage('Faculty created successfully!');
      setIsFormModalOpen(false);
    } catch (err) {
      setErrorMessage(err.message);
      console.error('Error creating faculty:', err);
      throw err;
    } finally {
      setFormLoading(false);
    }
  };

  // Update faculty
  const handleUpdateFaculty = async (formData) => {
    if (!hasUpdatePermission) {
      setErrorMessage("You don't have permission to update faculty");
      return;
    }

    try {
      setFormLoading(true);

      if (!editingFaculty || !editingFaculty.id) {
        throw new Error('No faculty selected for update');
      }

      const response = await fetch(`/api/faculty/${editingFaculty.id}`, {
        method: 'PUT',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update faculty');
      }

      const updatedFaculty = await response.json();

      const singleFaculty = await fetchSingleFaculty(editingFaculty.id);
      if (singleFaculty) {
        setFaculty([singleFaculty]);
        setShowAll(false);
      }

      if (allFaculty.length > 0) {
        const updatedAllFaculty = allFaculty.map((f) =>
          f.id === editingFaculty.id ? singleFaculty : f
        );
        setAllFaculty(updatedAllFaculty);
      }

      setSuccessMessage('Faculty updated successfully!');
      setIsFormModalOpen(false);
      setEditingFaculty(null);

      if (selectedFaculty?.id === editingFaculty.id) {
        setIsModalOpen(false);
        setSelectedFaculty(null);
      }
    } catch (err) {
      setErrorMessage(err.message);
      console.error('Error updating faculty:', err);
      throw err;
    } finally {
      setFormLoading(false);
    }
  };

  // Delete faculty
  const handleDeleteFaculty = async (facultyId) => {
    if (!hasDeletePermission) {
      setErrorMessage("You don't have permission to delete faculty");
      return;
    }

    try {
      setDeleting(true);
      const response = await fetch(`/api/faculty/${facultyId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete faculty');
      }

      if (allFaculty.length > 0) {
        const updatedAllFaculty = allFaculty.filter((f) => f.id !== facultyId);
        setAllFaculty(updatedAllFaculty);

        if (showAll) {
          setFaculty(updatedAllFaculty);
        } else {
          setFaculty([]);
          setShowAll(false);
        }
      } else {
        setFaculty([]);
        setShowAll(false);
      }

      setSuccessMessage('Faculty deleted successfully!');
      setShowDeleteConfirm(false);
      setFacultyToDelete(null);
      setSelectedFacultyIds((prev) => prev.filter((id) => id !== facultyId));

      if (selectedFaculty?.id === facultyId) {
        setIsModalOpen(false);
        setSelectedFaculty(null);
      }
    } catch (err) {
      setErrorMessage(err.message);
      console.error('Error deleting faculty:', err);
    } finally {
      setDeleting(false);
    }
  };

  // Bulk delete faculty
  const handleBulkDelete = async () => {
    if (!hasDeletePermission) {
      setErrorMessage("You don't have permission to delete faculty");
      return;
    }

    if (selectedFacultyIds.length === 0) {
      setErrorMessage('No faculty selected for deletion');
      return;
    }

    try {
      setDeleting(true);
      const response = await fetch('/api/faculty/bulk-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ facultyIds: selectedFacultyIds }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete faculty');
      }

      const data = await response.json();

      if (allFaculty.length > 0) {
        const updatedAllFaculty = allFaculty.filter(
          (f) => !selectedFacultyIds.includes(f.id)
        );
        setAllFaculty(updatedAllFaculty);

        if (showAll) {
          setFaculty(updatedAllFaculty);
        }
      }

      setSelectedFacultyIds([]);
      setSuccessMessage(
        `Successfully deleted ${data.deletedCount} faculty member(s)`
      );
      setShowBulkDeleteConfirm(false);
    } catch (err) {
      setErrorMessage(err.message);
      console.error('Error bulk deleting faculty:', err);
    } finally {
      setDeleting(false);
    }
  };

  // Toggle faculty selection
  const toggleFacultySelection = (facultyId) => {
    setSelectedFacultyIds((prev) =>
      prev.includes(facultyId)
        ? prev.filter((id) => id !== facultyId)
        : [...prev, facultyId]
    );
  };

  // Toggle select all
  const toggleSelectAll = () => {
    if (selectedFacultyIds.length === faculty.length) {
      setSelectedFacultyIds([]);
    } else {
      setSelectedFacultyIds(faculty.map((f) => f.id));
    }
  };

  // Get status badge styling
  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { color: 'bg-green-100 text-green-800', icon: Icons.CheckCircle },
      inactive: { color: 'bg-red-100 text-red-800', icon: Icons.XCircle },
      on_leave: { color: 'bg-yellow-100 text-yellow-800', icon: Icons.Clock },
      retired: { color: 'bg-gray-100 text-gray-800', icon: Icons.UserCheck },
    };

    const config = statusConfig[status] || statusConfig.active;
    const Icon = config.icon;

    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}
      >
        <Icon size={12} />
        {status.replace('_', ' ').charAt(0).toUpperCase() +
          status.replace('_', ' ').slice(1)}
      </span>
    );
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  };

  // Faculty Detail Modal Component
  const FacultyDetailModal = ({ faculty, onClose }) => (
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
        className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">Faculty Details</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <Icons.X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex items-center gap-6">
            <div className="relative">
              {faculty.profilePicture ? (
                <img
                  src={faculty.profilePicture}
                  alt={faculty.name}
                  className="w-24 h-24 rounded-full object-cover border-4 border-indigo-200"
                />
              ) : (
                <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                  <Icons.User size={48} className="text-white" />
                </div>
              )}
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-800">
                {faculty.name}
              </h3>
              <p className="text-gray-500">{faculty.email}</p>
              <p className="text-gray-500">Phone: {faculty.phone || '-'}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500">Faculty ID</label>
              <p className="text-sm font-medium text-gray-800">{faculty.id}</p>
            </div>
            <div>
              <label className="text-xs text-gray-500">Status</label>
              <p className="text-sm">{getStatusBadge(faculty.status)}</p>
            </div>
            <div>
              <label className="text-xs text-gray-500">Designation</label>
              <p className="text-sm text-gray-800">
                {faculty.designation || '-'}
              </p>
            </div>
            <div>
              <label className="text-xs text-gray-500">Qualification</label>
              <p className="text-sm text-gray-800">
                {faculty.qualification || '-'}
              </p>
            </div>
            <div>
              <label className="text-xs text-gray-500">Specialization</label>
              <p className="text-sm text-gray-800">
                {faculty.specialization || '-'}
              </p>
            </div>
            <div>
              <label className="text-xs text-gray-500">Joined Date</label>
              <p className="text-sm text-gray-800">
                {formatDate(faculty.joinedDate)}
              </p>
            </div>
          </div>

          {faculty.address && (
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">Address</h4>
              <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                {faculty.address}
              </p>
            </div>
          )}

          {faculty.cv && (
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">CV / Resume</h4>
              <a
                href={faculty.cv}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
              >
                <Icons.FileText size={18} />
                View CV
              </a>
            </div>
          )}

          <div className="pt-4 border-t flex gap-3">
            {hasUpdatePermission && (
              <button
                onClick={() => {
                  onClose();
                  setEditingFaculty(faculty);
                  setIsFormModalOpen(true);
                }}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2"
              >
                <Icons.Edit size={18} /> Edit Faculty
              </button>
            )}
            {hasDeletePermission && (
              <button
                onClick={() => {
                  onClose();
                  setFacultyToDelete(faculty);
                  setShowDeleteConfirm(true);
                }}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center gap-2"
              >
                <Icons.Trash2 size={18} /> Delete Faculty
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );

  // Loading state
  if (permissionsLoading || (loading && faculty.length === 0 && showAll)) {
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

  // Access denied state
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
            You don't have permission to view faculty.
          </p>
          <p className="text-red-500 text-sm mt-2">
            Required permission: faculty:read
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

      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Faculty Management
          </h1>
          <p className="text-gray-500 mt-1">
            Manage and organize faculty members
          </p>
          {!showAll && faculty.length === 1 && (
            <p className="text-sm text-indigo-600 mt-1">
              Showing newly{' '}
              {faculty[0]?.createdAt && !faculty[0]?.updatedAt
                ? 'created'
                : 'updated'}{' '}
              faculty member. Click Refresh to see all faculty.
            </p>
          )}
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchAllFaculty}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
          >
            <Icons.RefreshCw
              size={18}
              className={loading ? 'animate-spin' : ''}
            />
            Refresh
          </button>
          {hasImportPermission && (
            <>
              <button
                onClick={handleDownloadTemplate}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Icons.Download size={18} /> Template
              </button>
              <button
                onClick={() => setShowImportModal(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <Icons.Upload size={18} /> Import
              </button>
            </>
          )}
          {hasExportPermission && (
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
            >
              <Icons.FileSpreadsheet size={18} /> Export
            </button>
          )}
          {hasCreatePermission && (
            <button
              onClick={() => {
                setEditingFaculty(null);
                setIsFormModalOpen(true);
              }}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
            >
              <Icons.UserPlus size={18} /> Add Faculty
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
                placeholder="Search by name, email, phone, or designation..."
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
            <option value="on_leave">On Leave</option>
            <option value="retired">Retired</option>
          </select>

          {hasDeletePermission && selectedFacultyIds.length > 0 && (
            <button
              onClick={() => setShowBulkDeleteConfirm(true)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
            >
              <Icons.Trash2 size={18} />
              Delete Selected ({selectedFacultyIds.length})
            </button>
          )}
        </div>
      </div>

      {/* Faculty Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left py-3 px-4 w-10">
                  {hasDeletePermission && faculty.length > 0 && (
                    <input
                      type="checkbox"
                      checked={
                        selectedFacultyIds.length === faculty.length &&
                        faculty.length > 0
                      }
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  )}
                </th>
                <th
                  className="text-left py-3 px-4 text-sm font-semibold text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-2">
                    Faculty
                    {getSortIcon('name')}
                  </div>
                </th>
                <th
                  className="text-left py-3 px-4 text-sm font-semibold text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('designation')}
                >
                  <div className="flex items-center gap-2">
                    Designation
                    {getSortIcon('designation')}
                  </div>
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                  Qualification
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                  Contact
                </th>
                <th
                  className="text-left py-3 px-4 text-sm font-semibold text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center gap-2">
                    Status
                    {getSortIcon('status')}
                  </div>
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {faculty.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-12">
                    <div className="text-gray-500">
                      <Icons.Users
                        size={48}
                        className="mx-auto mb-4 text-gray-300"
                      />
                      <p>No faculty found</p>
                      <p className="text-sm mt-2">
                        {search || selectedStatus !== 'all'
                          ? 'Try adjusting your filters'
                          : 'Click Refresh to load faculty'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                faculty.map((member, index) => (
                  <motion.tr
                    key={member.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-b hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-3 px-4">
                      {hasDeletePermission && (
                        <input
                          type="checkbox"
                          checked={selectedFacultyIds.includes(member.id)}
                          onChange={() => toggleFacultySelection(member.id)}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {member.profilePicture ? (
                          <img
                            src={member.profilePicture}
                            alt={member.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                            <Icons.User size={18} className="text-indigo-600" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-800">
                            {member.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {member.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-sm text-gray-800">
                        {member.designation || '-'}
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-sm text-gray-800">
                        {member.qualification || '-'}
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-sm text-gray-800">
                        {member.phone || '-'}
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      {getStatusBadge(member.status)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedFaculty(member);
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
                              setEditingFaculty(member);
                              setIsFormModalOpen(true);
                            }}
                            className="p-2 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Edit Faculty"
                          >
                            <Icons.Edit size={18} className="text-indigo-500" />
                          </button>
                        )}
                        {hasDeletePermission && (
                          <button
                            onClick={() => {
                              setFacultyToDelete(member);
                              setShowDeleteConfirm(true);
                            }}
                            className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Faculty"
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
      </div>

      {/* Import Modal */}
      <AnimatePresence>
        {showImportModal && hasImportPermission && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowImportModal(false)}
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
                  Import Faculty from Excel
                </h2>
                <button
                  onClick={() => setShowImportModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <Icons.X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Icons.Info size={20} className="text-blue-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-blue-800 font-medium mb-2">
                        Import Instructions:
                      </p>
                      <ul className="text-sm text-blue-700 space-y-1">
                        <li>
                          • Download the template using the "Template" button
                        </li>
                        <li>• Fill in the faculty data in the Excel file</li>
                        <li>• Required fields: Full Name, Email, Phone</li>
                        <li>• Phone numbers must be 10 digits</li>
                        <li>
                          • Status can be: active, inactive, on_leave, retired
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Excel File
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileSelect}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {importFile && (
                    <p className="mt-2 text-sm text-green-600">
                      Selected: {importFile.name}
                    </p>
                  )}
                </div>

                {importing && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Import Progress
                    </label>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${importProgress}%` }}
                      />
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                      {Math.round(importProgress)}% complete
                    </p>
                  </div>
                )}

                {importErrors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-h-60 overflow-y-auto">
                    <p className="text-sm font-medium text-red-800 mb-2">
                      Errors Found ({importErrors.length}):
                    </p>
                    <div className="space-y-1">
                      {importErrors.map((error, index) => (
                        <p key={index} className="text-sm text-red-700">
                          Row {error.row}: {error.error}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t flex gap-3">
                  <button
                    onClick={() => setShowImportModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    disabled={importing}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={!importFile || importing}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {importing ? (
                      <>
                        <Icons.Loader2 size={18} className="animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Icons.Upload size={18} />
                        Import Faculty
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Faculty Form Modal */}
      <FacultyFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingFaculty(null);
        }}
        onSubmit={editingFaculty ? handleUpdateFaculty : handleCreateFaculty}
        initialData={editingFaculty}
        loading={formLoading}
      />

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && facultyToDelete && (
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
                Delete Faculty
              </h3>
              <p className="text-gray-600 text-center mb-4">
                Are you sure you want to delete{' '}
                <strong>{facultyToDelete.name}</strong>? This action cannot be
                undone. This will also delete the associated user account.
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
                  onClick={() => handleDeleteFaculty(facultyToDelete.id)}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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

      {/* Bulk Delete Confirmation Modal */}
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
                Bulk Delete Faculty
              </h3>
              <p className="text-gray-600 text-center mb-4">
                Are you sure you want to delete{' '}
                <strong>{selectedFacultyIds.length}</strong> faculty member(s)?
                This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowBulkDeleteConfirm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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

      {/* Faculty Detail Modal */}
      <AnimatePresence>
        {isModalOpen && selectedFaculty && (
          <FacultyDetailModal
            faculty={selectedFaculty}
            onClose={() => {
              setIsModalOpen(false);
              setSelectedFaculty(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
