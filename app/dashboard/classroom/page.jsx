// app/classrooms/page.jsx
'use client';

import { useState, useCallback } from 'react';
import { Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import ClassroomManager from '@/components/classroom/ClassroomManager';
import ClassroomFormModal from '@/components/classroom/ClassroomFormModal';
import ErrorBoundary from '@/components/classroom/ErrorBoundary';
import { Calendar } from 'lucide-react';
import AttendanceSummaryReport from '@/components/classroom/AttendanceSummaryReport';

function LoadingState() {
  return (
    <div className="p-6">
      <div className="animate-pulse space-y-4">
        <div className="h-10 bg-gray-200 rounded w-1/4"></div>
        <div className="h-20 bg-gray-200 rounded"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm p-6">
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ClassroomPage() {
  const { can, isLoading: permissionsLoading } = usePermissions();
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingClassroom, setEditingClassroom] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Permission checks
  const hasReadPermission = can('classroom', 'read');
  const hasCreatePermission = can('classroom', 'create');
  const hasUpdatePermission = can('classroom', 'update');
  const hasDeletePermission = can('classroom', 'delete');

  const [showAttendanceReport, setShowAttendanceReport] = useState(false);
  // Auto-dismiss messages
  const showMessage = (message, type = 'success') => {
    if (type === 'success') {
      setSuccessMessage(message);
      setTimeout(() => setSuccessMessage(null), 3000);
    } else {
      setErrorMessage(message);
      setTimeout(() => setErrorMessage(null), 3000);
    }
  };

  // Handle refresh from ClassroomManager
  const handleRefresh = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  // Create classroom
  const handleCreateClassroom = async (formData) => {
    if (!hasCreatePermission) {
      showMessage("You don't have permission to create classrooms", 'error');
      return;
    }

    try {
      setFormLoading(true);
      const response = await fetch('/api/classrooms', {
        method: 'POST',
        body: formData,
      });

      // First check if response is ok before trying to parse JSON
      if (!response.ok) {
        let errorMessage = 'Failed to create classroom';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // If response is not JSON, use status text
          errorMessage = `Server error: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();

      showMessage(data.message || 'Classroom created successfully!', 'success');
      setIsFormModalOpen(false);
      handleRefresh(); // Trigger refresh
    } catch (err) {
      showMessage(err.message, 'error');
      console.error('Error creating classroom:', err);
    } finally {
      setFormLoading(false);
    }
  };

  // Loading state while checking permissions
  if (permissionsLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <LoadingState />
        </div>
      </div>
    );
  }

  // Access denied state
  if (!hasReadPermission) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Icons.Lock size={32} className="text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-red-800 mb-2">
              Access Denied
            </h2>
            <p className="text-red-600">
              You don't have permission to view classrooms.
            </p>
            <p className="text-red-500 text-sm mt-2">
              Required permission: classrooms:read
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
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

      {/* Page Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <span>🏠</span>
              <span>/</span>
              <span className="text-gray-900">Classroom Management</span>
            </div>
            <div className="flex justify-between items-center flex-wrap gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Classroom Management
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  Manage classrooms, track attendance, and monitor student
                  progress
                </p>
              </div>

              <div className="flex gap-3">
                {/* Refresh Button */}
                <button
                  onClick={handleRefresh}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
                >
                  <Icons.RefreshCw size={18} />
                  Refresh
                </button>

                {/* Add Classroom Button */}
                {hasCreatePermission && (
                  <button
                    onClick={() => {
                      setEditingClassroom(null);
                      setIsFormModalOpen(true);
                    }}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                  >
                    <Icons.Plus size={18} />
                    Add Classroom
                  </button>
                )}

                {/* Date Display */}
                <div className="bg-indigo-50 rounded-lg px-4 py-2">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-indigo-600" />
                    <span className="text-sm text-gray-600">
                      {new Date().toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowAttendanceReport(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
            >
              <Icons.BarChart3 size={18} />
              Attendance Report
            </button>
          </div>
        </div>
      </div>

      {/* Main Content with Error Boundary and Suspense */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <ErrorBoundary>
          <Suspense fallback={<LoadingState />}>
            <ClassroomManager key={refreshTrigger} onRefresh={handleRefresh} />
          </Suspense>
        </ErrorBoundary>
      </div>

      {/* Classroom Form Modal */}
      <ClassroomFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingClassroom(null);
        }}
        onSubmit={handleCreateClassroom}
        initialData={editingClassroom}
        loading={formLoading}
      />

      <AnimatePresence>
        {showAttendanceReport && (
          <AttendanceSummaryReport
            onClose={() => setShowAttendanceReport(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
