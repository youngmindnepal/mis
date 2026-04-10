// components/classroom/ClassroomDetailsModal.jsx
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';

export default function ClassroomDetailsModal({ isOpen, onClose, classroom }) {
  if (!isOpen || !classroom) return null;

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <AnimatePresence>
      {isOpen && (
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
                Classroom Details
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <Icons.X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-gray-800">
                    {classroom.name}
                  </h3>
                  <p className="text-gray-500 mt-1">
                    {classroom.course?.name || 'No Course Assigned'}
                  </p>
                </div>
                {classroom._count?.enrollments > 0 && (
                  <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm font-medium">
                    {classroom._count.enrollments} Students Enrolled
                  </span>
                )}
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500">Course Code</label>
                  <p className="text-sm font-medium text-gray-800">
                    {classroom.course?.code || '-'}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Faculty</label>
                  <p className="text-sm text-gray-800">
                    {classroom.faculty?.name || 'Not Assigned'}
                  </p>
                  {classroom.faculty?.designation && (
                    <p className="text-xs text-gray-500">
                      {classroom.faculty.designation}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-xs text-gray-500">Batch</label>
                  <p className="text-sm text-gray-800">
                    {classroom.batch?.name || 'Not Assigned'}
                  </p>
                  {classroom.batch?.academicYear && (
                    <p className="text-xs text-gray-500">
                      {classroom.batch.academicYear}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-xs text-gray-500">Department</label>
                  <p className="text-sm text-gray-800">
                    {classroom.department?.name || 'Not Assigned'}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Capacity</label>
                  <p className="text-sm text-gray-800">
                    {classroom.capacity || 'Unlimited'}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Sessions Held</label>
                  <p className="text-sm text-gray-800">
                    {classroom._count?.sessions || 0}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Start Date</label>
                  <p className="text-sm text-gray-800">
                    {formatDate(classroom.startDate)}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">End Date</label>
                  <p className="text-sm text-gray-800">
                    {formatDate(classroom.endDate)}
                  </p>
                </div>
              </div>

              {/* Additional Info */}
              {(classroom.startDate || classroom.endDate) && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-800 mb-2">
                    Schedule Information
                  </h4>
                  <p className="text-sm text-gray-600">
                    This classroom is scheduled from{' '}
                    <strong>{formatDate(classroom.startDate)}</strong> to{' '}
                    <strong>{formatDate(classroom.endDate)}</strong>
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
