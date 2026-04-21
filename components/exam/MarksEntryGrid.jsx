// components/exam/MarksEntryGrid.jsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import * as Icons from 'lucide-react';

const GRADE_OPTIONS = [
  { value: 4.0, label: '4.0 (A)' },
  { value: 3.7, label: '3.7 (A-)' },
  { value: 3.3, label: '3.3 (B+)' },
  { value: 3.0, label: '3.0 (B)' },
  { value: 2.7, label: '2.7 (B-)' },
  { value: 2.3, label: '2.3 (C+)' },
  { value: 2.0, label: '2.0 (C)' },
  { value: 0.0, label: '0.0 (F)' },
];

const GRADE_POINTS = [
  {
    grade: 'A',
    gpa: 4.0,
    min: 3.71,
    max: 4.0,
    color: 'bg-green-100 text-green-800 border-green-300',
  },
  {
    grade: 'A-',
    gpa: 3.7,
    min: 3.31,
    max: 3.7,
    color: 'bg-green-50 text-green-700 border-green-200',
  },
  {
    grade: 'B+',
    gpa: 3.3,
    min: 3.01,
    max: 3.3,
    color: 'bg-blue-100 text-blue-800 border-blue-300',
  },
  {
    grade: 'B',
    gpa: 3.0,
    min: 2.71,
    max: 3.0,
    color: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  {
    grade: 'B-',
    gpa: 2.7,
    min: 2.31,
    max: 2.7,
    color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  },
  {
    grade: 'C+',
    gpa: 2.3,
    min: 2.01,
    max: 2.3,
    color: 'bg-orange-100 text-orange-800 border-orange-300',
  },
  {
    grade: 'C',
    gpa: 2.0,
    min: 1.71,
    max: 2.0,
    color: 'bg-orange-50 text-orange-700 border-orange-200',
  },
  {
    grade: 'F',
    gpa: 0.0,
    min: 0.0,
    max: 1.7,
    color: 'bg-red-100 text-red-800 border-red-300',
  },
];

const calculateGrade = (gpa) => {
  if (gpa === null || gpa === undefined || gpa === '') {
    return { grade: null, isPass: null, color: '' };
  }

  const numGPA = parseFloat(gpa);

  if (isNaN(numGPA)) {
    return { grade: null, isPass: null, color: '' };
  }

  for (const gradeInfo of GRADE_POINTS) {
    if (numGPA >= gradeInfo.min && numGPA <= gradeInfo.max) {
      return {
        grade: gradeInfo.grade,
        isPass: numGPA >= 2.0,
        color: gradeInfo.color,
      };
    }
  }

  return {
    grade: 'F',
    isPass: false,
    color: 'bg-red-100 text-red-800 border-red-300',
  };
};

function getGradeColor(grade) {
  const colors = {
    A: 'bg-green-100 text-green-800',
    'A-': 'bg-green-50 text-green-700',
    'B+': 'bg-blue-100 text-blue-800',
    B: 'bg-blue-50 text-blue-700',
    'B-': 'bg-yellow-100 text-yellow-800',
    'C+': 'bg-orange-100 text-orange-800',
    C: 'bg-orange-50 text-orange-700',
    F: 'bg-red-100 text-red-800',
  };
  return colors[grade] || 'bg-gray-100 text-gray-800';
}

export default function MarksEntryGrid({
  student,
  courses = [],
  marksData = {},
  onMarksChange,
  onSave,
  saving = false,
  examCategory = 'regular',
  failedSubjectsData = null,
  regularResults = null,
}) {
  const [localMarks, setLocalMarks] = useState({});
  const [hasChanges, setHasChanges] = useState(false);
  const [showRegularMarks, setShowRegularMarks] = useState(true);

  const coursesToDisplay = useMemo(() => {
    if (examCategory === 'supplementary' && failedSubjectsData) {
      let failedCourseIds = new Set();

      if (
        failedSubjectsData.remainingFailedSubjects &&
        Array.isArray(failedSubjectsData.remainingFailedSubjects)
      ) {
        failedSubjectsData.remainingFailedSubjects.forEach((subject) => {
          if (subject.courseId) failedCourseIds.add(subject.courseId);
          if (subject.id) failedCourseIds.add(subject.id);
        });
      }

      if (
        failedSubjectsData.regularFailedSubjects &&
        Array.isArray(failedSubjectsData.regularFailedSubjects)
      ) {
        failedSubjectsData.regularFailedSubjects.forEach((subject) => {
          if (subject.courseId) failedCourseIds.add(subject.courseId);
          if (subject.id) failedCourseIds.add(subject.id);
        });
      }

      if (
        failedSubjectsData.failedSubjects &&
        Array.isArray(failedSubjectsData.failedSubjects)
      ) {
        failedSubjectsData.failedSubjects.forEach((subject) => {
          if (subject.courseId) failedCourseIds.add(subject.courseId);
          if (subject.id) failedCourseIds.add(subject.id);
        });
      }

      return courses.filter((course) => failedCourseIds.has(course.id));
    }

    return courses;
  }, [courses, examCategory, failedSubjectsData]);

  const getRegularMarkForCourse = (courseId) => {
    if (!regularResults || examCategory !== 'supplementary') return null;
    if (regularResults[courseId]) return regularResults[courseId];
    if (Array.isArray(regularResults)) {
      return regularResults.find((r) => r.courseId === courseId);
    }
    return null;
  };
  // Add this useEffect to track changes
  useEffect(() => {
    // Check if there are any differences between localMarks and original marksData
    let hasAnyChanges = false;

    coursesToDisplay.forEach((course) => {
      const local = localMarks[course.id] || {};
      const original = marksData[course.id] || {};

      const localGP = local.gradePoint;
      const originalGP = original.gradePoint;
      const localRemarks = local.remarks || '';
      const originalRemarks = original.remarks || '';

      // Compare values (handle empty string vs null/undefined)
      const gpChanged = (localGP || '') !== (originalGP || '');
      const remarksChanged = localRemarks !== originalRemarks;

      if (gpChanged || remarksChanged) {
        hasAnyChanges = true;
      }
    });

    setHasChanges(hasAnyChanges);
  }, [localMarks, marksData, coursesToDisplay]);
  // Initialize local marks from marksData (which contains data from database)
  useEffect(() => {
    const initialMarks = {};
    coursesToDisplay.forEach((course) => {
      const existing = marksData[course.id] || {};
      const regularMark = getRegularMarkForCourse(course.id);

      const existingGradePoint = existing.gradePoint;
      const hasValue =
        existingGradePoint !== undefined &&
        existingGradePoint !== null &&
        existingGradePoint !== '';

      initialMarks[course.id] = {
        gradePoint: hasValue ? existingGradePoint : '',
        grade: existing.grade || null,
        isPassed: existing.isPassed !== undefined ? existing.isPassed : null,
        remarks: existing.remarks || '',
        regularGradePoint: regularMark?.gradePoint,
        regularGrade: regularMark?.grade,
      };
    });
    setLocalMarks(initialMarks);
    setHasChanges(false);
  }, [coursesToDisplay, marksData, student?.id]);

  // In MarksEntryGrid.jsx, update the handleGradePointChange function

  const handleGradePointChange = (courseId, value) => {
    let numValue;
    if (value === '') {
      numValue = '';
    } else {
      numValue = parseFloat(value);
      if (isNaN(numValue) || numValue < 0 || numValue > 4.0) {
        return;
      }
    }

    const { grade, isPass, color } = calculateGrade(numValue);

    setLocalMarks((prev) => {
      const updated = {
        ...prev,
        [courseId]: {
          ...prev[courseId],
          gradePoint: numValue,
          grade,
          isPassed: isPass,
          gradeColor: color,
        },
      };

      // Check if there are actual changes
      const originalValue = marksData[courseId]?.gradePoint;
      const hasActualChange = originalValue !== numValue;

      if (hasActualChange) {
        setHasChanges(true);
      }

      return updated;
    });

    onMarksChange(student.id, courseId, 'gradePoint', numValue);
    onMarksChange(student.id, courseId, 'grade', grade);
    onMarksChange(student.id, courseId, 'isPassed', isPass);
  };

  const handleRemarksChange = (courseId, value) => {
    setLocalMarks((prev) => {
      const updated = {
        ...prev,
        [courseId]: {
          ...prev[courseId],
          remarks: value,
        },
      };

      // Check if there are actual changes
      const originalRemarks = marksData[courseId]?.remarks || '';
      if (originalRemarks !== value) {
        setHasChanges(true);
      }

      return updated;
    });

    onMarksChange(student.id, courseId, 'remarks', value);
  };

  const handleQuickFill = (gpa) => {
    coursesToDisplay.forEach((course) => {
      handleGradePointChange(course.id, gpa.toString());
    });
  };

  const handleSaveClick = () => {
    console.log('=== SAVE CLICKED ===');
    console.log('Student:', student?.name);
    console.log('Exam Category:', examCategory);
    console.log('Courses to display:', coursesToDisplay.length);
    onSave();
  };

  const calculateSummary = useMemo(() => {
    let totalCredits = 0;
    let earnedCredits = 0;
    let totalGradePoints = 0;
    let passedCount = 0;
    let failedCount = 0;
    let pendingCount = 0;

    coursesToDisplay.forEach((course) => {
      const credits = course.credits || 3;
      const marks = localMarks[course.id];
      totalCredits += credits;

      const hasValue =
        marks?.gradePoint !== undefined &&
        marks?.gradePoint !== null &&
        marks?.gradePoint !== '';

      if (hasValue && !isNaN(marks.gradePoint)) {
        const gpa = parseFloat(marks.gradePoint);
        if (gpa >= 2.0) {
          earnedCredits += credits;
          totalGradePoints += gpa * credits;
          passedCount++;
        } else {
          failedCount++;
        }
      } else {
        pendingCount++;
      }
    });

    const sgpa = earnedCredits > 0 ? totalGradePoints / earnedCredits : 0;
    const isComplete = pendingCount === 0;
    const allPassed = isComplete && failedCount === 0;

    return {
      totalCredits,
      earnedCredits,
      totalGradePoints,
      passedCount,
      failedCount,
      pendingCount,
      sgpa,
      isComplete,
      allPassed,
    };
  }, [coursesToDisplay, localMarks]);

  if (!student) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-12 text-center">
        <p className="text-gray-500">No student selected</p>
      </div>
    );
  }

  if (examCategory === 'supplementary' && coursesToDisplay.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-12 text-center">
        <Icons.CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No Failed Subjects
        </h3>
        <p className="text-gray-500 mb-4">
          This student has no failed subjects for supplementary examination.
        </p>
      </div>
    );
  }

  const getFailedCount = () => {
    if (!failedSubjectsData) return 0;
    return (
      failedSubjectsData.currentFailedCount ||
      failedSubjectsData.totalFailedInRegular ||
      failedSubjectsData.regularFailedSubjects?.length ||
      failedSubjectsData.remainingFailedSubjects?.length ||
      0
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      {/* Student Header */}
      <div
        className={`bg-gradient-to-r px-6 py-4 ${
          examCategory === 'supplementary'
            ? 'from-purple-600 to-indigo-600'
            : 'from-blue-600 to-indigo-600'
        }`}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-white">{student.name}</h3>
            <div className="flex items-center gap-4 mt-1">
              <span className="text-blue-100 text-sm">
                Roll No: {student.rollNo || student.rollNumber || 'N/A'}
              </span>
              <span className="text-blue-100 text-sm">
                Enrollment: {student.enrollmentNo || 'N/A'}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-white">
              {calculateSummary.sgpa.toFixed(2)}
            </div>
            <div className="text-blue-100 text-sm">Current SGPA</div>
          </div>
        </div>
      </div>

      {/* Exam Type Banner */}
      {examCategory === 'supplementary' && (
        <div className="px-6 py-3 bg-purple-50 border-b border-purple-200">
          <div className="flex items-center gap-2">
            <Icons.AlertCircle size={16} className="text-purple-600" />
            <span className="text-sm text-purple-800 font-medium">
              Supplementary Examination - Only showing failed subjects (
              {coursesToDisplay.length} subjects)
            </span>
            <button
              onClick={() => setShowRegularMarks(!showRegularMarks)}
              className="ml-auto text-xs text-purple-600 hover:text-purple-800 underline"
            >
              {showRegularMarks ? 'Hide' : 'Show'} Regular Exam Marks
            </button>
          </div>
        </div>
      )}

      {/* Failed Subjects Summary */}
      {examCategory === 'supplementary' && failedSubjectsData && (
        <div className="px-6 py-3 bg-orange-50 border-b border-orange-200">
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-700">
              <span className="font-medium">Failed in Regular:</span>{' '}
              <span className="text-red-600">{getFailedCount()} subjects</span>
            </span>
            {failedSubjectsData.passedInAttempt && (
              <span className="text-green-600">
                <Icons.CheckCircle size={14} className="inline mr-1" />
                Previously passed in Attempt{' '}
                {failedSubjectsData.passedInAttempt.attemptNumber}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-2">
            <Icons.BookOpen size={16} className="text-gray-500" />
            <span className="text-sm">
              <span className="text-gray-600">Courses:</span>{' '}
              <span className="font-medium">{coursesToDisplay.length}</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Icons.CheckCircle size={16} className="text-green-500" />
            <span className="text-sm">
              <span className="text-gray-600">Passed:</span>{' '}
              <span className="font-medium text-green-600">
                {calculateSummary.passedCount}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Icons.XCircle size={16} className="text-red-500" />
            <span className="text-sm">
              <span className="text-gray-600">Failed:</span>{' '}
              <span className="font-medium text-red-600">
                {calculateSummary.failedCount}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Icons.Clock size={16} className="text-yellow-500" />
            <span className="text-sm">
              <span className="text-gray-600">Pending:</span>{' '}
              <span className="font-medium text-yellow-600">
                {calculateSummary.pendingCount}
              </span>
            </span>
          </div>
          {calculateSummary.isComplete && (
            <div className="ml-auto">
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  calculateSummary.allPassed
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {calculateSummary.allPassed ? '✓ ALL PASSED' : '✗ HAS FAILURES'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Quick Fill Actions */}
      <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs text-gray-600">Quick Fill All:</span>
          <select
            onChange={(e) => {
              const value = e.target.value;
              if (value) {
                handleQuickFill(parseFloat(value));
                e.target.value = '';
              }
            }}
            className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">Select GPA for all...</option>
            {GRADE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <span className="text-gray-300">|</span>
          <button
            onClick={() => handleQuickFill(4.0)}
            className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
          >
            All A
          </button>
          <button
            onClick={() => handleQuickFill(3.0)}
            className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
          >
            All B
          </button>
          <button
            onClick={() => handleQuickFill(2.0)}
            className="px-3 py-1 text-xs bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"
          >
            All Pass
          </button>
          <button
            onClick={() => handleQuickFill(0.0)}
            className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
          >
            All Fail
          </button>
        </div>
      </div>

      {/* Grade Scale Reference */}
      <div className="px-6 py-2 bg-blue-50 border-b border-blue-200">
        <div className="flex items-center gap-4 text-xs flex-wrap">
          <span className="text-gray-600 font-medium">Grade Scale:</span>
          {GRADE_POINTS.map(({ grade, min, max, color }) => (
            <span key={grade} className="flex items-center gap-1">
              <span className={`px-2 py-0.5 rounded ${color}`}>{grade}</span>
              <span className="text-gray-500">
                {min.toFixed(2)}-{max.toFixed(2)}
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* Marks Entry Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                S.N.
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                Course Code
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                Course Name
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">
                Credits
              </th>
              {examCategory === 'supplementary' && showRegularMarks && (
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">
                  Regular GPA
                </th>
              )}
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">
                Grade
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                Remarks
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {coursesToDisplay.map((course, index) => {
              const marks = localMarks[course.id] || {};
              const { grade, isPass, color } = calculateGrade(marks.gradePoint);
              const regularMark = marks.regularGradePoint;
              const regularGrade = marks.regularGrade;

              const hasValue =
                marks.gradePoint !== undefined &&
                marks.gradePoint !== null &&
                marks.gradePoint !== '';

              let statusDisplay;
              if (hasValue && !isNaN(marks.gradePoint)) {
                statusDisplay = isPass ? 'pass' : 'fail';
              } else {
                statusDisplay = 'pending';
              }

              // Find the current GPA value for dropdown display
              const currentGPA = hasValue ? parseFloat(marks.gradePoint) : '';

              return (
                <tr
                  key={course.id}
                  className={`hover:bg-gray-50 ${
                    examCategory === 'supplementary' &&
                    regularMark !== undefined &&
                    regularMark < 2.0
                      ? 'bg-red-50/30'
                      : ''
                  }`}
                >
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {index + 1}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-mono font-medium text-gray-900">
                      {course.code}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-700">{course.name}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-sm text-gray-600">
                      {course.credits || 3}
                    </span>
                  </td>

                  {examCategory === 'supplementary' && showRegularMarks && (
                    <td className="px-4 py-3 text-center">
                      {regularMark !== undefined ? (
                        <div className="flex flex-col items-center">
                          <span
                            className={`text-sm font-medium ${
                              regularMark < 2.0
                                ? 'text-red-600'
                                : 'text-green-600'
                            }`}
                          >
                            {regularMark.toFixed(2)}
                          </span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded ${getGradeColor(
                              regularGrade
                            )}`}
                          >
                            {regularGrade || 'N/A'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                  )}

                  {/* Combined Dropdown and Grade Display */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <select
                        value={currentGPA}
                        onChange={(e) =>
                          handleGradePointChange(course.id, e.target.value)
                        }
                        className={`w-32 px-2 py-1.5 border rounded-lg text-xs focus:outline-none focus:ring-2 ${
                          statusDisplay === 'pass'
                            ? 'border-green-300 focus:ring-green-500 bg-green-50'
                            : statusDisplay === 'fail'
                            ? 'border-red-300 focus:ring-red-500 bg-red-50'
                            : 'border-gray-300 focus:ring-blue-500'
                        }`}
                      >
                        <option value="">Select Grade...</option>
                        {GRADE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      {grade && (
                        <span
                          className={`inline-flex px-2 py-1 rounded-lg text-xs font-medium ${
                            color || getGradeColor(grade)
                          }`}
                        >
                          {grade}
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="px-4 py-3 text-center">
                    {statusDisplay === 'pass' && (
                      <span className="inline-flex items-center gap-1 text-green-600">
                        <Icons.CheckCircle size={14} />
                        <span className="text-xs font-medium">Pass</span>
                      </span>
                    )}
                    {statusDisplay === 'fail' && (
                      <span className="inline-flex items-center gap-1 text-red-600">
                        <Icons.XCircle size={14} />
                        <span className="text-xs font-medium">Fail</span>
                      </span>
                    )}
                    {statusDisplay === 'pending' && (
                      <span className="inline-flex items-center gap-1 text-gray-400">
                        <Icons.Clock size={14} />
                        <span className="text-xs">Pending</span>
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={marks.remarks || ''}
                      onChange={(e) =>
                        handleRemarksChange(course.id, e.target.value)
                      }
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Optional"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Save Button */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
        <div className="text-sm text-gray-500">
          {hasChanges ? (
            <span className="flex items-center gap-1 text-yellow-600">
              <Icons.AlertCircle size={14} />
              You have unsaved changes
            </span>
          ) : (
            <span className="flex items-center gap-1 text-gray-400">
              <Icons.CheckCircle size={14} />
              All changes saved
            </span>
          )}
        </div>
        <button
          onClick={handleSaveClick}
          disabled={saving}
          className={`px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors ${
            hasChanges
              ? examCategory === 'supplementary'
                ? 'bg-purple-600 text-white hover:bg-purple-700'
                : 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {saving ? (
            <>
              <Icons.Loader2 size={18} className="animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Icons.Save size={18} />
              {hasChanges ? 'Save Changes' : 'Saved'}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
