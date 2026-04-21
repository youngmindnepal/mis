'use client';

import { useState, useCallback, useEffect } from 'react';
import { Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import ExamManager from '@/components/exam/ExamManager';
import ExamFormModal from '@/components/exam/ExamFormModal';
import ResultEntryModal from '@/components/exam/ResultEntryModal';
import ErrorBoundary from '@/components/exam/ErrorBoundary';
import { Calendar } from 'lucide-react';
import ExamAnalytics from '@/components/exam/ExamAnalytics';
import BulkExamScheduler from '@/components/exam/BulkExamScheduler';

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

// Helper function to calculate dynamic exam status
const calculateDynamicStats = (exams) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let total = 0;
  let scheduled = 0;
  let ongoing = 0;
  let completed = 0;
  let published = 0;

  exams.forEach((exam) => {
    total++;

    // If results are published, count as published
    if (exam.status === 'result_published') {
      published++;
      return;
    }

    const examDate = new Date(exam.date);
    const examDay = new Date(
      examDate.getFullYear(),
      examDate.getMonth(),
      examDate.getDate()
    );
    const examStartTime = exam.startTime ? new Date(exam.startTime) : null;
    const examEndTime = exam.endTime ? new Date(exam.endTime) : null;

    // Check if results exist (even if not published)
    const hasResults = exam._count?.results > 0 || exam.hasResults;

    if (examDay < today) {
      // Exam date is in the past
      if (examEndTime && now > examEndTime) {
        completed++;
      } else {
        scheduled++;
      }
    } else if (examDay.getTime() === today.getTime()) {
      // Exam is today
      if (examStartTime && examEndTime) {
        if (now < examStartTime) {
          scheduled++;
        } else if (now >= examStartTime && now <= examEndTime) {
          ongoing++;
        } else if (now > examEndTime) {
          completed++;
        }
      } else {
        scheduled++;
      }
    } else {
      // Exam date is in the future
      scheduled++;
    }
  });

  return { total, scheduled, ongoing, completed, published };
};

