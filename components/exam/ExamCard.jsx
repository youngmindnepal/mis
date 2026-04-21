// components/exam/ExamCard.jsx
'use client';

import { motion } from 'framer-motion';
import * as Icons from 'lucide-react';

const statusConfig = {
  scheduled: { color: 'yellow', icon: Icons.Clock, label: 'Scheduled' },
  ongoing: { color: 'blue', icon: Icons.Play, label: 'Ongoing' },
  completed: { color: 'green', icon: Icons.CheckCircle, label: 'Completed' },
  cancelled: { color: 'red', icon: Icons.XCircle, label: 'Cancelled' },
  result_published: {
    color: 'purple',
    icon: Icons.FileCheck,
    label: 'Results Published',
  },
};

export default function ExamCard({
  exam,
  onEdit,
  onDelete,
  onEnterResult,
  onPublishResults,
  hasUpdatePermission,
  hasDeletePermission,
  hasResultPermission,
}) {
  const status = statusConfig[exam.status] || statusConfig.scheduled;
  const StatusIcon = status.icon;

  const formatDate = (date) => {
    if (!date) return 'TBD';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getExamProgress = () => {
    const now = new Date();
    const startDate = exam.date ? new Date(exam.date) : null;

    if (!startDate) return 0;

    if (exam.status === 'completed' || exam.status === 'result_published') {
      return 100;
    }

    if (exam.status === 'ongoing') {
      return 50;
    }

    if (now < startDate) {
      const diffTime = startDate - now;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return Math.max(0, Math.min(30, 30 - diffDays));
    }

    return 0;
  };

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
    >
      {/* Header */}
      <div
        className={`p-4 bg-${status.color}-50 border-b border-${status.color}-100`}
      >
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 text-lg mb-1">
              {exam.name}
            </h3>
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-${status.color}-100 text-${status.color}-700`}
              >
                <StatusIcon size={12} />
                {status.label}
              </span>
              {exam.examType && (
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                  {exam.examType.name}
                </span>
              )}
            </div>
          </div>

          {/* Action Menu */}
          <div className="flex gap-1">
            {hasUpdatePermission && exam.status === 'scheduled' && (
              <button
                onClick={() => onEdit(exam)}
                className="p-2 hover:bg-white rounded-lg transition-colors"
                title="Edit Exam"
              >
                <Icons.Edit2 size={16} className="text-gray-600" />
              </button>
            )}
            {hasDeletePermission && exam.status === 'scheduled' && (
              <button
                onClick={() => onDelete(exam.id)}
                className="p-2 hover:bg-white rounded-lg transition-colors"
                title="Delete Exam"
              >
                <Icons.Trash2 size={16} className="text-red-600" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        {/* Exam Details */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <Icons.Calendar size={14} />
            <span>{formatDate(exam.date)}</span>
          </div>

          {(exam.startTime || exam.endTime) && (
            <div className="flex items-center gap-2 text-gray-600">
              <Icons.Clock size={14} />
              <span>
                {formatTime(exam.startTime)}{' '}
                {exam.endTime && `- ${formatTime(exam.endTime)}`}
              </span>
            </div>
          )}

          {exam.academicYear && (
            <div className="flex items-center gap-2 text-gray-600">
              <Icons.BookOpen size={14} />
              <span>Academic Year: {exam.academicYear}</span>
            </div>
          )}

          {exam.semester && (
            <div className="flex items-center gap-2 text-gray-600">
              <Icons.Layers size={14} />
              <span className="capitalize">
                {exam.semester.replace('semester', 'Semester ')}
              </span>
            </div>
          )}

          {exam.department && (
            <div className="flex items-center gap-2 text-gray-600">
              <Icons.Building2 size={14} />
              <span>{exam.department.name}</span>
            </div>
          )}

          {exam.batch && (
            <div className="flex items-center gap-2 text-gray-600">
              <Icons.Users size={14} />
              <span>{exam.batch.name}</span>
            </div>
          )}

          {exam.classroom && (
            <div className="flex items-center gap-2 text-gray-600">
              <Icons.DoorOpen size={14} />
              <span>{exam.classroom.name}</span>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        {exam.status !== 'cancelled' && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Progress</span>
              <span>{getExamProgress()}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${getExamProgress()}%` }}
                className={`h-full bg-${status.color}-500 rounded-full`}
              />
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-4 bg-gray-50 border-t border-gray-100">
        {exam.status === 'completed' &&
          hasResultPermission &&
          !exam.results?.length && (
            <button
              onClick={() => onEnterResult(exam)}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-sm"
            >
              <Icons.FileEdit size={16} />
              Enter Results
            </button>
          )}

        {exam.status === 'completed' &&
          exam.results?.length > 0 &&
          exam.status !== 'result_published' && (
            <button
              onClick={() => onPublishResults(exam.id)}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 text-sm"
            >
              <Icons.Send size={16} />
              Publish Results
            </button>
          )}

        {exam.status === 'result_published' && (
          <button
            onClick={() => onEnterResult(exam)}
            className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <Icons.Eye size={16} />
            View Results
          </button>
        )}

        {exam.status === 'ongoing' && (
          <div className="text-center text-sm text-blue-600 font-medium">
            Exam in progress...
          </div>
        )}

        {exam.status === 'scheduled' && (
          <div className="text-center text-sm text-gray-500">
            Starts {formatDate(exam.date)}
          </div>
        )}
      </div>
    </motion.div>
  );
}
