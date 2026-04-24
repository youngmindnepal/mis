// components/exam/SemesterWiseReport.jsx
'use client';

import { useMemo, useState, useEffect } from 'react';
import * as Icons from 'lucide-react';

const SEMESTERS = [
  'semester1',
  'semester2',
  'semester3',
  'semester4',
  'semester5',
  'semester6',
  'semester7',
  'semester8',
];

const getSemesterDisplay = (semester) => {
  const num = semester.replace('semester', '');
  return `Sem ${num}`;
};

const getGradeFromGPA = (gpa) => {
  if (gpa === null || gpa === undefined || isNaN(gpa) || gpa <= 0) return 'N/A';
  if (gpa >= 3.71) return 'A';
  if (gpa >= 3.31) return 'A-';
  if (gpa >= 3.01) return 'B+';
  if (gpa >= 2.71) return 'B';
  if (gpa >= 2.31) return 'B-';
  if (gpa >= 2.01) return 'C+';
  return 'F';
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

// Failed Courses with Supplementary Attempts Display
const SemesterCoursesDisplay = ({
  semesterData,
  semester,
  supplementaryAttempts,
}) => {
  const [showDetails, setShowDetails] = useState(false);

  if (!semesterData.hasResults) {
    return <span className="text-gray-400 text-sm">-</span>;
  }

  const { failedCourses, passedCourses, sgpa, grade, hasFailed } = semesterData;

  // Get supplementary attempts for failed courses in this semester
  const getSupplementaryForCourse = (courseCode) => {
    if (!supplementaryAttempts || supplementaryAttempts.length === 0) return [];

    return supplementaryAttempts
      .filter((attempt) => {
        return (
          attempt.courses?.some((c) => c.code === courseCode) ||
          attempt.failedCourses?.some((c) => c.code === courseCode) ||
          attempt.passedCourses?.some((c) => c.code === courseCode)
        );
      })
      .map((attempt) => ({
        attemptNumber: attempt.attemptNumber,
        status: attempt.status,
        sgpa: attempt.sgpa,
        resultDate: attempt.resultDate,
        courseResult:
          attempt.courses?.find((c) => c.code === courseCode) ||
          attempt.failedCourses?.find((c) => c.code === courseCode) ||
          attempt.passedCourses?.find((c) => c.code === courseCode),
      }));
  };

  return (
    <div className="text-left">
      {/* SGPA Display */}
      {!hasFailed && sgpa > 0 ? (
        <div className="flex items-center justify-center gap-1 mb-1">
          <span className="text-sm font-bold text-green-600">
            {sgpa.toFixed(2)}
          </span>
          <span className="text-xs text-gray-500">({grade})</span>
        </div>
      ) : hasFailed ? (
        <div className="text-xs text-red-600 font-medium mb-1">Failed</div>
      ) : null}

      {/* Failed Courses List */}
      {failedCourses.length > 0 && (
        <div className="space-y-2">
          {failedCourses.map((course, idx) => {
            const suppAttempts = getSupplementaryForCourse(course.code);

            return (
              <div
                key={idx}
                className="border border-red-200 rounded-lg p-2 bg-red-50"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-medium text-xs text-gray-900">
                    {course.code}
                  </span>
                  <span className="text-red-600 text-xs font-bold">
                    {course.gradePoint?.toFixed(1) || 'N/A'}
                  </span>
                </div>
                <p className="text-gray-600 text-[10px] truncate">
                  {course.name}
                </p>

                {/* Supplementary Attempts for this course */}
                {suppAttempts.length > 0 && (
                  <div className="mt-2 pt-1 border-t border-red-200">
                    <p className="text-[10px] font-medium text-purple-700 mb-1">
                      Supp. Attempts:
                    </p>
                    {suppAttempts.map((att, i) => (
                      <div
                        key={i}
                        className={`text-[10px] p-1 rounded mb-1 ${
                          att.courseResult?.isPassed
                            ? 'bg-green-100'
                            : 'bg-orange-100'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">
                            Att {att.attemptNumber}:
                            <span
                              className={
                                att.courseResult?.isPassed
                                  ? 'text-green-600'
                                  : 'text-red-600'
                              }
                            >
                              {' '}
                              {att.courseResult?.gradePoint?.toFixed(1) ||
                                'N/A'}
                            </span>
                          </span>
                          <span
                            className={
                              att.courseResult?.isPassed
                                ? 'text-green-600'
                                : 'text-red-600'
                            }
                          >
                            {att.courseResult?.isPassed ? '✓ Pass' : '✗ Fail'}
                          </span>
                        </div>
                        {att.resultDate && (
                          <p className="text-gray-500 text-[8px]">
                            {new Date(att.resultDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Passed Courses Summary */}
      {passedCourses.length > 0 && !hasFailed && (
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-[10px] text-green-600 hover:underline mt-1"
        >
          {passedCourses.length} passed {showDetails ? '▲' : '▼'}
        </button>
      )}

      {showDetails && passedCourses.length > 0 && (
        <div className="mt-1 space-y-1">
          {passedCourses.map((course, idx) => (
            <div
              key={idx}
              className="text-[10px] border border-green-200 rounded p-1 bg-green-50"
            >
              <div className="flex justify-between">
                <span className="font-mono">{course.code}</span>
                <span className="text-green-600">
                  {course.gradePoint?.toFixed(1)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default function SemesterWiseReport({
  students = [],
  allSemesterData = {},
  batchName,
  departmentName,
}) {
  const [selectedSemester, setSelectedSemester] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  useEffect(() => {
    console.log('=== SemesterWiseReport LOADED ===');
    console.log('Students:', students.length);

    const studentsWithSupp = Object.values(allSemesterData).filter(
      (d) => d?.supplementaryAttempts && d.supplementaryAttempts.length > 0
    ).length;
    console.log(`Students with supplementary attempts: ${studentsWithSupp}`);
  }, [students, allSemesterData]);

  // Process student data
  const processedStudents = useMemo(() => {
    return students.map((student) => {
      const studentData = allSemesterData[student.id] || {};
      const semesters = studentData.semesters || {};
      const supplementaryAttempts = studentData.supplementaryAttempts || [];

      let totalEarnedCredits = 0;
      let totalGradePoints = 0;
      let completedSemesters = 0;
      let allSemestersPassed = true;
      let totalFailedSubjects = 0;

      const semesterDetails = {};

      SEMESTERS.forEach((semester) => {
        const semData = semesters[semester];

        if (semData && semData.courses && semData.courses.length > 0) {
          const failedCourses = semData.failedCourses || [];
          const passedCourses = semData.passedCourses || [];
          const hasFailed = failedCourses.length > 0;
          const sgpa = semData.sgpa || 0;

          semesterDetails[semester] = {
            sgpa: sgpa,
            grade: !hasFailed && sgpa > 0 ? getGradeFromGPA(sgpa) : null,
            totalCredits: semData.totalCredits || 0,
            earnedCredits: semData.earnedCredits || 0,
            failedCourses: failedCourses,
            passedCourses: passedCourses,
            courses: semData.courses || [],
            hasResults: true,
            hasFailed: hasFailed,
            resultDate: semData.resultDate,
          };

          totalFailedSubjects += failedCourses.length;

          if (!hasFailed && sgpa > 0) {
            totalEarnedCredits += semData.earnedCredits || 0;
            totalGradePoints += sgpa * (semData.earnedCredits || 0);
            completedSemesters++;
          } else if (hasFailed) {
            allSemestersPassed = false;
          }
        } else {
          semesterDetails[semester] = {
            sgpa: null,
            grade: null,
            totalCredits: 0,
            earnedCredits: 0,
            failedCourses: [],
            passedCourses: [],
            courses: [],
            hasResults: false,
            hasFailed: false,
            resultDate: null,
          };
        }
      });

      const cgpa =
        studentData.cgpa ||
        (allSemestersPassed && totalEarnedCredits > 0
          ? totalGradePoints / totalEarnedCredits
          : 0);

      const division =
        cgpa > 0
          ? getDivision(cgpa)
          : { division: 'N/A', color: 'text-gray-400' };

      return {
        ...student,
        semesterDetails,
        supplementaryAttempts,
        cgpa,
        cgpaGrade: cgpa > 0 ? getGradeFromGPA(cgpa) : 'N/A',
        division: division.division,
        divisionColor: division.color,
        completedSemesters,
        totalFailedSubjects,
        allSemestersPassed,
        hasSupplementary: supplementaryAttempts.length > 0,
      };
    });
  }, [students, allSemesterData]);

  // Filter and sort
  const filteredAndSortedStudents = useMemo(() => {
    let filtered = processedStudents.filter((student) => {
      if (!searchTerm) return true;
      const searchLower = searchTerm.toLowerCase();
      return (
        student.name?.toLowerCase().includes(searchLower) ||
        student.rollNo?.toLowerCase().includes(searchLower) ||
        student.enrollmentNo?.toLowerCase().includes(searchLower)
      );
    });

    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = (a.name || '').localeCompare(b.name || '');
          break;
        case 'rollNo':
          comparison = (a.rollNo || '').localeCompare(b.rollNo || '');
          break;
        case 'cgpa':
          comparison = (b.cgpa || 0) - (a.cgpa || 0);
          break;
        case 'failedCount':
          comparison =
            (a.totalFailedSubjects || 0) - (b.totalFailedSubjects || 0);
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [processedStudents, searchTerm, sortBy, sortOrder]);

  const visibleSemesters = useMemo(() => {
    return selectedSemester === 'all' ? SEMESTERS : [selectedSemester];
  }, [selectedSemester]);

  // Summary stats
  const summary = useMemo(() => {
    const total = filteredAndSortedStudents.length;
    const withCGPA = filteredAndSortedStudents.filter((s) => s.cgpa > 0).length;
    const avgCGPA =
      withCGPA > 0
        ? filteredAndSortedStudents.reduce((sum, s) => sum + s.cgpa, 0) /
          withCGPA
        : 0;
    const passedAll = filteredAndSortedStudents.filter(
      (s) => s.totalFailedSubjects === 0 && s.completedSemesters > 0
    ).length;
    const totalFailedSubjects = filteredAndSortedStudents.reduce(
      (sum, s) => sum + s.totalFailedSubjects,
      0
    );
    const withSupplementary = filteredAndSortedStudents.filter(
      (s) => s.hasSupplementary
    ).length;

    return {
      total,
      withCGPA,
      avgCGPA,
      passedAll,
      totalFailedSubjects,
      withSupplementary,
    };
  }, [filteredAndSortedStudents]);

  if (students.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-12 text-center">
        <Icons.Users size={48} className="mx-auto text-gray-300 mb-4" />
        <p className="text-gray-500">No students found in this batch</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">
              Semester-wise Academic Report
            </h2>
            <p className="text-indigo-100 text-sm mt-1">
              {departmentName || 'All Departments'} |{' '}
              {batchName || 'All Batches'}
            </p>
          </div>
          <div className="bg-white/20 px-4 py-2 rounded-lg">
            <span className="text-white text-sm">
              Generated: {new Date().toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="px-6 py-4 bg-gray-50 border-b">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <div className="bg-white rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500">Total Students</p>
            <p className="text-xl font-bold">{summary.total}</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <p className="text-xs text-blue-600">Avg CGPA</p>
            <p className="text-xl font-bold text-blue-700">
              {summary.avgCGPA.toFixed(2)}
            </p>
          </div>
          <div className="bg-emerald-50 rounded-lg p-3 text-center">
            <p className="text-xs text-emerald-600">All Passed</p>
            <p className="text-xl font-bold text-emerald-700">
              {summary.passedAll}
            </p>
          </div>
          <div className="bg-red-50 rounded-lg p-3 text-center">
            <p className="text-xs text-red-600">Failed Subjects</p>
            <p className="text-xl font-bold text-red-700">
              {summary.totalFailedSubjects}
            </p>
          </div>
          <div className="bg-purple-50 rounded-lg p-3 text-center">
            <p className="text-xs text-purple-600">Supplementary</p>
            <p className="text-xl font-bold text-purple-700">
              {summary.withSupplementary}
            </p>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <p className="text-xs text-green-600">Pass Rate</p>
            <p className="text-xl font-bold text-green-700">
              {summary.total > 0
                ? ((summary.passedAll / summary.total) * 100).toFixed(1)
                : 0}
              %
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-3 bg-white border-b flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Icons.Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={14}
            />
            <input
              type="text"
              placeholder="Search by name, roll no..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-1.5 text-sm border border-gray-300 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <select
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Semesters</option>
            {SEMESTERS.map((sem) => (
              <option key={sem} value={sem}>
                {getSemesterDisplay(sem)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg"
          >
            <option value="name">Sort by Name</option>
            <option value="rollNo">Sort by Roll No</option>
            <option value="cgpa">Sort by CGPA</option>
            <option value="failedCount">Sort by Failed Count</option>
          </select>
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="p-1.5 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            {sortOrder === 'asc' ? (
              <Icons.ArrowUp size={16} />
            ) : (
              <Icons.ArrowDown size={16} />
            )}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-600 uppercase sticky left-0 bg-gray-100 z-10">
                S.N.
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-600 uppercase sticky left-12 bg-gray-100 z-10 min-w-[100px]">
                Roll No
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-600 uppercase sticky left-32 bg-gray-100 z-10 min-w-[160px]">
                Student Name
              </th>

              {visibleSemesters.map((sem) => (
                <th
                  key={sem}
                  className="px-3 py-3 text-left text-xs font-medium text-gray-600 uppercase min-w-[280px]"
                >
                  {getSemesterDisplay(sem)}
                </th>
              ))}

              <th className="px-3 py-3 text-center text-xs font-medium text-gray-600 uppercase bg-indigo-50 min-w-[100px]">
                CGPA
              </th>
              <th className="px-3 py-3 text-center text-xs font-medium text-gray-600 uppercase min-w-[80px]">
                Failed
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredAndSortedStudents.length === 0 ? (
              <tr>
                <td
                  colSpan={5 + visibleSemesters.length}
                  className="px-3 py-12 text-center text-gray-500"
                >
                  No students found
                </td>
              </tr>
            ) : (
              filteredAndSortedStudents.map((student, index) => (
                <tr key={student.id} className="hover:bg-gray-50">
                  <td className="px-3 py-3 text-sm sticky left-0 bg-white align-top">
                    {index + 1}
                  </td>
                  <td className="px-3 py-3 text-sm font-medium sticky left-12 bg-white align-top">
                    {student.rollNo || 'N/A'}
                  </td>
                  <td className="px-3 py-3 text-sm sticky left-32 bg-white align-top">
                    <span className="font-medium">{student.name}</span>
                    <p className="text-xs text-gray-500">
                      {student.enrollmentNo}
                    </p>
                  </td>

                  {visibleSemesters.map((semester) => (
                    <td key={semester} className="px-3 py-3 align-top">
                      <SemesterCoursesDisplay
                        semesterData={student.semesterDetails[semester]}
                        semester={semester}
                        supplementaryAttempts={student.supplementaryAttempts}
                      />
                    </td>
                  ))}

                  {/* CGPA */}
                  <td className="px-3 py-3 text-center bg-indigo-50/30 align-top">
                    {student.cgpa > 0 ? (
                      <div>
                        <span
                          className={`text-lg font-bold ${
                            student.cgpa >= 3.6
                              ? 'text-yellow-600'
                              : student.cgpa >= 3.0
                              ? 'text-blue-600'
                              : 'text-green-600'
                          }`}
                        >
                          {student.cgpa.toFixed(2)}
                        </span>
                        <p className="text-xs text-gray-500">
                          ({student.cgpaGrade})
                        </p>
                      </div>
                    ) : student.totalFailedSubjects > 0 ? (
                      <span className="text-red-600 text-xs">Has Failures</span>
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </td>

                  {/* Total Failed */}
                  <td className="px-3 py-3 text-center align-top">
                    {student.totalFailedSubjects > 0 ? (
                      <span className="text-sm font-medium text-red-600">
                        {student.totalFailedSubjects}
                      </span>
                    ) : student.completedSemesters > 0 ? (
                      <Icons.CheckCircle
                        size={16}
                        className="text-green-600 inline"
                      />
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-6 py-3 bg-gray-50 border-t text-xs text-gray-600">
        <div className="flex justify-between items-center">
          <span>
            Showing {filteredAndSortedStudents.length} of {students.length}{' '}
            students
          </span>
          <span>
            * Failed courses show supplementary attempts with attempt number,
            grade, and status.
          </span>
        </div>
      </div>
    </div>
  );
}