export default function ExamPage() {
  const { can, isLoading: permissionsLoading } = usePermissions();
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [editingExam, setEditingExam] = useState(null);
  const [selectedExam, setSelectedExam] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [examTypes, setExamTypes] = useState([]);
  const [isBulkSchedulerOpen, setIsBulkSchedulerOpen] = useState(false);
  const [allExams, setAllExams] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    scheduled: 0,
    ongoing: 0,
    completed: 0,
    published: 0,
  });

  const hasReadPermission = can('exam', 'read');
  const hasCreatePermission = can('exam', 'create');
  const hasUpdatePermission = can('exam', 'update');
  const hasDeletePermission = can('exam', 'delete');
  const hasResultPermission = can('result', 'create');

  useEffect(() => {
    if (hasReadPermission) {
      fetchExamTypes();
      fetchAllExams();
    }
  }, [hasReadPermission, refreshTrigger]);

  const fetchExamTypes = async () => {
    try {
      const response = await fetch('/api/exam-types');
      if (response.ok) {
        const data = await response.json();
        setExamTypes(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching exam types:', error);
    }
  };

  const fetchAllExams = async () => {
    try {
      const response = await fetch('/api/exams');
      if (response.ok) {
        const data = await response.json();
        const exams = Array.isArray(data) ? data : [];
        setAllExams(exams);

        // Calculate dynamic stats
        const dynamicStats = calculateDynamicStats(exams);
        setStats(dynamicStats);
      }
    } catch (error) {
      console.error('Error fetching exams:', error);
    }
  };

  const showMessage = (message, type = 'success') => {
    if (type === 'success') {
      setSuccessMessage(message);
      setTimeout(() => setSuccessMessage(null), 3000);
    } else {
      setErrorMessage(message);
      setTimeout(() => setErrorMessage(null), 3000);
    }
  };

  const handleRefresh = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  const handleSubmitExam = useCallback(
    async (result) => {
      console.log('Exam saved, result:', result);
      const isEditing = !!editingExam;
      showMessage(
        result.message ||
          `Exam ${isEditing ? 'updated' : 'scheduled'} successfully!`,
        'success'
      );
      setIsFormModalOpen(false);
      setEditingExam(null);
      handleRefresh();
    },
    [editingExam, handleRefresh, showMessage]
  );

  const handleQuickCreate = async (examData) => {
    try {
      const response = await fetch('/api/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(examData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to schedule exam');
      }

      showMessage('Exam scheduled successfully!', 'success');
      handleRefresh();
    } catch (error) {
      console.error('Error creating exam:', error);
      showMessage(error.message, 'error');
    }
  };

  const handleDeleteExam = async (examId) => {
    if (!hasDeletePermission) {
      showMessage("You don't have permission to delete exams", 'error');
      return;
    }

    if (
      !confirm(
        'Are you sure you want to delete this exam? This action cannot be undone.'
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/exams/${examId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete exam');
      }

      showMessage('Exam deleted successfully!', 'success');
      handleRefresh();
    } catch (err) {
      showMessage(err.message, 'error');
      console.error('Error deleting exam:', err);
    }
  };

  const handleDeleteGroup = async (groupName) => {
    if (!hasDeletePermission) {
      showMessage("You don't have permission to delete exams", 'error');
      return;
    }

    if (
      !confirm(
        `Are you sure you want to delete ALL exams named "${groupName}"?`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(
        `/api/exams/group?name=${encodeURIComponent(groupName)}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete exam group');
      }

      const data = await response.json();
      showMessage(
        data.message || 'Exam group deleted successfully!',
        'success'
      );
      handleRefresh();
    } catch (err) {
      showMessage(err.message, 'error');
      console.error('Error deleting exam group:', err);
    }
  };

  const handlePublishResults = async (examId) => {
    if (!can('result', 'publish')) {
      showMessage("You don't have permission to publish results", 'error');
      return;
    }

    try {
      const response = await fetch(`/api/exams/${examId}/publish-results`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to publish results');
      }

      const data = await response.json();
      showMessage(data.message || 'Results published successfully!', 'success');
      handleRefresh();
    } catch (err) {
      showMessage(err.message, 'error');
      console.error('Error publishing results:', err);
    }
  };

  const handleEnterResult = (exam) => {
    setSelectedExam(exam);
    setIsResultModalOpen(true);
  };

  const handleExamTypeCreated = useCallback((newType) => {
    setExamTypes((prev) => [...prev, newType]);
  }, []);

  const getStatusLabel = (status) => {
    const labels = {
      scheduled: 'Scheduled',
      ongoing: 'Ongoing',
      completed: 'Completed',
      cancelled: 'Cancelled',
      result_published: 'Published',
    };
    return labels[status] || status;
  };

  if (permissionsLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <LoadingState />
        </div>
      </div>
    );
  }

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
              You don't have permission to view exams.
            </p>
            <p className="text-red-500 text-sm mt-2">
              Required permission: exam:read
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
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <span>📚</span>
              <span>/</span>
              <span className="text-gray-900">Examination Management</span>
            </div>

            {/* Title and Actions */}
            <div className="flex justify-between items-center flex-wrap gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Examination Management
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  Schedule exams, manage results, and track student performance
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

                {/* Analytics Button */}
                <button
                  onClick={() => setIsAnalyticsOpen(true)}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                >
                  <Icons.BarChart3 size={18} />
                  Analytics
                </button>

                {/* Bulk Schedule Button */}
                {hasCreatePermission && (
                  <button
                    onClick={() => setIsBulkSchedulerOpen(true)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                  >
                    <Icons.CalendarDays size={18} />
                    Bulk Schedule
                  </button>
                )}

                {/* Schedule Exam Button */}
                {hasCreatePermission && (
                  <button
                    onClick={() => {
                      setEditingExam(null);
                      setIsFormModalOpen(true);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <Icons.Plus size={18} />
                    Schedule Exam
                  </button>
                )}

                {/* Date Display */}
                <div className="bg-blue-50 rounded-lg px-4 py-2">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-blue-600" />
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
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg p-4 shadow-sm"
          >
            <div className="text-sm text-gray-500">Total Exams</div>
            <div className="text-2xl font-bold text-gray-900">
              {stats.total}
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-yellow-50 rounded-lg p-4 shadow-sm"
          >
            <div className="text-sm text-yellow-600">Scheduled</div>
            <div className="text-2xl font-bold text-yellow-700">
              {stats.scheduled}
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-blue-50 rounded-lg p-4 shadow-sm"
          >
            <div className="text-sm text-blue-600">Ongoing</div>
            <div className="text-2xl font-bold text-blue-700">
              {stats.ongoing}
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-green-50 rounded-lg p-4 shadow-sm"
          >
            <div className="text-sm text-green-600">Completed</div>
            <div className="text-2xl font-bold text-green-700">
              {stats.completed}
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-purple-50 rounded-lg p-4 shadow-sm"
          >
            <div className="text-sm text-purple-600">Published</div>
            <div className="text-2xl font-bold text-purple-700">
              {stats.published}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
        <ErrorBoundary>
          <Suspense fallback={<LoadingState />}>
            <ExamManager
              key={refreshTrigger}
              onEdit={(exam) => {
                setEditingExam(exam);
                setIsFormModalOpen(true);
              }}
              onDelete={handleDeleteExam}
              onDeleteGroup={handleDeleteGroup}
              onEnterResult={handleEnterResult}
              onPublishResults={handlePublishResults}
              hasUpdatePermission={hasUpdatePermission}
              hasDeletePermission={hasDeletePermission}
              hasResultPermission={hasResultPermission}
              hasCreatePermission={hasCreatePermission}
              onQuickCreate={handleQuickCreate}
            />
          </Suspense>
        </ErrorBoundary>
      </div>

      {/* Modals */}
      <BulkExamScheduler
        isOpen={isBulkSchedulerOpen}
        onClose={() => setIsBulkSchedulerOpen(false)}
        onSubmit={(result) => {
          setIsBulkSchedulerOpen(false);
          handleRefresh();
          showMessage(
            result.message || 'Exams scheduled successfully!',
            'success'
          );
        }}
        examTypes={examTypes}
        onExamTypeCreated={handleExamTypeCreated}
      />

      <ExamFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingExam(null);
        }}
        onSubmit={handleSubmitExam}
        initialData={editingExam}
        examTypes={examTypes}
        onExamTypeCreated={handleExamTypeCreated}
        loading={formLoading}
      />

      <AnimatePresence>
        {isResultModalOpen && selectedExam && (
          <ResultEntryModal
            isOpen={isResultModalOpen}
            onClose={() => {
              setIsResultModalOpen(false);
              setSelectedExam(null);
            }}
            exam={selectedExam}
            onSuccess={() => {
              setIsResultModalOpen(false);
              setSelectedExam(null);
              handleRefresh();
              showMessage('Results saved successfully!', 'success');
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAnalyticsOpen && (
          <ExamAnalytics onClose={() => setIsAnalyticsOpen(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
