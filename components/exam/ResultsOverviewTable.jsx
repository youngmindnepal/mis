// components/exam/ResultsOverviewTable.jsx
'use client';

import { useMemo, useState } from 'react';
import * as Icons from 'lucide-react';

const GPA_GRADE_MAP = {
  4.0: 'A',
  3.7: 'A-',
  3.3: 'B+',
  3.0: 'B',
  2.7: 'B-',
  2.3: 'C+',
  2.0: 'C',
  1.7: 'C-',
  1.3: 'D+',
  1.0: 'D',
  0.0: 'F',
};

const getGradeFromGPA = (gpa) => {
  if (gpa === null || gpa === undefined || isNaN(gpa)) return 'N/A';
  return GPA_GRADE_MAP[gpa] || 'N/A';
};

const getDivision = (cgpa) => {
  if (cgpa >= 3.6)
    return { division: 'Distinction', color: 'text-yellow-600 bg-yellow-100' };
  if (cgpa >= 3.0)
    return { division: 'First Division', color: 'text-blue-600 bg-blue-100' };
  if (cgpa >= 2.0)
    return {
      division: 'Second Division',
      color: 'text-green-600 bg-green-100',
    };
  return { division: 'Fail', color: 'text-red-600 bg-red-100' };
};
// Failed Subject Item with attempt details
const FailedSubjectItem = ({ subject, attemptInfo = null }) => {
  const [showDetails, setShowDetails] = useState(false);

  const getAttemptBadge = () => {
    if (!attemptInfo) return null;

    if (attemptInfo.type === 'regular') {
      return (
        <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded ml-1">
          Regular
        </span>
      );
    } else if (attemptInfo.type === 'supplementary') {
      return (
        <span className="text-[10px] bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded ml-1">
          Att {attemptInfo.attemptNumber}
        </span>
      );
    }
    return null;
  };
  // Helper function to get course codes
  const getCourseCodes = (subjects, maxLength = 30) => {
    if (!subjects || subjects.length === 0) return '';

    const codes = subjects.map((s) => s.code || s.courseCode).filter(Boolean);
    const joined = codes.join(', ');

    if (joined.length > maxLength) {
      return joined.substring(0, maxLength) + '...';
    }
    return joined;
  };
  // Get the course code safely
  const courseCode = subject.code || subject.courseCode || 'N/A';
  const courseName = subject.name || subject.courseName || 'Unknown Course';
  const gpa = subject.gpa ?? subject.gradePoint;

  return (
    <div className="relative">
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="text-xs text-red-600 hover:text-red-800 hover:underline cursor-pointer flex items-center gap-1"
      >
        <span className="font-mono font-medium">{courseCode}</span>
        <span className="text-red-500">({gpa?.toFixed(1) || 'N/A'})</span>
        {getAttemptBadge()}
      </button>

      {showDetails && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowDetails(false)}
          />
          <div className="absolute z-50 left-0 mt-2 w-72 bg-white rounded-lg shadow-xl border border-gray-200 p-4">
            <div className="flex items-start justify-between mb-2">
              <span className="text-sm font-bold text-gray-900">
                {courseCode}
              </span>
              <span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded">
                Failed
              </span>
            </div>
            <p className="text-sm text-gray-700 mb-3">{courseName}</p>
            <div className="space-y-1 text-xs text-gray-500 border-t pt-2">
              <div>GPA: {gpa?.toFixed(1) || 'N/A'}</div>
              <div>Credits: {subject.credits || 3}</div>
              {attemptInfo && (
                <div>
                  Failed in:{' '}
                  {attemptInfo.type === 'regular'
                    ? 'Regular Exam'
                    : `Supplementary Attempt ${attemptInfo.attemptNumber}`}
                </div>
              )}
              {attemptInfo?.resultDate && (
                <div>
                  Date: {new Date(attemptInfo.resultDate).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// Dynamic Attempts Column Component
// components/exam/ResultsOverviewTable.jsx - Updated AttemptsColumn

// Dynamic Attempts Column Component
const AttemptsColumn = ({ student, onViewDetails }) => {
  const attempts = student.supplementaryAttempts || [];
  const regularFailed = student.regularFailedSubjects || [];

  if (attempts.length === 0 && regularFailed.length === 0) {
    return <span className="text-xs text-gray-400">-</span>;
  }

  // Get failed course codes for display
  const getFailedCodes = (subjects) => {
    if (!subjects || subjects.length === 0) return '';
    return subjects.map((s) => s.code || s.courseCode).join(', ');
  };

  return (
    <div className="space-y-1.5">
      {/* Regular Exam Status */}
      {regularFailed.length > 0 && (
        <div className="flex items-start gap-1.5">
          <div className="w-2 h-2 rounded-full bg-gray-400 mt-1.5 flex-shrink-0"></div>
          <div className="flex-1">
            <span className="text-xs">
              <span className="font-medium">Regular:</span>{' '}
              <span className="text-red-600">
                Failed {regularFailed.length}
              </span>
            </span>
            <div className="text-[10px] text-gray-500 mt-0.5">
              {getFailedCodes(regularFailed)}
            </div>
          </div>
        </div>
      )}

      {/* Supplementary Attempts */}
      {attempts.map((attempt, idx) => (
        <button
          key={attempt.attemptNumber}
          onClick={() => onViewDetails(student, attempt)}
          className="flex items-start gap-1.5 w-full hover:bg-gray-50 rounded px-1 py-0.5 transition-colors group"
        >
          <div
            className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
              attempt.status === 'PASS' ? 'bg-green-500' : 'bg-red-500'
            }`}
          ></div>
          <div className="flex-1 text-left">
            <div className="flex items-center gap-1">
              <span className="text-xs">
                <span className="font-medium">
                  Att {attempt.attemptNumber}:
                </span>{' '}
                <span
                  className={
                    attempt.status === 'PASS'
                      ? 'text-green-600'
                      : 'text-red-600'
                  }
                >
                  {attempt.status}
                </span>
                {attempt.sgpa > 0 && (
                  <span className="text-gray-500 ml-1">
                    ({attempt.sgpa.toFixed(2)})
                  </span>
                )}
              </span>
              <Icons.ChevronRight
                size={10}
                className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"
              />
            </div>
            {/* Show failed subjects for this attempt */}
            {attempt.status === 'FAIL' &&
              attempt.failedSubjects &&
              attempt.failedSubjects.length > 0 && (
                <div className="text-[10px] text-red-500 mt-0.5">
                  Failed: {getFailedCodes(attempt.failedSubjects)}
                </div>
              )}
            {/* Show passed count if any */}
            {attempt.passedSubjects && attempt.passedSubjects.length > 0 && (
              <div className="text-[10px] text-green-600 mt-0.5">
                Passed: {attempt.passedSubjects.length} subject
                {attempt.passedSubjects.length > 1 ? 's' : ''}
              </div>
            )}
          </div>
        </button>
      ))}
    </div>
  );
};

export default function ResultsOverviewTable({
  students = [],
  courses = [],
  marksData = {},
  batchName,
  semester,
  examCategory,
  resultDate,
  supplementaryAttemptsData = {},
  failedStudentsData = {},
  onViewSupplementaryResult,
}) {
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedAttempt, setSelectedAttempt] = useState(null);

  // Process student results with comprehensive tracking
  const studentResults = useMemo(() => {
    return students.map((student) => {
      const studentMarks = marksData[student.id] || {};
      let totalCredits = 0,
        earnedCredits = 0,
        totalGradePoints = 0;
      const regularFailedSubjects = [];
      const regularPassedSubjects = [];

      // Process regular exam results
      courses.forEach((course) => {
        const creditHours = course.credits || 3;
        const gradePoint = studentMarks[course.id]?.gradePoint;
        totalCredits += creditHours;

        if (
          gradePoint !== null &&
          gradePoint !== undefined &&
          gradePoint !== ''
        ) {
          const gpaValue = parseFloat(gradePoint);
          const subjectInfo = {
            id: course.id,
            code: course.code,
            name: course.name,
            gpa: gpaValue,
            courseCode: course.code,
            courseName: course.name,
            credits: creditHours,
          };

          if (gpaValue < 2.0) {
            regularFailedSubjects.push(subjectInfo);
          } else {
            earnedCredits += creditHours;
            totalGradePoints += gpaValue * creditHours;
            regularPassedSubjects.push(subjectInfo);
          }
        }
      });

      const sgpa =
        regularFailedSubjects.length === 0 && earnedCredits > 0
          ? totalGradePoints / earnedCredits
          : 0;

      // Get supplementary attempts
      const studentAttempts =
        supplementaryAttemptsData[student.id.toString()] || [];

      // Determine overall status
      let overallStatus = 'PASS_REGULAR';
      let statusDescription = 'Passed Regular';
      let statusColor = 'bg-green-100 text-green-800';

      if (regularFailedSubjects.length > 0) {
        const passedAttempt = studentAttempts.find((a) => a.status === 'PASS');

        if (passedAttempt) {
          overallStatus = 'PASS_SUPPLEMENTARY';
          statusDescription = `Passed in Attempt ${passedAttempt.attemptNumber}`;
          statusColor = 'bg-emerald-100 text-emerald-800';
        } else if (studentAttempts.length > 0) {
          overallStatus = 'FAIL_ALL_ATTEMPTS';
          statusDescription = `Failed ${studentAttempts.length} attempt${
            studentAttempts.length > 1 ? 's' : ''
          }`;
          statusColor = 'bg-red-100 text-red-800';
        } else {
          overallStatus = 'FAIL_NEEDS_SUPPLEMENTARY';
          statusDescription = 'Failed - Needs Supplementary';
          statusColor = 'bg-yellow-100 text-yellow-800';
        }
      }

      return {
        ...student,
        sgpa,
        grade: getGradeFromGPA(sgpa),
        division: getDivision(sgpa),
        regularFailedSubjects,
        regularPassedSubjects,
        supplementaryAttempts: studentAttempts,
        overallStatus,
        statusDescription,
        statusColor,
        totalAttempts: studentAttempts.length,
        latestAttempt: studentAttempts[0],
        passedInAttempt: studentAttempts.find((a) => a.status === 'PASS'),
      };
    });
  }, [students, courses, marksData, supplementaryAttemptsData]);

  // Calculate summary
  const summary = useMemo(() => {
    const total = studentResults.length;
    const passedRegular = studentResults.filter(
      (s) => s.overallStatus === 'PASS_REGULAR'
    ).length;
    const passedSupplementary = studentResults.filter(
      (s) => s.overallStatus === 'PASS_SUPPLEMENTARY'
    ).length;
    const needsSupplementary = studentResults.filter(
      (s) => s.overallStatus === 'FAIL_NEEDS_SUPPLEMENTARY'
    ).length;
    const failedAll = studentResults.filter(
      (s) => s.overallStatus === 'FAIL_ALL_ATTEMPTS'
    ).length;

    // Attempt distribution
    const attemptCounts = {};
    studentResults.forEach((s) => {
      const count = s.supplementaryAttempts.length;
      attemptCounts[count] = (attemptCounts[count] || 0) + 1;
    });

    return {
      total,
      passedRegular,
      passedSupplementary,
      needsSupplementary,
      failedAll,
      totalPassed: passedRegular + passedSupplementary,
      attemptDistribution: attemptCounts,
    };
  }, [studentResults]);

  const handleViewAttemptDetails = (student, attempt) => {
    setSelectedStudent(student);
    setSelectedAttempt(attempt);
    setShowDetailsModal(true);
  };

  if (students.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-12 text-center">
        <p className="text-gray-500">No students found</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">
                Results Overview
              </h2>
              <p className="text-blue-100 text-sm mt-1">
                {batchName} | {semester?.replace('semester', 'Semester ')} |{' '}
                {examCategory}
              </p>
            </div>
            {resultDate && (
              <div className="bg-white/20 px-4 py-2 rounded-lg">
                <span className="text-white text-sm">
                  Result Date: {new Date(resultDate).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Statistics */}
        <div className="px-6 py-4 bg-gray-50 border-b">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <div className="bg-white rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500">Total</p>
              <p className="text-xl font-bold">{summary.total}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <p className="text-xs text-green-600">Regular Pass</p>
              <p className="text-xl font-bold text-green-700">
                {summary.passedRegular}
              </p>
            </div>
            <div className="bg-emerald-50 rounded-lg p-3 text-center">
              <p className="text-xs text-emerald-600">Supp. Pass</p>
              <p className="text-xl font-bold text-emerald-700">
                {summary.passedSupplementary}
              </p>
            </div>
            <div className="bg-yellow-50 rounded-lg p-3 text-center">
              <p className="text-xs text-yellow-600">Needs Supp.</p>
              <p className="text-xl font-bold text-yellow-700">
                {summary.needsSupplementary}
              </p>
            </div>
            <div className="bg-red-50 rounded-lg p-3 text-center">
              <p className="text-xs text-red-600">Failed All</p>
              <p className="text-xl font-bold text-red-700">
                {summary.failedAll}
              </p>
            </div>
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <p className="text-xs text-blue-600">Pass Rate</p>
              <p className="text-xl font-bold text-blue-700">
                {((summary.totalPassed / summary.total) * 100).toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Attempt Distribution */}
          {Object.keys(summary.attemptDistribution).length > 0 && (
            <div className="mt-3 flex gap-4 text-xs">
              {Object.entries(summary.attemptDistribution).map(
                ([attempts, count]) =>
                  attempts > 0 && (
                    <span key={attempts} className="text-gray-600">
                      <Icons.Repeat size={12} className="inline mr-1" />
                      {attempts} attempt{attempts > 1 ? 's' : ''}: {count}{' '}
                      student{count > 1 ? 's' : ''}
                    </span>
                  )
              )}
            </div>
          )}
        </div>

        {/* Results Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                  S.N.
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                  Roll No
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                  Student Name
                </th>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-600 uppercase">
                  SGPA
                </th>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-600 uppercase">
                  Status
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                  Failed Subjects
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                  Attempt History
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {studentResults.map((student, index) => (
                <tr
                  key={student.id}
                  className={`hover:bg-gray-50 ${
                    student.overallStatus === 'FAIL_NEEDS_SUPPLEMENTARY'
                      ? 'bg-yellow-50/30'
                      : student.overallStatus === 'FAIL_ALL_ATTEMPTS'
                      ? 'bg-red-50/30'
                      : student.overallStatus === 'PASS_SUPPLEMENTARY'
                      ? 'bg-emerald-50/30'
                      : student.overallStatus === 'PASS_REGULAR'
                      ? 'bg-green-50/30'
                      : ''
                  }`}
                >
                  <td className="px-3 py-3 text-sm">{index + 1}</td>
                  <td className="px-3 py-3 text-sm font-medium">
                    {student.rollNo || student.rollNumber || 'N/A'}
                  </td>
                  <td className="px-3 py-3 text-sm">{student.name}</td>
                  <td className="px-3 py-3 text-center">
                    {student.overallStatus === 'PASS_REGULAR' ? (
                      <span className="text-sm font-bold text-green-600">
                        {student.sgpa.toFixed(2)}
                      </span>
                    ) : student.overallStatus === 'PASS_SUPPLEMENTARY' &&
                      student.passedInAttempt ? (
                      <span className="text-sm font-bold text-emerald-600">
                        {student.passedInAttempt.sgpa.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${student.statusColor}`}
                    >
                      {student.statusDescription}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    {student.regularFailedSubjects.length > 0 ? (
                      <div className="space-y-1">
                        {student.regularFailedSubjects.map((subject, i) => (
                          <FailedSubjectItem
                            key={i}
                            subject={subject}
                            attemptInfo={{
                              type: 'regular',
                              resultDate: resultDate,
                            }}
                          />
                        ))}
                      </div>
                    ) : student.overallStatus === 'PASS_REGULAR' ||
                      student.overallStatus === 'PASS_SUPPLEMENTARY' ? (
                      <span className="text-xs text-green-600 flex items-center gap-1">
                        <Icons.CheckCircle size={12} /> All Passed
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <AttemptsColumn
                      student={student}
                      onViewDetails={handleViewAttemptDetails}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Attempt Details Modal */}
      {showDetailsModal && selectedStudent && selectedAttempt && (
        <AttemptDetailsModal
          student={selectedStudent}
          attempt={selectedAttempt}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedAttempt(null);
          }}
          onViewFullResult={() => {
            if (onViewSupplementaryResult) {
              onViewSupplementaryResult(selectedStudent, selectedAttempt);
            }
            setShowDetailsModal(false);
          }}
        />
      )}
    </>
  );
}

// Attempt Details Modal Component
const AttemptDetailsModal = ({
  student,
  attempt,
  onClose,
  onViewFullResult,
}) => {
  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                Attempt {attempt.attemptNumber} Details
              </h3>
              <p className="text-sm text-gray-600">
                {student.name} ({student.rollNo || 'N/A'})
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <Icons.X size={20} />
            </button>
          </div>

          <div className="p-6 overflow-y-auto max-h-[60vh]">
            {/* Status Banner */}
            <div
              className={`mb-4 p-3 rounded-lg ${
                attempt.status === 'PASS'
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {attempt.status === 'PASS' ? (
                    <Icons.CheckCircle className="text-green-600" size={20} />
                  ) : (
                    <Icons.XCircle className="text-red-600" size={20} />
                  )}
                  <span
                    className={`font-semibold ${
                      attempt.status === 'PASS'
                        ? 'text-green-800'
                        : 'text-red-800'
                    }`}
                  >
                    {attempt.status === 'PASS' ? 'PASSED' : 'FAILED'}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">SGPA</p>
                  <p className="text-xl font-bold">{attempt.sgpa.toFixed(2)}</p>
                </div>
              </div>
              {attempt.resultDate && (
                <p className="text-xs text-gray-500 mt-2">
                  Result Date:{' '}
                  {new Date(attempt.resultDate).toLocaleDateString()}
                </p>
              )}
            </div>

            {/* Failed Subjects */}
            {attempt.failedSubjects.length > 0 && (
              <div className="mb-4">
                <h4 className="font-medium text-red-800 mb-2 flex items-center gap-2">
                  <Icons.XCircle size={16} />
                  Failed Subjects ({attempt.failedSubjects.length})
                </h4>
                <div className="space-y-2">
                  {attempt.failedSubjects.map((subject, i) => (
                    <div
                      key={i}
                      className="bg-red-50 rounded-lg p-3 border border-red-200"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-sm">{subject.code}</p>
                          <p className="text-xs text-gray-600">
                            {subject.name}
                          </p>
                        </div>
                        <span className="text-sm font-bold text-red-600">
                          {subject.gpa?.toFixed(1) || 'N/A'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Passed Subjects */}
            {attempt.passedSubjects.length > 0 && (
              <div>
                <h4 className="font-medium text-green-800 mb-2 flex items-center gap-2">
                  <Icons.CheckCircle size={16} />
                  Passed Subjects ({attempt.passedSubjects.length})
                </h4>
                <div className="space-y-2">
                  {attempt.passedSubjects.map((subject, i) => (
                    <div
                      key={i}
                      className="bg-green-50 rounded-lg p-3 border border-green-200"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-sm">{subject.code}</p>
                          <p className="text-xs text-gray-600">
                            {subject.name}
                          </p>
                        </div>
                        <span className="text-sm font-bold text-green-600">
                          {subject.gpa?.toFixed(1) || 'N/A'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="px-6 py-4 border-t bg-gray-50 flex justify-between">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Close
            </button>
            <button
              onClick={onViewFullResult}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Icons.ExternalLink size={16} />
              View Full Result
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
