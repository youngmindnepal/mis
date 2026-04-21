// components/exam/ReportCard.jsx
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

  const numGPA = parseFloat(gpa);
  for (const [threshold, grade] of Object.entries(GPA_GRADE_MAP).sort(
    (a, b) => b[0] - a[0]
  )) {
    if (numGPA >= parseFloat(threshold)) return grade;
  }
  return 'F';
};

const getDivision = (cgpa) => {
  if (cgpa >= 3.6) return { division: 'Distinction', color: 'text-yellow-600' };
  if (cgpa >= 3.0)
    return { division: 'First Division', color: 'text-blue-600' };
  if (cgpa >= 2.0)
    return { division: 'Second Division', color: 'text-green-600' };
  return { division: 'Fail', color: 'text-red-600' };
};

const getGradeColor = (grade) => {
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
};

export default function ReportCard({
  student,
  courses = [],
  marksData = {},
  semester,
  batchName,
  examName,
  examCategory,
  resultDate,
}) {
  const [showPrintView, setShowPrintView] = useState(false);

  const reportData = useMemo(() => {
    let totalCredits = 0;
    let earnedCredits = 0;
    let totalGradePoints = 0;
    const subjects = [];
    let hasFailed = false;
    let allGradesEntered = true;

    courses.forEach((course) => {
      const credits = course.credits || 3;
      const marks = marksData[course.id] || {};
      const gradePoint = marks.gradePoint;

      totalCredits += credits;

      if (
        gradePoint === '' ||
        gradePoint === null ||
        gradePoint === undefined
      ) {
        allGradesEntered = false;
        subjects.push({
          code: course.code,
          name: course.name,
          credits,
          gradePoint: null,
          grade: 'N/A',
          isPassed: false,
          status: 'pending',
        });
      } else {
        const gpaValue = parseFloat(gradePoint);
        const isPassed = gpaValue >= 2.0;
        const grade = getGradeFromGPA(gpaValue);

        if (!isPassed) hasFailed = true;

        if (isPassed) {
          earnedCredits += credits;
          totalGradePoints += gpaValue * credits;
        }

        subjects.push({
          code: course.code,
          name: course.name,
          credits,
          gradePoint: gpaValue,
          grade,
          isPassed,
          status: isPassed ? 'pass' : 'fail',
          remarks: marks.remarks || '',
        });
      }
    });

    const sgpa =
      !hasFailed && allGradesEntered && earnedCredits > 0
        ? totalGradePoints / earnedCredits
        : 0;

    const grade = getGradeFromGPA(sgpa);
    const division = getDivision(sgpa);
    const overallResult = hasFailed
      ? 'FAIL'
      : allGradesEntered
      ? 'PASS'
      : 'INCOMPLETE';

    return {
      totalCredits,
      earnedCredits,
      totalGradePoints,
      subjects,
      sgpa,
      grade,
      division: division.division,
      divisionColor: division.color,
      overallResult,
      allGradesEntered,
      hasFailed,
      passedCount: subjects.filter((s) => s.status === 'pass').length,
      failedCount: subjects.filter((s) => s.status === 'fail').length,
      pendingCount: subjects.filter((s) => s.status === 'pending').length,
    };
  }, [courses, marksData]);

  const handlePrint = () => {
    setShowPrintView(true);
    setTimeout(() => {
      window.print();
      setShowPrintView(false);
    }, 100);
  };

  const ReportCardContent = () => (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-8 rounded-t-xl">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">GRADE REPORT</h1>
          <p className="text-purple-100 text-lg">{examName}</p>
        </div>
      </div>

      {/* Student Info */}
      <div className="bg-white p-6 border-b">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Student Information
            </h2>
            <div className="space-y-2">
              <div className="flex">
                <span className="w-32 text-gray-600">Name:</span>
                <span className="font-medium text-gray-900">
                  {student.name}
                </span>
              </div>
              <div className="flex">
                <span className="w-32 text-gray-600">Roll No:</span>
                <span className="font-medium text-gray-900">
                  {student.rollNo || student.rollNumber || 'N/A'}
                </span>
              </div>
              <div className="flex">
                <span className="w-32 text-gray-600">Enrollment:</span>
                <span className="font-medium text-gray-900">
                  {student.enrollmentNo || 'N/A'}
                </span>
              </div>
              <div className="flex">
                <span className="w-32 text-gray-600">Batch:</span>
                <span className="font-medium text-gray-900">{batchName}</span>
              </div>
            </div>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Examination Details
            </h2>
            <div className="space-y-2">
              <div className="flex">
                <span className="w-32 text-gray-600">Semester:</span>
                <span className="font-medium text-gray-900">
                  {semester?.replace('semester', 'Semester ')}
                </span>
              </div>
              <div className="flex">
                <span className="w-32 text-gray-600">Category:</span>
                <span className="font-medium text-gray-900 capitalize">
                  {examCategory}
                </span>
              </div>
              <div className="flex">
                <span className="w-32 text-gray-600">Result Date:</span>
                <span className="font-medium text-gray-900">
                  {resultDate
                    ? new Date(resultDate).toLocaleDateString()
                    : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Results Summary */}
      <div className="bg-gray-50 p-6 border-b">
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-4 text-center shadow-sm">
            <p className="text-sm text-gray-600 mb-1">SGPA</p>
            <p className="text-3xl font-bold text-purple-600">
              {reportData.sgpa.toFixed(2)}
            </p>
          </div>
          <div className="bg-white rounded-lg p-4 text-center shadow-sm">
            <p className="text-sm text-gray-600 mb-1">Grade</p>
            <p className="text-3xl font-bold text-blue-600">
              {reportData.grade}
            </p>
          </div>
          <div className="bg-white rounded-lg p-4 text-center shadow-sm">
            <p className="text-sm text-gray-600 mb-1">Division</p>
            <p className={`text-xl font-bold ${reportData.divisionColor}`}>
              {reportData.division}
            </p>
          </div>
          <div className="bg-white rounded-lg p-4 text-center shadow-sm">
            <p className="text-sm text-gray-600 mb-1">Result</p>
            <p
              className={`text-xl font-bold ${
                reportData.overallResult === 'PASS'
                  ? 'text-green-600'
                  : reportData.overallResult === 'FAIL'
                  ? 'text-red-600'
                  : 'text-yellow-600'
              }`}
            >
              {reportData.overallResult}
            </p>
          </div>
        </div>
      </div>

      {/* Subject-wise Results */}
      <div className="bg-white p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          Subject-wise Performance
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100">
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
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">
                  GPA
                </th>
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
              {reportData.subjects.map((subject, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">{index + 1}</td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-mono font-medium">
                      {subject.code}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm">{subject.name}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-sm">{subject.credits}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`text-sm font-medium ${
                        subject.gradePoint !== null
                          ? subject.isPassed
                            ? 'text-green-600'
                            : 'text-red-600'
                          : 'text-gray-400'
                      }`}
                    >
                      {subject.gradePoint !== null
                        ? subject.gradePoint.toFixed(2)
                        : 'N/A'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex px-2 py-1 rounded text-xs font-medium ${getGradeColor(
                        subject.grade
                      )}`}
                    >
                      {subject.grade}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {subject.status === 'pass' && (
                      <span className="inline-flex items-center gap-1 text-green-600">
                        <Icons.CheckCircle size={14} />
                        <span className="text-xs">Pass</span>
                      </span>
                    )}
                    {subject.status === 'fail' && (
                      <span className="inline-flex items-center gap-1 text-red-600">
                        <Icons.XCircle size={14} />
                        <span className="text-xs">Fail</span>
                      </span>
                    )}
                    {subject.status === 'pending' && (
                      <span className="text-gray-400 text-xs">Pending</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-500">
                      {subject.remarks || '-'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 font-medium">
              <tr>
                <td colSpan="3" className="px-4 py-3 text-right text-sm">
                  Total:
                </td>
                <td className="px-4 py-3 text-center text-sm">
                  {reportData.totalCredits}
                </td>
                <td colSpan="4"></td>
              </tr>
              <tr>
                <td colSpan="3" className="px-4 py-3 text-right text-sm">
                  Earned Credits:
                </td>
                <td className="px-4 py-3 text-center text-sm text-green-600">
                  {reportData.earnedCredits}
                </td>
                <td colSpan="4"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-50 p-6 rounded-b-xl border-t">
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            <p>Generated on: {new Date().toLocaleDateString()}</p>
            <p className="mt-1">This is a system-generated report card</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">Authorized Signature</div>
            <div className="mt-8 border-t border-gray-400 pt-2">
              <p className="text-sm">Controller of Examinations</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-gray-100 min-h-screen py-8">
      <div className="max-w-5xl mx-auto">
        {/* Actions */}
        {!showPrintView && (
          <div className="mb-4 flex justify-end gap-3">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Icons.Printer size={18} />
              Print Report Card
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
            >
              <Icons.RefreshCw size={18} />
              Refresh
            </button>
          </div>
        )}

        <ReportCardContent />
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .max-w-5xl,
          .max-w-5xl * {
            visibility: visible;
          }
          .max-w-5xl {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          button {
            display: none !important;
          }
          .bg-gradient-to-r {
            background: #6b46c1 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .bg-gray-50 {
            background: #f9fafb !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
}
