// app/courses/page.jsx
'use client';

import { useRef } from 'react';
import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';
import CourseFormModal from '@/components/course/CourseFormModal';
import { usePermissions } from '@/hooks/usePermissions';
import {
  exportCoursesToExcel,
  importCoursesFromExcel,
  downloadCourseTemplate,
} from '@/lib/excelUtilsCourses';

export default function CoursesPage() {
  const { data: session } = useSession();
  const { can, isLoading: permissionsLoading } = usePermissions();

  const [courses, setCourses] = useState([]);
  const [allCourses, setAllCourses] = useState([]);
  const [showAll, setShowAll] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedSemester, setSelectedSemester] = useState('all');
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [selectedCourseIds, setSelectedCourseIds] = useState([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [departments, setDepartments] = useState([]);

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

  // Ref to track initial load
  const initialLoadDone = useRef(false);

  // Permission checks using usePermissions hook
  const hasReadPermission = can('courses', 'read');
  const hasCreatePermission = can('courses', 'create');
  const hasUpdatePermission = can('courses', 'update');
  const hasDeletePermission = can('courses', 'delete');
  const hasExportPermission = can('courses', 'export') || hasReadPermission;
  const hasImportPermission = can('courses', 'import') || hasCreatePermission;

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

  // Fetch departments for filter
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

  // Fetch all courses
  const fetchAllCourses = useCallback(
    async (showToastMessage = false) => {
      if (!hasReadPermission) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const params = new URLSearchParams({
          page: 1,
          limit: 100,
          ...(search && { search }),
          ...(selectedDepartment !== 'all' && {
            departmentId: selectedDepartment,
          }),
          ...(selectedType !== 'all' && { type: selectedType }),
          ...(selectedSemester !== 'all' && { semester: selectedSemester }),
          sortBy,
          sortOrder,
        });

        const response = await fetch(`/api/courses?${params}`);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error ||
              `Failed to fetch courses: ${response.status} ${response.statusText}`
          );
        }

        const data = await response.json();
        const sortedCourses = [...(data.courses || [])].sort((a, b) =>
          a.name?.localeCompare(b.name)
        );
        setAllCourses(sortedCourses);
        setCourses(sortedCourses);
        setShowAll(true);

        if (showToastMessage) {
          setSuccessMessage('Courses refreshed successfully!');
        }
      } catch (err) {
        console.error('Error fetching courses:', err);
        setErrorMessage(`Failed to load courses: ${err.message}`);
      } finally {
        setLoading(false);
      }
    },
    [
      hasReadPermission,
      search,
      selectedDepartment,
      selectedType,
      selectedSemester,
      sortBy,
      sortOrder,
    ]
  );

  // Fetch single course
  const fetchSingleCourse = async (courseId) => {
    try {
      const response = await fetch(`/api/courses/${courseId}`);
      if (!response.ok) throw new Error('Failed to fetch course');
      const data = await response.json();
      return data.course;
    } catch (err) {
      console.error('Error fetching course:', err);
      return null;
    }
  };

  // Initial load
  useEffect(() => {
    if (hasReadPermission && !initialLoadDone.current) {
      initialLoadDone.current = true;
      fetchDepartments();
      fetchAllCourses();
    }
  }, [hasReadPermission, fetchAllCourses]);

  // Refetch when filters change
  useEffect(() => {
    if (initialLoadDone.current && hasReadPermission) {
      fetchAllCourses();
    }
  }, [
    search,
    selectedDepartment,
    selectedType,
    selectedSemester,
    sortBy,
    sortOrder,
    hasReadPermission,
    fetchAllCourses,
  ]);

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

  // Clear all filters
  const handleClearFilters = () => {
    setSearch('');
    setSelectedDepartment('all');
    setSelectedType('all');
    setSelectedSemester('all');
    setSuccessMessage('Filters cleared');
  };

  // Export courses to Excel
  const handleExport = () => {
    if (!hasExportPermission) {
      setErrorMessage("You don't have permission to export course data");
      return;
    }

    try {
      exportCoursesToExcel(courses, 'courses_export');
      setSuccessMessage('Courses exported successfully!');
    } catch (err) {
      setErrorMessage('Failed to export courses: ' + err.message);
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
      downloadCourseTemplate();
      setSuccessMessage('Template downloaded successfully!');
    } catch (err) {
      setErrorMessage('Failed to download template: ' + err.message);
    }
  };

  // Handle file selection for import
  const handleFileSelect = (e) => {
    if (!hasImportPermission) {
      setErrorMessage("You don't have permission to import courses");
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

  // Import courses from Excel
  const handleImport = async () => {
    if (!hasImportPermission) {
      setErrorMessage("You don't have permission to import courses");
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
      const result = await importCoursesFromExcel(
        importFile,
        departments,
        (progress) => {
          setImportProgress(progress * 100);
        }
      );

      if (result.errors.length > 0) {
        setImportErrors(result.errors);
        setErrorMessage(
          `${result.errors.length} errors found. Please check the errors and try again.`
        );
      }

      if (result.courses.length > 0) {
        let successCount = 0;
        let failCount = 0;

        for (const course of result.courses) {
          try {
            const formData = new FormData();
            formData.append('name', course.name);
            formData.append('code', course.code);
            formData.append('credits', course.credits || '');
            formData.append('description', course.description || '');
            formData.append('lecture', course.lecture || '0');
            formData.append('tutorial', course.tutorial || '0');
            formData.append('practical', course.practical || '0');
            formData.append('noncredit', course.noncredit || 'false');
            formData.append('courseType', course.courseType || 'core');
            formData.append('semester', course.semester || 'semester1');
            formData.append('departmentId', course.departmentId || '');

            const response = await fetch('/api/courses', {
              method: 'POST',
              body: formData,
            });

            if (response.ok) {
              const data = await response.json();
              successCount++;
              const singleCourse = await fetchSingleCourse(data.course.id);
              if (singleCourse) {
                setCourses([singleCourse]);
                setShowAll(false);
              }
            } else {
              const errorData = await response.json();
              setImportErrors((prev) => [
                ...prev,
                {
                  row: `Import`,
                  error: `${course.name}: ${errorData.error}`,
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
                error: `${course.name}: ${err.message}`,
              },
            ]);
          }
        }

        setSuccessMessage(
          `Import completed! ${successCount} courses added, ${failCount} failed.`
        );

        if (successCount > 0) {
          setShowImportModal(false);
          setImportFile(null);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
          // Refresh to get all courses
          setTimeout(() => fetchAllCourses(), 1000);
        }
      }
    } catch (err) {
      setErrorMessage('Failed to import courses: ' + err.message);
    } finally {
      setImporting(false);
      setImportProgress(0);
    }
  };

  // Create course
  const handleCreateCourse = async (formData) => {
    if (!hasCreatePermission) {
      setErrorMessage("You don't have permission to create courses");
      return;
    }

    try {
      setFormLoading(true);

      const response = await fetch('/api/courses', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create course');
      }

      const newCourse = await response.json();

      const singleCourse = await fetchSingleCourse(newCourse.course.id);
      if (singleCourse) {
        setCourses([singleCourse]);
        setShowAll(false);
      }

      setSuccessMessage('Course created successfully!');
      setIsFormModalOpen(false);
      // Refresh the list
      setTimeout(() => fetchAllCourses(), 1000);
    } catch (err) {
      setErrorMessage(err.message);
      console.error('Error creating course:', err);
      throw err;
    } finally {
      setFormLoading(false);
    }
  };

  // Update course
  const handleUpdateCourse = async (formData) => {
    if (!hasUpdatePermission) {
      setErrorMessage("You don't have permission to update courses");
      return;
    }

    try {
      setFormLoading(true);

      if (!editingCourse || !editingCourse.id) {
        throw new Error('No course selected for update');
      }

      const response = await fetch(`/api/courses/${editingCourse.id}`, {
        method: 'PUT',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update course');
      }

      const updatedCourse = await response.json();

      const singleCourse = await fetchSingleCourse(editingCourse.id);
      if (singleCourse) {
        setCourses([singleCourse]);
        setShowAll(false);
      }

      if (allCourses.length > 0) {
        const updatedAllCourses = allCourses.map((c) =>
          c.id === editingCourse.id ? singleCourse : c
        );
        setAllCourses(updatedAllCourses);
      }

      setSuccessMessage('Course updated successfully!');
      setIsFormModalOpen(false);
      setEditingCourse(null);
      // Refresh the list
      setTimeout(() => fetchAllCourses(), 1000);

      if (selectedCourse?.id === editingCourse.id) {
        setIsModalOpen(false);
        setSelectedCourse(null);
      }
    } catch (err) {
      setErrorMessage(err.message);
      console.error('Error updating course:', err);
      throw err;
    } finally {
      setFormLoading(false);
    }
  };

  // Delete course
  const handleDeleteCourse = async (courseId) => {
    if (!hasDeletePermission) {
      setErrorMessage("You don't have permission to delete courses");
      return;
    }

    try {
      setDeleting(true);
      const response = await fetch(`/api/courses/${courseId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete course');
      }

      if (allCourses.length > 0) {
        const updatedAllCourses = allCourses.filter((c) => c.id !== courseId);
        setAllCourses(updatedAllCourses);

        if (showAll) {
          setCourses(updatedAllCourses);
        } else {
          setCourses([]);
          setShowAll(false);
        }
      } else {
        setCourses([]);
        setShowAll(false);
      }

      setSuccessMessage('Course deleted successfully!');
      setShowDeleteConfirm(false);
      setCourseToDelete(null);
      setSelectedCourseIds((prev) => prev.filter((id) => id !== courseId));
      // Refresh the list
      setTimeout(() => fetchAllCourses(), 1000);

      if (selectedCourse?.id === courseId) {
        setIsModalOpen(false);
        setSelectedCourse(null);
      }
    } catch (err) {
      setErrorMessage(err.message);
      console.error('Error deleting course:', err);
    } finally {
      setDeleting(false);
    }
  };

  // Bulk delete courses
  const handleBulkDelete = async () => {
    if (!hasDeletePermission) {
      setErrorMessage("You don't have permission to delete courses");
      return;
    }

    if (selectedCourseIds.length === 0) {
      setErrorMessage('No courses selected for deletion');
      return;
    }

    try {
      setDeleting(true);
      const response = await fetch('/api/courses/bulk-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ courseIds: selectedCourseIds }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete courses');
      }

      const data = await response.json();

      if (allCourses.length > 0) {
        const updatedAllCourses = allCourses.filter(
          (c) => !selectedCourseIds.includes(c.id)
        );
        setAllCourses(updatedAllCourses);

        if (showAll) {
          setCourses(updatedAllCourses);
        }
      }

      setSelectedCourseIds([]);
      setSuccessMessage(`Successfully deleted ${data.deletedCount} course(s)`);
      setShowBulkDeleteConfirm(false);
      // Refresh the list
      setTimeout(() => fetchAllCourses(), 1000);
    } catch (err) {
      setErrorMessage(err.message);
      console.error('Error bulk deleting courses:', err);
    } finally {
      setDeleting(false);
    }
  };

  // Toggle course selection
  const toggleCourseSelection = (courseId) => {
    setSelectedCourseIds((prev) =>
      prev.includes(courseId)
        ? prev.filter((id) => id !== courseId)
        : [...prev, courseId]
    );
  };

  // Toggle select all
  const toggleSelectAll = () => {
    if (selectedCourseIds.length === courses.length) {
      setSelectedCourseIds([]);
    } else {
      setSelectedCourseIds(courses.map((c) => c.id));
    }
  };

  // Get course type badge
  const getCourseTypeBadge = (type) => {
    const typeConfig = {
      core: { color: 'bg-blue-100 text-blue-800', icon: Icons.BookOpen },
      elective: { color: 'bg-green-100 text-green-800', icon: Icons.GitBranch },
    };

    const config = typeConfig[type] || typeConfig.core;
    const Icon = config.icon;

    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}
      >
        <Icon size={12} />
        {type === 'core' ? 'Core' : 'Elective'}
      </span>
    );
  };

  const getSemesterLabel = (semester) => {
    const semesters = {
      semester1: 'Semester 1',
      semester2: 'Semester 2',
      semester3: 'Semester 3',
      semester4: 'Semester 4',
      semester5: 'Semester 5',
      semester6: 'Semester 6',
      semester7: 'Semester 7',
      semester8: 'Semester 8',
    };
    return semesters[semester] || semester;
  };

  // Course Detail Modal Component
  const CourseDetailModal = ({ course, onClose }) => (
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
          <h2 className="text-xl font-bold text-gray-800">Course Details</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <Icons.X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-2xl font-bold text-gray-800">
                {course.name}
              </h3>
              <p className="text-gray-500 mt-1">Course Code: {course.code}</p>
            </div>
            <div className="flex gap-2">
              {getCourseTypeBadge(course.courseType)}
              {course.noncredit && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  <Icons.CreditCard size={12} />
                  Non-Credit
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500">Credits</label>
              <p className="text-sm font-medium text-gray-800">
                {course.credits || '-'}
              </p>
            </div>
            <div>
              <label className="text-xs text-gray-500">Semester</label>
              <p className="text-sm text-gray-800">
                {getSemesterLabel(course.semester)}
              </p>
            </div>
            <div>
              <label className="text-xs text-gray-500">Department</label>
              <p className="text-sm text-gray-800">
                {course.department?.name || '-'}
              </p>
            </div>
            <div>
              <label className="text-xs text-gray-500">Lecture Hours</label>
              <p className="text-sm text-gray-800">{course.lecture || 0}</p>
            </div>
            <div>
              <label className="text-xs text-gray-500">Tutorial Hours</label>
              <p className="text-sm text-gray-800">{course.tutorial || 0}</p>
            </div>
            <div>
              <label className="text-xs text-gray-500">Practical Hours</label>
              <p className="text-sm text-gray-800">{course.practical || 0}</p>
            </div>
          </div>

          {course.description && (
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">Description</h4>
              <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                {course.description}
              </p>
            </div>
          )}

          {course.syllabus && (
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">Syllabus</h4>
              <a
                href={course.syllabus}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
              >
                <Icons.FileText size={18} />
                View Syllabus
              </a>
            </div>
          )}

          <div className="pt-4 border-t flex gap-3">
            {hasUpdatePermission && (
              <button
                onClick={() => {
                  onClose();
                  setEditingCourse(course);
                  setIsFormModalOpen(true);
                }}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2"
              >
                <Icons.Edit size={18} /> Edit Course
              </button>
            )}
            {hasDeletePermission && (
              <button
                onClick={() => {
                  onClose();
                  setCourseToDelete(course);
                  setShowDeleteConfirm(true);
                }}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center gap-2"
              >
                <Icons.Trash2 size={18} /> Delete Course
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );

  // Loading state
  if (
    permissionsLoading ||
    (loading && courses.length === 0 && !initialLoadDone.current)
  ) {
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
            You don't have permission to view courses.
          </p>
          <p className="text-red-500 text-sm mt-2">
            Required permission: courses:read
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
            Course Management
          </h1>
          <p className="text-gray-500 mt-1">
            Manage and organize course offerings
          </p>
          {!showAll && courses.length === 1 && (
            <p className="text-sm text-indigo-600 mt-1">
              Showing newly{' '}
              {courses[0]?.createdAt && !courses[0]?.updatedAt
                ? 'created'
                : 'updated'}{' '}
              course. Click Refresh to see all courses.
            </p>
          )}
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => fetchAllCourses(true)}
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
                setEditingCourse(null);
                setIsFormModalOpen(true);
              }}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
            >
              <Icons.BookPlus size={18} /> Add Course
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
                placeholder="Search by course name or code..."
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
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Types</option>
            <option value="core">Core</option>
            <option value="elective">Elective</option>
          </select>

          <select
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Semesters</option>
            <option value="semester1">Semester 1</option>
            <option value="semester2">Semester 2</option>
            <option value="semester3">Semester 3</option>
            <option value="semester4">Semester 4</option>
            <option value="semester5">Semester 5</option>
            <option value="semester6">Semester 6</option>
            <option value="semester7">Semester 7</option>
            <option value="semester8">Semester 8</option>
          </select>

          {(search ||
            selectedDepartment !== 'all' ||
            selectedType !== 'all' ||
            selectedSemester !== 'all') && (
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <Icons.X size={16} /> Clear Filters
            </button>
          )}

          {hasDeletePermission && selectedCourseIds.length > 0 && (
            <button
              onClick={() => setShowBulkDeleteConfirm(true)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
            >
              <Icons.Trash2 size={18} />
              Delete Selected ({selectedCourseIds.length})
            </button>
          )}
        </div>
      </div>

      {/* Courses Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left py-3 px-4 w-10">
                  {hasDeletePermission && courses.length > 0 && (
                    <input
                      type="checkbox"
                      checked={
                        selectedCourseIds.length === courses.length &&
                        courses.length > 0
                      }
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  )}
                </th>
                <th
                  className="text-left py-3 px-4 text-sm font-semibold text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('code')}
                >
                  <div className="flex items-center gap-2">
                    Course Code
                    {getSortIcon('code')}
                  </div>
                </th>
                <th
                  className="text-left py-3 px-4 text-sm font-semibold text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-2">
                    Course Name
                    {getSortIcon('name')}
                  </div>
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                  Department
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                  Type
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                  Hours (L/T/P)
                </th>
                <th
                  className="text-left py-3 px-4 text-sm font-semibold text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('credits')}
                >
                  <div className="flex items-center gap-2">
                    Credits
                    {getSortIcon('credits')}
                  </div>
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                  Semester
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && courses.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-12">
                    <div className="flex items-center justify-center">
                      <Icons.Loader2
                        size={32}
                        className="animate-spin text-indigo-600"
                      />
                    </div>
                  </td>
                </tr>
              ) : courses.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-12">
                    <div className="text-gray-500">
                      <Icons.BookOpen
                        size={48}
                        className="mx-auto mb-4 text-gray-300"
                      />
                      <p>No courses found</p>
                      <p className="text-sm mt-2">
                        {search ||
                        selectedDepartment !== 'all' ||
                        selectedType !== 'all' ||
                        selectedSemester !== 'all'
                          ? 'Try adjusting your filters'
                          : 'Click "Add Course" to create one'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                courses.map((course, index) => (
                  <motion.tr
                    key={course.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-b hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-3 px-4">
                      {hasDeletePermission && (
                        <input
                          type="checkbox"
                          checked={selectedCourseIds.includes(course.id)}
                          onChange={() => toggleCourseSelection(course.id)}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-mono text-sm font-medium text-indigo-600">
                        {course.code}
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-gray-800">
                          {course.name}
                        </p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-sm text-gray-800">
                        {course.department?.name || '-'}
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      {getCourseTypeBadge(course.courseType)}
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-sm text-gray-800">
                        {course.lecture || 0}/{course.tutorial || 0}/
                        {course.practical || 0}
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-sm text-gray-800">
                        {course.noncredit
                          ? 'Non-Credit'
                          : `${course.credits || 0}`}
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-sm text-gray-800">
                        {getSemesterLabel(course.semester)}
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedCourse(course);
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
                              setEditingCourse(course);
                              setIsFormModalOpen(true);
                            }}
                            className="p-2 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Edit Course"
                          >
                            <Icons.Edit size={18} className="text-indigo-500" />
                          </button>
                        )}
                        {hasDeletePermission && (
                          <button
                            onClick={() => {
                              setCourseToDelete(course);
                              setShowDeleteConfirm(true);
                            }}
                            className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Course"
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
          // ... existing import modal code ...
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowImportModal(false)}
          >
            {/* Keep your existing import modal content */}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Course Form Modal */}
      <CourseFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingCourse(null);
        }}
        onSubmit={editingCourse ? handleUpdateCourse : handleCreateCourse}
        initialData={editingCourse}
        loading={formLoading}
      />

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && courseToDelete && (
          // ... existing delete confirmation modal ...
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowDeleteConfirm(false)}
          >
            {/* Keep your existing delete confirmation content */}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk Delete Confirmation Modal */}
      <AnimatePresence>
        {showBulkDeleteConfirm && (
          // ... existing bulk delete modal ...
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowBulkDeleteConfirm(false)}
          >
            {/* Keep your existing bulk delete confirmation content */}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Course Detail Modal */}
      <AnimatePresence>
        {isModalOpen && selectedCourse && (
          <CourseDetailModal
            course={selectedCourse}
            onClose={() => {
              setIsModalOpen(false);
              setSelectedCourse(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
