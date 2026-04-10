// app/students/page.jsx - Rewritten to match Users page structure
'use client';

import { useRef } from 'react';
import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';
import StudentFormModal from '@/components/student/StudentFormModal';
import { usePermissions } from '@/hooks/usePermissions';
import {
  exportToExcel,
  importFromExcel,
  downloadTemplate,
} from '@/lib/excelUtils';

export default function StudentsPage() {
  const { data: session } = useSession();
  const { can, isLoading: permissionsLoading } = usePermissions();

  const [students, setStudents] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [showAll, setShowAll] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedBatch, setSelectedBatch] = useState('all');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [batches, setBatches] = useState([]);

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
  const hasReadPermission = can('students', 'read');
  const hasCreatePermission = can('students', 'create');
  const hasUpdatePermission = can('students', 'update');
  const hasDeletePermission = can('students', 'delete');
  const hasExportPermission = can('students', 'export') || hasReadPermission;
  const hasImportPermission = can('students', 'import') || hasCreatePermission;

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

  // Fetch batches for filter
  const fetchBatches = async () => {
    try {
      const response = await fetch('/api/batches?limit=1000');
      if (response.ok) {
        const data = await response.json();
        setBatches(data.batches || []);
      }
    } catch (error) {
      console.error('Error fetching batches:', error);
    }
  };

  const fetchAllStudents = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: 1,
        limit: 100,
        ...(search && { search }),
        ...(selectedStatus !== 'all' && { status: selectedStatus }),
        ...(selectedBatch !== 'all' && { batchId: selectedBatch }),
        sortBy,
        sortOrder,
      });

      const response = await fetch(`/api/students?${params}`);

      // Enhanced error handling
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error ||
            `Failed to fetch students: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      const sortedStudents = [...data.students].sort((a, b) =>
        a.user?.name?.localeCompare(b.user?.name)
      );
      setAllStudents(sortedStudents);
      setStudents(sortedStudents);
      setShowAll(true);
    } catch (err) {
      console.error('Error fetching students:', err);
      setErrorMessage(`Failed to load students: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  // Fetch single student
  const fetchSingleStudent = async (studentId) => {
    try {
      const response = await fetch(`/api/students/${studentId}`);
      if (!response.ok) throw new Error('Failed to fetch student');
      const data = await response.json();
      return data.student;
    } catch (err) {
      console.error('Error fetching student:', err);
      return null;
    }
  };

  // Apply filters
  const applyFilters = useCallback(
    (studentsList) => {
      let filtered = [...studentsList];

      if (search) {
        const searchLower = search.toLowerCase();
        filtered = filtered.filter(
          (student) =>
            student.user?.name?.toLowerCase().includes(searchLower) ||
            student.user?.email?.toLowerCase().includes(searchLower) ||
            student.phone?.toLowerCase().includes(searchLower) ||
            student.rollNumber?.toLowerCase().includes(searchLower)
        );
      }

      if (selectedStatus !== 'all') {
        filtered = filtered.filter(
          (student) => student.status === selectedStatus
        );
      }

      if (selectedBatch !== 'all') {
        filtered = filtered.filter(
          (student) => student.batchId === parseInt(selectedBatch)
        );
      }

      // Apply sorting
      filtered.sort((a, b) => {
        let aVal, bVal;
        if (sortBy === 'name') {
          aVal = a.user?.name || '';
          bVal = b.user?.name || '';
        } else if (sortBy === 'rollNumber') {
          aVal = a.rollNumber || '';
          bVal = b.rollNumber || '';
        } else if (sortBy === 'status') {
          aVal = a.status || '';
          bVal = b.status || '';
        } else {
          aVal = a.user?.name || '';
          bVal = b.user?.name || '';
        }

        if (sortOrder === 'asc') {
          return aVal.localeCompare(bVal);
        } else {
          return bVal.localeCompare(aVal);
        }
      });

      return filtered;
    },
    [search, selectedStatus, selectedBatch, sortBy, sortOrder]
  );

  useEffect(() => {
    if (showAll && allStudents.length > 0) {
      const filtered = applyFilters(allStudents);
      setStudents(filtered);
    } else if (!showAll && students.length > 0) {
      const filtered = applyFilters(students);
      setStudents(filtered);
    }
  }, [
    search,
    selectedStatus,
    selectedBatch,
    sortBy,
    sortOrder,
    showAll,
    allStudents,
    applyFilters,
  ]);

  useEffect(() => {
    if (hasReadPermission) {
      fetchBatches();
      fetchAllStudents();
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

  // Export students to Excel
  const handleExport = () => {
    if (!hasExportPermission) {
      setErrorMessage("You don't have permission to export student data");
      return;
    }

    try {
      exportToExcel(students, 'students_export');
      setSuccessMessage('Students exported successfully!');
    } catch (err) {
      setErrorMessage('Failed to export students: ' + err.message);
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
      downloadTemplate();
      setSuccessMessage('Template downloaded successfully!');
    } catch (err) {
      setErrorMessage('Failed to download template: ' + err.message);
    }
  };

  // Handle file selection for import
  const handleFileSelect = (e) => {
    if (!hasImportPermission) {
      setErrorMessage("You don't have permission to import students");
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

  // Import students from Excel
  const handleImport = async () => {
    if (!hasImportPermission) {
      setErrorMessage("You don't have permission to import students");
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
      const result = await importFromExcel(importFile, batches, (progress) => {
        setImportProgress(progress * 100);
      });

      if (result.errors.length > 0) {
        setImportErrors(result.errors);
        setErrorMessage(
          `${result.errors.length} errors found. Please check the errors and try again.`
        );
      }

      if (result.students.length > 0) {
        let successCount = 0;
        let failCount = 0;

        for (const student of result.students) {
          try {
            const formData = new FormData();
            formData.append('name', student.name);
            formData.append('email', student.email);
            formData.append('phone', student.phone);
            formData.append('address', student.address);
            formData.append('rollNumber', student.rollNumber || '');
            formData.append(
              'registrationNumber',
              student.registrationNumber || ''
            );
            formData.append('examRollNumber', student.examRollNumber || '');
            formData.append(
              'enrollmentDate',
              student.enrollmentDate || new Date().toISOString().split('T')[0]
            );
            formData.append('dateOfBirth', student.dateOfBirth || '');
            formData.append('bloodGroup', student.bloodGroup || '');
            formData.append('guardianName', student.guardianName || '');
            formData.append('guardianContact', student.guardianContact || '');
            formData.append('guardianEmail', student.guardianEmail || '');
            formData.append('emergencyContact', student.emergencyContact || '');
            formData.append('batchId', student.batchId || '');
            formData.append('status', student.status);

            const response = await fetch('/api/students', {
              method: 'POST',
              body: formData,
            });

            if (response.ok) {
              const data = await response.json();
              successCount++;
              const singleStudent = await fetchSingleStudent(data.student.id);
              if (singleStudent) {
                setStudents([singleStudent]);
                setShowAll(false);
              }
            } else {
              const errorData = await response.json();
              setImportErrors((prev) => [
                ...prev,
                {
                  row: `Import`,
                  error: `${student.name}: ${errorData.error}`,
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
                error: `${student.name}: ${err.message}`,
              },
            ]);
          }
        }

        setSuccessMessage(
          `Import completed! ${successCount} students added, ${failCount} failed.`
        );

        if (successCount > 0) {
          setShowImportModal(false);
          setImportFile(null);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
          // Refresh to get all students
          setTimeout(() => fetchAllStudents(), 1000);
        }
      }
    } catch (err) {
      setErrorMessage('Failed to import students: ' + err.message);
    } finally {
      setImporting(false);
      setImportProgress(0);
    }
  };

  // Create student
  const handleCreateStudent = async (formData) => {
    if (!hasCreatePermission) {
      setErrorMessage("You don't have permission to create students");
      return;
    }

    try {
      setFormLoading(true);

      const response = await fetch('/api/students', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create student');
      }

      const newStudent = await response.json();

      const singleStudent = await fetchSingleStudent(newStudent.student.id);
      if (singleStudent) {
        setStudents([singleStudent]);
        setShowAll(false);
      }

      setSuccessMessage('Student created successfully!');
      setIsFormModalOpen(false);
    } catch (err) {
      setErrorMessage(err.message);
      console.error('Error creating student:', err);
      throw err;
    } finally {
      setFormLoading(false);
    }
  };

  // Update student
  const handleUpdateStudent = async (formData) => {
    if (!hasUpdatePermission) {
      setErrorMessage("You don't have permission to update students");
      return;
    }

    try {
      setFormLoading(true);

      if (!editingStudent || !editingStudent.id) {
        throw new Error('No student selected for update');
      }

      const response = await fetch(`/api/students/${editingStudent.id}`, {
        method: 'PUT',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update student');
      }

      const updatedStudent = await response.json();

      const singleStudent = await fetchSingleStudent(editingStudent.id);
      if (singleStudent) {
        setStudents([singleStudent]);
        setShowAll(false);
      }

      if (allStudents.length > 0) {
        const updatedAllStudents = allStudents.map((s) =>
          s.id === editingStudent.id ? singleStudent : s
        );
        setAllStudents(updatedAllStudents);
      }

      setSuccessMessage('Student updated successfully!');
      setIsFormModalOpen(false);
      setEditingStudent(null);

      if (selectedStudent?.id === editingStudent.id) {
        setIsModalOpen(false);
        setSelectedStudent(null);
      }
    } catch (err) {
      setErrorMessage(err.message);
      console.error('Error updating student:', err);
      throw err;
    } finally {
      setFormLoading(false);
    }
  };

  // Delete student
  const handleDeleteStudent = async (studentId) => {
    if (!hasDeletePermission) {
      setErrorMessage("You don't have permission to delete students");
      return;
    }

    try {
      setDeleting(true);
      const response = await fetch(`/api/students/${studentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete student');
      }

      if (allStudents.length > 0) {
        const updatedAllStudents = allStudents.filter(
          (s) => s.id !== studentId
        );
        setAllStudents(updatedAllStudents);

        if (showAll) {
          setStudents(updatedAllStudents);
        } else {
          setStudents([]);
          setShowAll(false);
        }
      } else {
        setStudents([]);
        setShowAll(false);
      }

      setSuccessMessage('Student deleted successfully!');
      setShowDeleteConfirm(false);
      setStudentToDelete(null);
      setSelectedStudents((prev) => prev.filter((id) => id !== studentId));

      if (selectedStudent?.id === studentId) {
        setIsModalOpen(false);
        setSelectedStudent(null);
      }
    } catch (err) {
      setErrorMessage(err.message);
      console.error('Error deleting student:', err);
    } finally {
      setDeleting(false);
    }
  };

  // Bulk delete students
  const handleBulkDelete = async () => {
    if (!hasDeletePermission) {
      setErrorMessage("You don't have permission to delete students");
      return;
    }

    if (selectedStudents.length === 0) {
      setErrorMessage('No students selected for deletion');
      return;
    }

    try {
      setDeleting(true);
      const response = await fetch('/api/students/bulk-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ studentIds: selectedStudents }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete students');
      }

      const data = await response.json();

      if (allStudents.length > 0) {
        const updatedAllStudents = allStudents.filter(
          (s) => !selectedStudents.includes(s.id)
        );
        setAllStudents(updatedAllStudents);

        if (showAll) {
          setStudents(updatedAllStudents);
        }
      }

      setSelectedStudents([]);
      setSuccessMessage(`Successfully deleted ${data.deletedCount} student(s)`);
      setShowBulkDeleteConfirm(false);
    } catch (err) {
      setErrorMessage(err.message);
      console.error('Error bulk deleting students:', err);
    } finally {
      setDeleting(false);
    }
  };

  // Toggle student selection
  const toggleStudentSelection = (studentId) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  // Toggle select all
  const toggleSelectAll = () => {
    if (selectedStudents.length === students.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(students.map((s) => s.id));
    }
  };

  // Get status badge styling
  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { color: 'bg-green-100 text-green-800', icon: Icons.CheckCircle },
      inactive: { color: 'bg-red-100 text-red-800', icon: Icons.XCircle },
      graduated: {
        color: 'bg-blue-100 text-blue-800',
        icon: Icons.GraduationCap,
      },
      transferred: {
        color: 'bg-yellow-100 text-yellow-800',
        icon: Icons.ArrowRight,
      },
      suspended: {
        color: 'bg-orange-100 text-orange-800',
        icon: Icons.AlertTriangle,
      },
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

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  };

  // Student Detail Modal Component
  const StudentDetailModal = ({ student, onClose }) => (
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
          <h2 className="text-xl font-bold text-gray-800">Student Details</h2>
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
              {student.photo ? (
                <img
                  src={student.photo}
                  alt={student.user?.name}
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
                {student.user?.name}
              </h3>
              <p className="text-gray-500">{student.user?.email}</p>
              <p className="text-gray-500">Phone: {student.phone || '-'}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500">Student ID</label>
              <p className="text-sm font-medium text-gray-800">{student.id}</p>
            </div>
            <div>
              <label className="text-xs text-gray-500">Status</label>
              <p className="text-sm">{getStatusBadge(student.status)}</p>
            </div>
            <div>
              <label className="text-xs text-gray-500">Roll Number</label>
              <p className="text-sm text-gray-800">
                {student.rollNumber || '-'}
              </p>
            </div>
            <div>
              <label className="text-xs text-gray-500">
                Registration Number
              </label>
              <p className="text-sm text-gray-800">
                {student.registrationNumber || '-'}
              </p>
            </div>
            <div>
              <label className="text-xs text-gray-500">Exam Roll Number</label>
              <p className="text-sm text-gray-800">
                {student.examRollNumber || '-'}
              </p>
            </div>
            <div>
              <label className="text-xs text-gray-500">Batch</label>
              <p className="text-sm font-medium text-gray-800">
                {student.batch?.name || 'Not Assigned'}
              </p>
              {student.batch?.department && (
                <p className="text-xs text-gray-500">
                  Department: {student.batch.department.name}
                </p>
              )}
            </div>
            <div>
              <label className="text-xs text-gray-500">Enrollment Date</label>
              <p className="text-sm text-gray-800">
                {formatDate(student.enrollmentDate)}
              </p>
            </div>
            <div>
              <label className="text-xs text-gray-500">Date of Birth</label>
              <p className="text-sm text-gray-800">
                {formatDate(student.dateOfBirth)}
              </p>
            </div>
            <div>
              <label className="text-xs text-gray-500">Blood Group</label>
              <p className="text-sm text-gray-800">
                {student.bloodGroup || '-'}
              </p>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-gray-800 mb-3">
              Guardian Information
            </h4>
            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
              <div>
                <label className="text-xs text-gray-500">Guardian Name</label>
                <p className="text-sm text-gray-800">
                  {student.guardianName || '-'}
                </p>
              </div>
              <div>
                <label className="text-xs text-gray-500">
                  Guardian Contact
                </label>
                <p className="text-sm text-gray-800">
                  {student.guardianContact || '-'}
                </p>
              </div>
              <div>
                <label className="text-xs text-gray-500">Guardian Email</label>
                <p className="text-sm text-gray-800">
                  {student.guardianEmail || '-'}
                </p>
              </div>
              <div>
                <label className="text-xs text-gray-500">
                  Emergency Contact
                </label>
                <p className="text-sm text-gray-800">
                  {student.emergencyContact || '-'}
                </p>
              </div>
            </div>
          </div>

          {student.address && (
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">Address</h4>
              <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                {student.address}
              </p>
            </div>
          )}

          <div className="pt-4 border-t flex gap-3">
            {hasUpdatePermission && (
              <button
                onClick={() => {
                  onClose();
                  setEditingStudent(student);
                  setIsFormModalOpen(true);
                }}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2"
              >
                <Icons.Edit size={18} /> Edit Student
              </button>
            )}
            {hasDeletePermission && (
              <button
                onClick={() => {
                  onClose();
                  setStudentToDelete(student);
                  setShowDeleteConfirm(true);
                }}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center gap-2"
              >
                <Icons.Trash2 size={18} /> Delete Student
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );

  // Loading state
  if (permissionsLoading || (loading && students.length === 0 && showAll)) {
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
            You don't have permission to view students.
          </p>
          <p className="text-red-500 text-sm mt-2">
            Required permission: students:read
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
            Student Management
          </h1>
          <p className="text-gray-500 mt-1">
            Manage and organize student records
          </p>
          {!showAll && students.length === 1 && (
            <p className="text-sm text-indigo-600 mt-1">
              Showing newly{' '}
              {students[0]?.createdAt && !students[0]?.updatedAt
                ? 'created'
                : 'updated'}{' '}
              student. Click Refresh to see all students.
            </p>
          )}
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchAllStudents}
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
                setEditingStudent(null);
                setIsFormModalOpen(true);
              }}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
            >
              <Icons.UserPlus size={18} /> Add Student
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
                placeholder="Search by name, email, roll number, or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <select
            value={selectedBatch}
            onChange={(e) => setSelectedBatch(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Batches</option>
            {batches.map((batch) => (
              <option key={batch.id} value={batch.id}>
                {batch.name} ({batch.academicYear})
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
            <option value="graduated">Graduated</option>
            <option value="transferred">Transferred</option>
            <option value="suspended">Suspended</option>
          </select>

          {hasDeletePermission && selectedStudents.length > 0 && (
            <button
              onClick={() => setShowBulkDeleteConfirm(true)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
            >
              <Icons.Trash2 size={18} />
              Delete Selected ({selectedStudents.length})
            </button>
          )}
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left py-3 px-4 w-10">
                  {hasDeletePermission && students.length > 0 && (
                    <input
                      type="checkbox"
                      checked={
                        selectedStudents.length === students.length &&
                        students.length > 0
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
                    Student
                    {getSortIcon('name')}
                  </div>
                </th>
                <th
                  className="text-left py-3 px-4 text-sm font-semibold text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('rollNumber')}
                >
                  <div className="flex items-center gap-2">
                    Roll Number
                    {getSortIcon('rollNumber')}
                  </div>
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                  Batch
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                  Department
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
              {students.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-12">
                    <div className="text-gray-500">
                      <Icons.Users
                        size={48}
                        className="mx-auto mb-4 text-gray-300"
                      />
                      <p>No students found</p>
                      <p className="text-sm mt-2">
                        {search ||
                        selectedStatus !== 'all' ||
                        selectedBatch !== 'all'
                          ? 'Try adjusting your filters'
                          : 'Click Refresh to load students'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                students.map((student, index) => (
                  <motion.tr
                    key={student.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-b hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-3 px-4">
                      {hasDeletePermission && (
                        <input
                          type="checkbox"
                          checked={selectedStudents.includes(student.id)}
                          onChange={() => toggleStudentSelection(student.id)}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {student.photo ? (
                          <img
                            src={student.photo}
                            alt={student.user?.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                            <Icons.User size={18} className="text-indigo-600" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-800">
                            {student.user?.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {student.user?.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-sm text-gray-800">
                        {student.rollNumber || '-'}
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-sm text-gray-800">
                        {student.batch?.name || '-'}
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-sm text-gray-800">
                        {student.batch?.department?.name || '-'}
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-sm text-gray-800">
                        {student.phone || '-'}
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      {getStatusBadge(student.status)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedStudent(student);
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
                              setEditingStudent(student);
                              setIsFormModalOpen(true);
                            }}
                            className="p-2 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Edit Student"
                          >
                            <Icons.Edit size={18} className="text-indigo-500" />
                          </button>
                        )}
                        {hasDeletePermission && (
                          <button
                            onClick={() => {
                              setStudentToDelete(student);
                              setShowDeleteConfirm(true);
                            }}
                            className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Student"
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
                  Import Students from Excel
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
                        <li>• Fill in the student data in the Excel file</li>
                        <li>• Required fields: Full Name, Email, Phone</li>
                        <li>
                          • Batch names must match existing batches in the
                          system
                        </li>
                        <li>• Phone numbers must be 10 digits</li>
                        <li>
                          • Status can be: active, inactive, graduated,
                          transferred, suspended
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
                        Import Students
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Student Form Modal */}
      <StudentFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingStudent(null);
        }}
        onSubmit={editingStudent ? handleUpdateStudent : handleCreateStudent}
        initialData={editingStudent}
        loading={formLoading}
      />

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && studentToDelete && (
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
                Delete Student
              </h3>
              <p className="text-gray-600 text-center mb-4">
                Are you sure you want to delete{' '}
                <strong>{studentToDelete.user?.name}</strong>? This action
                cannot be undone. This will also delete the associated user
                account.
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
                  onClick={() => handleDeleteStudent(studentToDelete.id)}
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
                Bulk Delete Students
              </h3>
              <p className="text-gray-600 text-center mb-4">
                Are you sure you want to delete{' '}
                <strong>{selectedStudents.length}</strong> student(s)? This
                action cannot be undone.
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

      {/* Student Detail Modal */}
      <AnimatePresence>
        {isModalOpen && selectedStudent && (
          <StudentDetailModal
            student={selectedStudent}
            onClose={() => {
              setIsModalOpen(false);
              setSelectedStudent(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
