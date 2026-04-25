// components/exam/ResultEntryModal.jsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';

// GPA Grading System based on Percentage
const GRADE_SYSTEM = [
  {
    min: 90,
    max: 100,
    grade: 'A+',
    gpa: 4.0,
    color: 'bg-green-100 text-green-800 border-green-300',
  },
  {
    min: 80,
    max: 89,
    grade: 'A',
    gpa: 3.6,
    color: 'bg-green-50 text-green-700 border-green-200',
  },
  {
    min: 70,
    max: 79,
    grade: 'B+',
    gpa: 3.2,
    color: 'bg-blue-100 text-blue-800 border-blue-300',
  },
  {
    min: 60,
    max: 69,
    grade: 'B',
    gpa: 2.8,
    color: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  {
    min: 50,
    max: 59,
    grade: 'C+',
    gpa: 2.4,
    color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  },
  {
    min: 40,
    max: 49,
    grade: 'C',
    gpa: 2.0,
    color: 'bg-orange-100 text-orange-800 border-orange-300',
  },
  {
    min: 30,
    max: 39,
    grade: 'D+',
    gpa: 1.6,
    color: 'bg-red-100 text-red-800 border-red-200',
  },
  {
    min: 20,
    max: 29,
    grade: 'D',
    gpa: 1.2,
    color: 'bg-red-50 text-red-700 border-red-200',
  },
  {
    min: 0,
    max: 19,
    grade: 'E',
    gpa: 0.8,
    color: 'bg-gray-100 text-gray-800 border-gray-300',
  },
];

const PASS_PERCENTAGE = 40; // 40% is passing (C grade or above)

export default function ResultEntryModal({ isOpen, onClose, exam, onSuccess }) {
  const [students, setStudents] = useState([]);
  const [marks, setMarks] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);
  const [examTypeInfo, setExamTypeInfo] = useState(null);

  // Fetch exam type details for full marks configuration
  useEffect(() => {
    if (isOpen && exam?.examTypeId) {
      fetchExamType();
    }
  }, [isOpen, exam?.examTypeId]);

  const fetchExamType = async () => {
    try {
      const response = await fetch(`/api/exam-types/${exam.examTypeId}`);
      if (response.ok) {
        const data = await response.json();
        setExamTypeInfo(data);
      }
    } catch (error) {
      console.error('Error fetching exam type:', error);
    }
  };

  useEffect(() => {
    if (isOpen && exam) {
      fetchStudents();
      fetchExistingMarks();
    }
  }, [isOpen, exam]);

  const fetchStudents = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!exam?.batchId) {
        console.warn('No batchId found for exam:', exam);
        setStudents([]);
        setError('No batch associated with this exam');
        return;
      }

      const response = await fetch(`/api/batches/${exam.batchId}/students`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch students');
      }

      const data = await response.json();
      console.log('Students API response:', data);

      let studentList = [];
      if (data?.students && Array.isArray(data.students)) {
        studentList = data.students;
      } else if (Array.isArray(data)) {
        studentList = data;
      } else {
        console.error('Unexpected API response structure:', data);
        studentList = [];
      }

      if (studentList.length === 0) {
        setError('No active students found in this batch');
      }

      setStudents(studentList);
    } catch (error) {
      console.error('Error fetching students:', error);
      setError(error.message || 'Failed to fetch students');
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchExistingMarks = async () => {
    try {
      const response = await fetch(`/api/exams/${exam.id}/results`);
      if (response.ok) {
        const data = await response.json();
        const marksMap = {};
        let resultsArray = [];

        if (Array.isArray(data)) {
          resultsArray = data;
        } else if (data?.results && Array.isArray(data.results)) {
          resultsArray = data.results;
        } else if (data?.data && Array.isArray(data.data)) {
          resultsArray = data.data;
        }

        resultsArray.forEach((result) => {
          if (result?.studentId) {
            marksMap[result.studentId] = {
              obtainedMarks: result.obtainedMarks || '',
              fullMarks: result.fullMarks || exam.fullMarks || 100,
              percentage: result.percentage || '',
              grade: result.grade || '',
              gpa: result.gpa || '',
              remarks: result.remarks || '',
            };
          }
        });
        setMarks(marksMap);
      }
    } catch (error) {
      console.error('Error fetching existing marks:', error);
    }
  };

  // Calculate percentage and GPA from marks
  const calculateFromMarks = (obtainedMarks, fullMarks) => {
    const obtained = parseFloat(obtainedMarks) || 0;
    const full = parseFloat(fullMarks) || 100;

    // Calculate percentage
    const percentage = full > 0 ? (obtained / full) * 100 : 0;

    // Find grade based on percentage
    const gradeInfo = GRADE_SYSTEM.find(
      (g) => percentage >= g.min && percentage <= g.max
    );

    return {
      percentage: percentage.toFixed(2),
      grade: gradeInfo?.grade || 'N/A',
      gpa: gradeInfo?.gpa || 0,
      isPass: percentage >= PASS_PERCENTAGE,
      gradeColor: gradeInfo?.color || 'bg-gray-100 text-gray-800',
    };
  };

  // Handle marks input change
  const handleMarksChange = (studentId, field, value) => {
    const currentMarks = marks[studentId] || {
      obtainedMarks: '',
      fullMarks: exam?.fullMarks || examTypeInfo?.fullMarks || 100,
      remarks: '',
    };

    let updatedMarks = { ...currentMarks, [field]: value };

    // Auto-calculate if both obtained and full marks are present
    if (field === 'obtainedMarks' || field === 'fullMarks') {
      const obtained =
        field === 'obtainedMarks' ? value : currentMarks.obtainedMarks;
      const full = field === 'fullMarks' ? value : currentMarks.fullMarks;

      if (
        obtained !== '' &&
        obtained !== undefined &&
        full !== '' &&
        full !== undefined
      ) {
        const calculated = calculateFromMarks(obtained, full);
        updatedMarks = {
          ...updatedMarks,
          ...calculated,
        };
      } else {
        // Clear calculated fields if marks are incomplete
        updatedMarks.percentage = '';
        updatedMarks.grade = '';
        updatedMarks.gpa = '';
        updatedMarks.isPass = false;
      }
    }

    setMarks((prev) => ({
      ...prev,
      [studentId]: updatedMarks,
    }));
  };

  const handleRemarksChange = (studentId, value) => {
    setMarks((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        remarks: value,
      },
    }));
  };

  // Bulk fill all students with same full marks
  const handleBulkFullMarks = (fullMarksValue) => {
    const fullMarks = parseFloat(fullMarksValue);
    if (isNaN(fullMarks) || fullMarks <= 0) return;

    const updatedMarks = { ...marks };
    students.forEach((student) => {
      const current = updatedMarks[student.id] || {};
      updatedMarks[student.id] = {
        ...current,
        fullMarks: fullMarks,
      };

      // Recalculate if obtained marks exist
      if (current.obtainedMarks && current.obtainedMarks !== '') {
        const calculated = calculateFromMarks(current.obtainedMarks, fullMarks);
        updatedMarks[student.id] = {
          ...updatedMarks[student.id],
          ...calculated,
        };
      }
    });
    setMarks(updatedMarks);
  };

  const handleSaveAll = async () => {
    setSaving(true);
    setError(null);
    try {
      const studentArray = Array.isArray(students) ? students : [];
      const results = studentArray
        .map((student) => {
          const studentMarks = marks[student.id];
          if (
            !studentMarks ||
            studentMarks.obtainedMarks === '' ||
            studentMarks.obtainedMarks === undefined
          ) {
            return null;
          }

          return {
            studentId: student.id,
            obtainedMarks: parseFloat(studentMarks.obtainedMarks),
            fullMarks: parseFloat(studentMarks.fullMarks),
            percentage: parseFloat(studentMarks.percentage),
            grade: studentMarks.grade,
            gpa: parseFloat(studentMarks.gpa),
            isPass: studentMarks.isPass,
            remarks: studentMarks.remarks || '',
          };
        })
        .filter((r) => r !== null);

      if (results.length === 0) {
        setError('Please enter marks for at least one student');
        setSaving(false);
        return;
      }

      const response = await fetch(`/api/exams/${exam.id}/results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          results,
          gradeSystem: GRADE_SYSTEM,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save results');
      }

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error saving results:', error);
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };

  const filteredStudents = useMemo(() => {
    const studentArray = Array.isArray(students) ? students : [];
    if (studentArray.length === 0) return [];

    return studentArray.filter((student) => {
      if (!student) return false;

      const searchLower = searchTerm.toLowerCase();
      const name = student.name?.toLowerCase() || '';
      const rollNo = student.rollNo?.toLowerCase() || '';

      return name.includes(searchLower) || rollNo.includes(searchLower);
    });
  }, [students, searchTerm]);

  const stats = useMemo(() => {
    const studentArray = Array.isArray(students) ? students : [];
    const marksArray = Object.values(marks || {});

    const enteredMarks = marksArray.filter(
      (m) =>
        m?.obtainedMarks !== '' &&
        m?.obtainedMarks !== undefined &&
        m?.obtainedMarks !== null
    );

    const passCount = enteredMarks.filter((m) => m?.isPass === true).length;

    const totalPercentage = enteredMarks.reduce(
      (sum, m) => sum + (parseFloat(m.percentage) || 0),
      0
    );

    return {
      total: studentArray.length,
      entered: enteredMarks.length,
      pass: passCount,
      fail: enteredMarks.length - passCount,
      pending: studentArray.length - enteredMarks.length,
      averagePercentage:
        enteredMarks.length > 0
          ? (totalPercentage / enteredMarks.length).toFixed(2)
          : '0.00',
    };
  }, [students, marks]);

  const formatDate = (date) => {
    if (!date) return 'No date';
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (time) => {
    if (!time) return '--:--';
    return new Date(time).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get default full marks from exam or exam type
  const defaultFullMarks = exam?.fullMarks || examTypeInfo?.fullMarks || 100;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-6xl"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Icons.Edit size={20} />
                  Enter Exam Marks
                </h3>
                <p className="text-blue-100 text-sm mt-1">
                  {exam?.name} • {exam?.classroom?.name} • {exam?.batch?.name}
                </p>
                <p className="text-blue-100 text-xs mt-0.5">
                  {formatDate(exam?.date)} • {formatTime(exam?.startTime)} -{' '}
                  {formatTime(exam?.endTime)}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <Icons.X size={24} />
              </button>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="px-6 py-3 bg-red-50 border-b border-red-200">
              <p className="text-red-600 text-sm flex items-center gap-2">
                <Icons.AlertCircle size={16} />
                {error}
              </p>
            </div>
          )}

          {/* Grade Scale Reference */}
          <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center gap-4 text-xs flex-wrap">
              <span className="text-gray-600 font-medium">Grading Scale:</span>
              {GRADE_SYSTEM.map(({ grade, min, max, gpa, color }) => (
                <span key={grade} className="flex items-center gap-1">
                  <span className={`px-2 py-0.5 rounded ${color}`}>
                    {grade}
                  </span>
                  <span className="text-gray-500">
                    {min}-{max}% ({gpa})
                  </span>
                </span>
              ))}
            </div>
          </div>

          {/* Stats Bar */}
          <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center gap-6 flex-wrap">
              <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 rounded-lg">
                <Icons.Info size={14} className="text-blue-600" />
                <span className="text-xs text-blue-700">
                  Pass: ≥ {PASS_PERCENTAGE}% (C or above)
                </span>
              </div>
              <div className="flex items-center gap-6 text-sm ml-auto">
                <span className="text-gray-600">
                  Total: <strong>{stats.total}</strong>
                </span>
                <span className="text-yellow-600">
                  Pending: <strong>{stats.pending}</strong>
                </span>
                <span className="text-blue-600">
                  Entered: <strong>{stats.entered}</strong>
                </span>
                <span className="text-green-600">
                  Pass: <strong>{stats.pass}</strong>
                </span>
                <span className="text-red-600">
                  Fail: <strong>{stats.fail}</strong>
                </span>
                <span className="text-purple-600">
                  Avg: <strong>{stats.averagePercentage}%</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Bulk Actions */}
          <div className="px-6 py-3 border-b border-gray-200 bg-white">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">Bulk Actions:</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Set Full Marks"
                  className="px-3 py-1.5 border border-gray-300 rounded-md text-sm w-32"
                  onBlur={(e) => handleBulkFullMarks(e.target.value)}
                />
                <button
                  onClick={() => handleBulkFullMarks(defaultFullMarks)}
                  className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-md"
                >
                  Reset to {defaultFullMarks}
                </button>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="px-6 py-3 border-b border-gray-200 bg-white">
            <div className="relative">
              <Icons.Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={16}
              />
              <input
                type="text"
                placeholder="Search by name or roll number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Students Table */}
          <div className="max-h-[450px] overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-12">
                <Icons.Loader2
                  size={32}
                  className="animate-spin text-blue-600"
                />
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Icons.Users size={48} className="mx-auto mb-4 text-gray-300" />
                <p>
                  {searchTerm
                    ? 'No matching students found'
                    : error || 'No students found in this batch'}
                </p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Roll No
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Student Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Obtained Marks
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Full Marks
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Percentage
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Grade
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      GPA
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Remarks
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredStudents.map((student) => {
                    const studentMarks = marks[student.id] || {
                      obtainedMarks: '',
                      fullMarks: defaultFullMarks,
                      percentage: '',
                      grade: '',
                      gpa: '',
                      isPass: false,
                      remarks: '',
                    };

                    return (
                      <tr
                        key={`student-${student.id}`}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {student.rollNo || 'N/A'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="font-medium text-gray-900">
                            {student.name}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            step="any"
                            value={studentMarks.obtainedMarks}
                            onChange={(e) =>
                              handleMarksChange(
                                student.id,
                                'obtainedMarks',
                                e.target.value
                              )
                            }
                            className="w-24 px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            min="0"
                            placeholder="0"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            step="any"
                            value={studentMarks.fullMarks}
                            onChange={(e) =>
                              handleMarksChange(
                                student.id,
                                'fullMarks',
                                e.target.value
                              )
                            }
                            className="w-24 px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            min="1"
                            placeholder="100"
                          />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                          {studentMarks.percentage
                            ? `${studentMarks.percentage}%`
                            : '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {studentMarks.grade && (
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${studentMarks.gradeColor}`}
                            >
                              {studentMarks.grade}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                          {studentMarks.gpa ? studentMarks.gpa.toFixed(2) : '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {studentMarks.percentage &&
                            (studentMarks.isPass ? (
                              <span className="inline-flex items-center gap-1 text-green-600 text-sm">
                                <Icons.CheckCircle size={14} />
                                Pass
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-red-600 text-sm">
                                <Icons.XCircle size={14} />
                                Fail
                              </span>
                            ))}
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={studentMarks.remarks || ''}
                            onChange={(e) =>
                              handleRemarksChange(student.id, e.target.value)
                            }
                            className="w-32 px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Optional"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveAll}
              disabled={saving || loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Icons.Loader2 size={16} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Icons.Save size={16} />
                  Save Results
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
