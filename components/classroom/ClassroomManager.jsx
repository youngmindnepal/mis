// components/classroom/ClassroomManager.jsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import { useRouter } from 'next/navigation';
import ClassroomFormModal from './ClassroomFormModal';
import ClassroomDetailsModal from './ClassroomDetails';

export default function ClassroomManager({ onRefresh, canCreate = false }) {
  const { can } = usePermissions();
  const router = useRouter();

  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [courses, setCourses] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [batches, setBatches] = useState([]);
  const [departments, setDepartments] = useState([]);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('all');
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [selectedFaculty, setSelectedFaculty] = useState('all');

  // Modal states
  const [selectedClassroom, setSelectedClassroom] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingClassroom, setEditingClassroom] = useState(null);
  const [deletingClassroom, setDeletingClassroom] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Permissions
  const hasReadPermission = can('classroom', 'read');
  const hasCreatePermission = can('classroom', 'create');
  const hasUpdatePermission = can('classroom', 'update');
  const hasDeletePermission = can('classroom', 'delete');

  // Auto-dismiss messages
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  // Navigate to classroom details page
  const handleEnterClassroom = (classroomId) => {
    router.push(`/dashboard/classroom/${classroomId}`);
  };

  // Fetch faculties for dropdown
  const fetchFaculties = useCallback(async () => {
    try {
      const response = await fetch('/api/faculty/list?limit=200');

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Failed to fetch faculties: ${response.status}`
        );
      }

      const data = await response.json();
      setFaculties(data.faculties || []);
    } catch (err) {
      console.error('Error fetching faculties:', err);
      setError(err.message);
    }
  }, []);

  // Fetch courses
  const fetchCourses = useCallback(async () => {
    try {
      const response = await fetch('/api/courses?limit=200');

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Failed to fetch courses: ${response.status}`
        );
      }

      const data = await response.json();
      setCourses(data.courses || []);
    } catch (err) {
      console.error('Error fetching courses:', err);
      setError(err.message);
    }
  }, []);

  // Fetch batches
  const fetchBatches = useCallback(async () => {
    try {
      const response = await fetch('/api/batches?limit=200');

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Failed to fetch batches: ${response.status}`
        );
      }

      const data = await response.json();
      setBatches(data.batches || []);
    } catch (err) {
      console.error('Error fetching batches:', err);
      setError(err.message);
    }
  }, []);

  // Fetch departments
  const fetchDepartments = useCallback(async () => {
    try {
      const response = await fetch('/api/departments?limit=200');

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Failed to fetch departments: ${response.status}`
        );
      }

      const data = await response.json();
      setDepartments(data.departments || []);
    } catch (err) {
      console.error('Error fetching departments:', err);
      setError(err.message);
    }
  }, []);

  // Fetch classrooms
  const fetchClassrooms = useCallback(async () => {
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
        ...(selectedBatch !== 'all' && { batchId: selectedBatch }),
        ...(selectedCourse !== 'all' && { courseId: selectedCourse }),
        ...(selectedFaculty !== 'all' && { facultyId: selectedFaculty }),
      });

      const response = await fetch(`/api/classrooms?${params}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Failed to fetch classrooms: ${response.status}`
        );
      }

      const data = await response.json();
      setClassrooms(data.classrooms || []);
    } catch (err) {
      console.error('Error fetching classrooms:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [
    hasReadPermission,
    search,
    selectedBatch,
    selectedCourse,
    selectedFaculty,
  ]);

  // Update classroom
  const handleUpdateClassroom = async (formData) => {
    if (!hasUpdatePermission) {
      setErrorMessage("You don't have permission to update classrooms");
      return;
    }

    try {
      setFormLoading(true);

      if (!editingClassroom || !editingClassroom.id) {
        throw new Error('No classroom selected for update');
      }

      const response = await fetch(`/api/classrooms/${editingClassroom.id}`, {
        method: 'PUT',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update classroom');
      }

      setSuccessMessage('Classroom updated successfully!');
      setIsEditModalOpen(false);
      setEditingClassroom(null);
      fetchClassrooms(); // Refresh the list

      if (onRefresh) onRefresh();
    } catch (err) {
      setErrorMessage(err.message);
      console.error('Error updating classroom:', err);
    } finally {
      setFormLoading(false);
    }
  };

  // Delete classroom
  const handleDeleteClassroom = async () => {
    if (!hasDeletePermission) {
      setErrorMessage("You don't have permission to delete classrooms");
      return;
    }

    if (!deletingClassroom) return;

    try {
      setDeleting(true);
      const response = await fetch(`/api/classrooms/${deletingClassroom.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete classroom');
      }

      setSuccessMessage('Classroom deleted successfully!');
      setShowDeleteConfirm(false);
      setDeletingClassroom(null);
      fetchClassrooms(); // Refresh the list

      if (onRefresh) onRefresh();
    } catch (err) {
      setErrorMessage(err.message);
      console.error('Error deleting classroom:', err);
    } finally {
      setDeleting(false);
    }
  };

  // Initial load
  useEffect(() => {
    if (hasReadPermission) {
      Promise.all([
        fetchFaculties(),
        fetchCourses(),
        fetchBatches(),
        fetchDepartments(),
      ]).then(() => {
        fetchClassrooms();
      });
    }
  }, [
    hasReadPermission,
    fetchFaculties,
    fetchCourses,
    fetchBatches,
    fetchDepartments,
    fetchClassrooms,
  ]);

  // Refresh when filters change
  useEffect(() => {
    if (hasReadPermission) {
      fetchClassrooms();
    }
  }, [
    search,
    selectedBatch,
    selectedCourse,
    selectedFaculty,
    hasReadPermission,
    fetchClassrooms,
  ]);

  // Clear all filters
  const handleClearFilters = () => {
    setSearch('');
    setSelectedBatch('all');
    setSelectedCourse('all');
    setSelectedFaculty('all');
  };

  // Loading state
  if (loading && classrooms.length === 0) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="bg-white rounded-xl shadow-sm p-6 animate-pulse"
          >
            <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Error state
  if (error && !loading) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Icons.AlertTriangle size={32} className="text-red-600" />
        </div>
        <h3 className="text-lg font-semibold text-red-800 mb-2">
          Error Loading Classrooms
        </h3>
        <p className="text-red-600">{error}</p>
        <button
          onClick={() => {
            setError(null);
            fetchClassrooms();
          }}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Success Toast */}
      <AnimatePresence>
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            className="fixed top-20 right-6 z-50 bg-green-50 border-l-4 border-green-500 text-green-800 px-4 py-3 rounded-lg shadow-lg"
          >
            <div className="flex items-center gap-2">
              <Icons.CheckCircle size={20} className="text-green-500" />
              <span className="font-medium">{successMessage}</span>
              <button
                onClick={() => setSuccessMessage(null)}
                className="ml-auto"
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
            className="fixed top-20 right-6 z-50 bg-red-50 border-l-4 border-red-500 text-red-800 px-4 py-3 rounded-lg shadow-lg"
          >
            <div className="flex items-center gap-2">
              <Icons.AlertCircle size={20} className="text-red-500" />
              <span className="font-medium">{errorMessage}</span>
              <button onClick={() => setErrorMessage(null)} className="ml-auto">
                <Icons.X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Icons.Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                type="text"
                placeholder="Search classrooms..."
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
                {batch.name}
              </option>
            ))}
          </select>

          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Courses</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.name} ({course.code})
              </option>
            ))}
          </select>

          <select
            value={selectedFaculty}
            onChange={(e) => setSelectedFaculty(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Faculty</option>
            {faculties.map((faculty) => (
              <option key={faculty.id} value={faculty.id}>
                {faculty.name}{' '}
                {faculty.designation ? `- ${faculty.designation}` : ''}
              </option>
            ))}
          </select>

          {(search ||
            selectedBatch !== 'all' ||
            selectedCourse !== 'all' ||
            selectedFaculty !== 'all') && (
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <Icons.X size={16} /> Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Classrooms Grid */}
      {classrooms.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <Icons.BookOpen size={48} className="mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500">No classrooms found</p>
          <p className="text-sm text-gray-400 mt-1">
            {search ||
            selectedBatch !== 'all' ||
            selectedCourse !== 'all' ||
            selectedFaculty !== 'all'
              ? 'Try adjusting your filters'
              : hasCreatePermission
              ? 'Click "Add Classroom" to create one'
              : 'Contact an administrator to create classrooms'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classrooms.map((classroom) => (
            <motion.div
              key={classroom.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden"
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">
                    {classroom.name}
                  </h3>
                  {classroom._count?.enrollments > 0 && (
                    <span className="bg-indigo-100 text-indigo-800 text-xs px-2 py-1 rounded-full">
                      {classroom._count.enrollments} Students
                    </span>
                  )}
                </div>

                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Icons.BookOpen size={14} />
                    <span>{classroom.course?.name || 'No Course'}</span>
                  </div>
                  {classroom.faculty && (
                    <div className="flex items-center gap-2">
                      <Icons.User size={14} />
                      <span>{classroom.faculty.name}</span>
                    </div>
                  )}
                  {classroom.batch && (
                    <div className="flex items-center gap-2">
                      <Icons.GraduationCap size={14} />
                      <span>{classroom.batch.name}</span>
                    </div>
                  )}
                  {classroom.capacity && (
                    <div className="flex items-center gap-2">
                      <Icons.Users size={14} />
                      <span>Capacity: {classroom.capacity}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t flex justify-end gap-2">
                  {/* Enter Classroom Button */}
                  <button
                    onClick={() => handleEnterClassroom(classroom.id)}
                    className="p-2 hover:bg-green-50 rounded-lg transition-colors"
                    title="Enter Classroom"
                  >
                    <Icons.LogIn size={18} className="text-green-600" />
                  </button>

                  {/* View Details Button */}
                  <button
                    onClick={() => {
                      setSelectedClassroom(classroom);
                      setIsViewModalOpen(true);
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title="View Details"
                  >
                    <Icons.Eye size={18} className="text-gray-500" />
                  </button>

                  {/* Edit Button */}
                  {hasUpdatePermission && (
                    <button
                      onClick={() => {
                        setEditingClassroom(classroom);
                        setIsEditModalOpen(true);
                      }}
                      className="p-2 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Edit Classroom"
                    >
                      <Icons.Edit size={18} className="text-indigo-500" />
                    </button>
                  )}

                  {/* Delete Button */}
                  {hasDeletePermission && (
                    <button
                      onClick={() => {
                        setDeletingClassroom(classroom);
                        setShowDeleteConfirm(true);
                      }}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Classroom"
                    >
                      <Icons.Trash2 size={18} className="text-red-500" />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Classroom Details Modal */}
      <ClassroomDetailsModal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedClassroom(null);
        }}
        classroom={selectedClassroom}
      />

      {/* Edit Classroom Modal */}
      <ClassroomFormModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingClassroom(null);
        }}
        onSubmit={handleUpdateClassroom}
        initialData={editingClassroom}
        loading={formLoading}
      />

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && deletingClassroom && (
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
                Delete Classroom
              </h3>
              <p className="text-gray-600 text-center mb-4">
                Are you sure you want to delete{' '}
                <strong>{deletingClassroom.name}</strong>? This action cannot be
                undone. This will also remove all enrollments and attendance
                records.
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
                  onClick={handleDeleteClassroom}
                  disabled={deleting}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
