// components/exam/ResultEntryModal.jsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';

export default function ResultEntryModal({ isOpen, onClose, exam, onSuccess }) {
  const [students, setStudents] = useState([]);
  const [marks, setMarks] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);

  // GPA Grading System
  const gradeSystem = [
    {
      grade: 'A',
      minGPA: 3.71,
      maxGPA: 4.0,
      color: 'bg-green-100 text-green-800 border-green-300',
    },
    {
      grade: 'A-',
      minGPA: 3.31,
      maxGPA: 3.7,
      color: 'bg-green-50 text-green-700 border-green-200',
    },
    {
      grade: 'B+',
      minGPA: 3.01,
      maxGPA: 3.3,
      color: 'bg-blue-100 text-blue-800 border-blue-300',
    },
    {
      grade: 'B',
      minGPA: 2.71,
      maxGPA: 3.0,
      color: 'bg-blue-50 text-blue-700 border-blue-200',
    },
    {
      grade: 'B-',
      minGPA: 2.31,
      maxGPA: 2.7,
      color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    },
    {
      grade: 'C+',
      minGPA: 2.0,
      maxGPA: 2.3,
      color: 'bg-orange-100 text-orange-800 border-orange-300',
    },
  ];

  // Pass threshold: GPA >= 2.0 (C+ or above)
  const PASS_GPA = 2.0;

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
              gpa: result.gradePoint || result.gpa || '',
              grade: result.grade || '',
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

  // Calculate grade based on GPA
  const calculateGrade = (gpa) => {
    if (gpa === '' || gpa === null || gpa === undefined || isNaN(gpa)) {
      return { grade: null, isPass: false };
    }

    const numGPA = parseFloat(gpa);

    for (const gradeInfo of gradeSystem) {
      if (numGPA >= gradeInfo.minGPA && numGPA <= gradeInfo.maxGPA) {
        return {
          grade: gradeInfo.grade,
          isPass: true,
          color: gradeInfo.color,
        };
      }
    }

    // Below 2.0 is fail
    return {
      grade: 'F',
      isPass: false,
      color: 'bg-red-100 text-red-800 border-red-300',
    };
  };

  const handleGPAChange = (studentId, value) => {
    const numValue = value === '' ? '' : parseFloat(value);
    if (
      numValue !== '' &&
      (isNaN(numValue) || numValue < 0 || numValue > 4.0)
    ) {
      return;
    }

    const { grade, isPass, color } = calculateGrade(numValue);

    setMarks((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        gpa: numValue,
        grade: grade,
        isPass: isPass,
        gradeColor: color,
      },
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

  const handleSaveAll = async () => {
    setSaving(true);
    setError(null);
    try {
      const studentArray = Array.isArray(students) ? students : [];
      const results = studentArray
        .map((student) => {
          const studentMarks = marks[student.id];
          const gpa = studentMarks?.gpa;
          const { grade, isPass } = calculateGrade(gpa);

          return {
            studentId: student.id,
            gpa: gpa !== '' && !isNaN(gpa) ? parseFloat(gpa) : null,
            grade: grade,
            isPass: isPass,
            remarks: studentMarks?.remarks || '',
          };
        })
        .filter((r) => r.gpa !== null);

      if (results.length === 0) {
        setError('Please enter GPA for at least one student');
        setSaving(false);
        return;
      }

      const response = await fetch(`/api/exams/${exam.id}/results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          results,
          gradeSystem,
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

  // Safely filter students
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

  const getGPAStatus = (gpa) => {
    if (gpa === '' || gpa === null || gpa === undefined || isNaN(gpa)) {
      return 'pending';
    }
    const { isPass } = calculateGrade(gpa);
    return isPass ? 'pass' : 'fail';
  };

  const getGradeColor = (grade) => {
    const gradeInfo = gradeSystem.find((g) => g.grade === grade);
    return gradeInfo?.color || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const stats = useMemo(() => {
    const studentArray = Array.isArray(students) ? students : [];
    const marksArray = Object.values(marks || {});

    const enteredGPAs = marksArray.filter(
      (m) => m?.gpa !== '' && m?.gpa !== null && !isNaN(m?.gpa)
    );

    const passCount = enteredGPAs.filter((m) => {
      const { isPass } = calculateGrade(m.gpa);
      return isPass;
    }).length;

    return {
      total: studentArray.length,
      entered: enteredGPAs.length,
      pass: passCount,
      fail: enteredGPAs.length - passCount,
      averageGPA:
        enteredGPAs.length > 0
          ? (
              enteredGPAs.reduce((sum, m) => sum + parseFloat(m.gpa), 0) /
              enteredGPAs.length
            ).toFixed(2)
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
          className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-5xl"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Icons.Award size={20} />
                  Enter GPA Results
                </h3>
                <p className="text-purple-100 text-sm mt-1">
                  {exam?.name} • {exam?.classroom?.name} • {exam?.batch?.name}
                </p>
                <p className="text-purple-100 text-xs mt-0.5">
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
              <span className="text-gray-600 font-medium">Grade Scale:</span>
              {gradeSystem.map(({ grade, minGPA, maxGPA, color }) => (
                <span key={grade} className="flex items-center gap-1">
                  <span className={`px-2 py-0.5 rounded ${color}`}>
                    {grade}
                  </span>
                  <span className="text-gray-500">
                    {minGPA.toFixed(2)}-{maxGPA.toFixed(2)}
                  </span>
                </span>
              ))}
              <span className="flex items-center gap-1">
                <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 border-red-300">
                  F
                </span>
                <span className="text-gray-500">&lt;2.00 (Fail)</span>
              </span>
            </div>
          </div>

          {/* Settings Bar */}
          <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 rounded-lg">
              <Icons.Info size={14} className="text-blue-600" />
              <span className="text-xs text-blue-700">
                Pass: GPA ≥ 2.00 (C+ or above)
              </span>
            </div>
            <div className="flex items-center gap-4 ml-auto">
              <div className="flex items-center gap-4 text-sm">
                <span className="text-gray-600">
                  Total: <strong>{stats.total}</strong>
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
                  Avg GPA: <strong>{stats.averageGPA}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="px-6 py-3 border-b border-gray-200">
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
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Students List */}
          <div className="max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-12">
                <Icons.Loader2
                  size={32}
                  className="animate-spin text-purple-600"
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
                      GPA (0-4.0)
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Grade
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
                      gpa: '',
                      grade: '',
                      remarks: '',
                    };
                    const status = getGPAStatus(studentMarks.gpa);
                    const { grade, color } = studentMarks.gpa
                      ? calculateGrade(studentMarks.gpa)
                      : { grade: null, color: '' };

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
                            value={studentMarks.gpa}
                            onChange={(e) =>
                              handleGPAChange(student.id, e.target.value)
                            }
                            className={`w-24 px-3 py-1.5 border rounded-md text-sm focus:outline-none focus:ring-2 ${
                              status === 'pass'
                                ? 'border-green-300 focus:ring-green-500 bg-green-50'
                                : status === 'fail'
                                ? 'border-red-300 focus:ring-red-500 bg-red-50'
                                : 'border-gray-300 focus:ring-purple-500'
                            }`}
                            min="0"
                            max="4.0"
                            step="0.01"
                            placeholder="0.00"
                          />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {grade && (
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                                color || getGradeColor(grade)
                              }`}
                            >
                              {grade}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {status === 'pass' && (
                            <span className="inline-flex items-center gap-1 text-green-600 text-sm">
                              <Icons.CheckCircle size={14} />
                              Pass
                            </span>
                          )}
                          {status === 'fail' && (
                            <span className="inline-flex items-center gap-1 text-red-600 text-sm">
                              <Icons.XCircle size={14} />
                              Fail
                            </span>
                          )}
                          {status === 'pending' && (
                            <span className="text-gray-400 text-sm">
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={studentMarks.remarks || ''}
                            onChange={(e) =>
                              handleRemarksChange(student.id, e.target.value)
                            }
                            className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
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
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
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
