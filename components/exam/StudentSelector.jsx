// components/exam/StudentSelector.jsx
'use client';

import { useMemo } from 'react';
import * as Icons from 'lucide-react';

export default function StudentSelector({
  students = [],
  currentIndex,
  onSelect,
  marksData = {},
  courses = [],
}) {
  // Get completion status for a student
  const getCompletionStatus = (studentId) => {
    const studentMarks = marksData[studentId] || {};
    const totalCourses = courses.length;

    if (totalCourses === 0)
      return { completed: 0, total: 0, percentage: 0, passed: 0, failed: 0 };

    let completed = 0;
    let passed = 0;
    let failed = 0;

    courses.forEach((course) => {
      const courseData = studentMarks[course.id];
      if (
        courseData?.gradePoint !== null &&
        courseData?.gradePoint !== undefined &&
        courseData?.gradePoint !== ''
      ) {
        completed++;
        const gpa = parseFloat(courseData.gradePoint);
        if (gpa >= 2.0) {
          passed++;
        } else {
          failed++;
        }
      }
    });

    return {
      completed,
      total: totalCourses,
      percentage: Math.round((completed / totalCourses) * 100),
      passed,
      failed,
    };
  };

  // Get status color
  const getStatusColor = (percentage, hasFailed) => {
    if (percentage === 100) {
      return hasFailed
        ? 'bg-red-100 text-red-800 border-red-300'
        : 'bg-green-100 text-green-800 border-green-300';
    }
    if (percentage >= 50)
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    if (percentage > 0)
      return 'bg-orange-100 text-orange-800 border-orange-300';
    return 'bg-gray-100 text-gray-600 border-gray-300';
  };

  // Get progress bar color
  const getProgressColor = (percentage, hasFailed) => {
    if (percentage === 100) return hasFailed ? 'bg-red-600' : 'bg-green-600';
    if (percentage >= 50) return 'bg-yellow-600';
    if (percentage > 0) return 'bg-orange-600';
    return 'bg-blue-600';
  };

  if (students.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-gray-500 text-sm">No students found</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Summary Stats */}
      <div className="flex items-center justify-between text-xs text-gray-500 px-2">
        <span>Total Students: {students.length}</span>
        <span>Courses: {courses.length}</span>
        <span>
          Completed:{' '}
          {
            students.filter((s) => getCompletionStatus(s.id).percentage === 100)
              .length
          }
        </span>
      </div>

      {/* Student List */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {students.map((student, index) => {
          const status = getCompletionStatus(student.id);
          const isCurrent = index === currentIndex;
          const hasFailed = status.failed > 0;

          return (
            <button
              key={student.id}
              onClick={() => onSelect(index)}
              className={`flex-shrink-0 px-4 py-3 rounded-lg border-2 transition-all ${
                isCurrent
                  ? 'border-blue-500 bg-blue-50 shadow-md'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
              } ${getStatusColor(status.percentage, hasFailed)}`}
            >
              <div className="flex items-center gap-3">
                {/* Avatar/Icon */}
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isCurrent
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {student.photo || student.profilePicture ? (
                    <img
                      src={student.photo || student.profilePicture}
                      alt={student.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <Icons.User size={18} />
                  )}
                </div>

                {/* Student Info */}
                <div className="text-left min-w-[140px]">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm font-medium truncate max-w-[100px] ${
                        isCurrent ? 'text-blue-900' : 'text-gray-900'
                      }`}
                      title={student.name}
                    >
                      {student.name}
                    </span>
                    {status.percentage === 100 && !hasFailed && (
                      <Icons.CheckCircle
                        size={14}
                        className="text-green-600 flex-shrink-0"
                      />
                    )}
                    {status.percentage === 100 && hasFailed && (
                      <Icons.AlertCircle
                        size={14}
                        className="text-red-600 flex-shrink-0"
                      />
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-gray-500">
                      {student.rollNo || student.rollNumber || 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span
                      className={`text-xs font-medium ${
                        status.percentage === 100
                          ? hasFailed
                            ? 'text-red-600'
                            : 'text-green-600'
                          : status.percentage > 0
                          ? 'text-yellow-600'
                          : 'text-gray-500'
                      }`}
                    >
                      {status.completed}/{status.total}
                    </span>
                    {status.failed > 0 && (
                      <span className="text-xs text-red-600 flex items-center gap-1">
                        <Icons.XCircle size={10} />
                        {status.failed}
                      </span>
                    )}
                    {status.passed > 0 && (
                      <span className="text-xs text-green-600 flex items-center gap-1">
                        <Icons.CheckCircle size={10} />
                        {status.passed}
                      </span>
                    )}
                  </div>
                  {/* Progress Bar */}
                  <div className="mt-2 w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${getProgressColor(
                        status.percentage,
                        hasFailed
                      )}`}
                      style={{ width: `${status.percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
