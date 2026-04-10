// components/classroom/AttendanceSummaryReport.jsx
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import AttendancePDFDocument from './AttendancePDFDocument';

export default function AttendanceSummaryReport({ onClose }) {
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [attendanceData, setAttendanceData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 1))
      .toISOString()
      .split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const [showOnlyActive, setShowOnlyActive] = useState(true);

  // Fetch batches
  useEffect(() => {
    fetchBatches();
  }, []);

  const fetchBatches = async () => {
    try {
      const response = await fetch('/api/batches');
      const data = await response.json();
      setBatches(data.batches || []);
    } catch (error) {
      console.error('Error fetching batches:', error);
    }
  };

  const fetchAttendanceSummary = async () => {
    if (!selectedBatch) {
      alert('Please select a batch');
      return;
    }

    setLoading(true);
    try {
      const url = `/api/classrooms/attendance/summary?batchId=${selectedBatch}&startDate=${dateRange.startDate}&endDate=${dateRange.endDate}&activeOnly=${showOnlyActive}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || `HTTP error! status: ${response.status}`
          );
        } else {
          throw new Error(`Server error (${response.status})`);
        }
      }

      const data = await response.json();
      setAttendanceData(data);
    } catch (error) {
      console.error('Error fetching attendance summary:', error);
      alert(`Failed to fetch attendance data: ${error.message}`);
      setAttendanceData(null);
    } finally {
      setLoading(false);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (!attendanceData) return;

    setExporting(true);
    try {
      const { studentReport, subjects, batch, dateRange } = attendanceData;

      // Create CSV content
      let csv = '';

      // Header info
      csv += `"BATCH: ${batch.name} (${batch.academicYear})"\n`;
      csv += `"Period: ${dateRange.startDate} to ${dateRange.endDate}"\n`;
      csv += `"Generated: ${new Date().toLocaleDateString()}"\n\n`;

      // Column headers
      csv += '"Student Name","Email/Enrollment","Status"';
      subjects.forEach((subject) => {
        csv += `,"${subject.name} (%)"`;
      });
      subjects.forEach((subject) => {
        csv += `,"${subject.name} (P/A)"`;
      });
      csv += '\n';

      // Data rows
      studentReport.forEach((student) => {
        csv += `"${student.studentName}","${
          student.email || student.enrollmentNo || 'N/A'
        }","${student.status || 'N/A'}"`;

        // Percentage columns
        student.subjects.forEach((subject) => {
          csv += `,${
            subject.totalClasses > 0 ? subject.percentage + '%' : '-'
          }`;
        });

        // P/A columns
        student.subjects.forEach((subject) => {
          csv += `,"${
            subject.totalClasses > 0
              ? subject.presentDays + '/' + subject.absentDays
              : '-'
          }"`;
        });

        csv += '\n';
      });

      // Summary statistics
      csv += '\n"SUMMARY STATISTICS"\n';
      csv += `"Total Students",${studentReport.length}\n`;
      csv += `"Total Subjects",${subjects.length}\n`;
      csv += `"Above 75%",${attendanceData.studentStats?.above75 || 0}\n`;
      csv += `"60% - 75%",${
        attendanceData.studentStats?.between60And75 || 0
      }\n`;
      csv += `"Below 60%",${attendanceData.studentStats?.below60 || 0}\n`;
      csv += `"No Attendance",${
        attendanceData.studentStats?.noAttendance || 0
      }\n`;

      // Download CSV
      const blob = new Blob(['\ufeff' + csv], {
        type: 'text/csv;charset=utf-8;',
      });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute(
        'download',
        `Attendance_Report_${batch.name}_${dateRange.startDate}_to_${dateRange.endDate}.csv`.replace(
          /\s+/g,
          '_'
        )
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      alert('Failed to export to CSV');
    } finally {
      setExporting(false);
    }
  };

  // Export to PDF using @react-pdf/renderer
  const handleExportPDF = async () => {
    if (!attendanceData) return;

    setExporting(true);
    try {
      // Generate PDF blob
      const blob = await pdf(
        <AttendancePDFDocument attendanceData={attendanceData} />
      ).toBlob();

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download =
        `Attendance_Report_${attendanceData.batch.name}_${attendanceData.dateRange.startDate}_to_${attendanceData.dateRange.endDate}.pdf`.replace(
          /\s+/g,
          '_'
        );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      alert('Failed to export to PDF');
    } finally {
      setExporting(false);
    }
  };

  // Helper function to get progress bar color
  const getProgressColor = (percentage) => {
    if (percentage >= 75) return 'bg-green-500';
    if (percentage >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Get student report data
  const studentReport = attendanceData?.studentReport || [];
  const activeCount = studentReport.filter((s) => s.status === 'active').length;
  const inactiveCount = studentReport.filter(
    (s) => s.status !== 'active'
  ).length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Icons.Users size={24} />
                Student Attendance Report
              </h2>
              <p className="text-indigo-100 text-sm mt-1">
                Attendance percentage across all subjects
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
            >
              <Icons.X size={20} />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Batch
              </label>
              <select
                value={selectedBatch}
                onChange={(e) => {
                  setSelectedBatch(e.target.value);
                  setAttendanceData(null);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Choose a batch...</option>
                {batches.map((batch) => (
                  <option key={batch.id} value={batch.id}>
                    {batch.name} ({batch.academicYear})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) =>
                  setDateRange({ ...dateRange, startDate: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) =>
                  setDateRange({ ...dateRange, endDate: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div className="flex items-end gap-2">
              <button
                onClick={fetchAttendanceSummary}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Icons.Loader2 size={18} className="animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <Icons.Search size={18} />
                    Generate Report
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Active Student Filter Toggle */}
          <div className="flex items-center gap-4 mt-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showOnlyActive}
                onChange={(e) => {
                  setShowOnlyActive(e.target.checked);
                  setAttendanceData(null);
                }}
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <span className="text-sm font-medium text-gray-700">
                Show only active students
              </span>
            </label>
            {attendanceData && !showOnlyActive && (
              <div className="flex items-center gap-3 text-sm">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span className="text-gray-600">Active: {activeCount}</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                  <span className="text-gray-600">
                    Inactive: {inactiveCount}
                  </span>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-300px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Icons.Loader2
                  size={48}
                  className="animate-spin text-indigo-600 mx-auto mb-4"
                />
                <p className="text-gray-600">Generating attendance report...</p>
              </div>
            </div>
          ) : attendanceData ? (
            <div className="space-y-4">
              {/* Student Stats Summary */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-600 text-sm font-medium">
                        Above 75%
                      </p>
                      <p className="text-2xl font-bold text-green-900">
                        {attendanceData.studentStats?.above75 || 0}
                      </p>
                    </div>
                    <Icons.TrendingUp size={24} className="text-green-600" />
                  </div>
                </div>
                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-yellow-600 text-sm font-medium">
                        60% - 75%
                      </p>
                      <p className="text-2xl font-bold text-yellow-900">
                        {attendanceData.studentStats?.between60And75 || 0}
                      </p>
                    </div>
                    <Icons.Minimize size={24} className="text-yellow-600" />
                  </div>
                </div>
                <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-red-600 text-sm font-medium">
                        Below 60%
                      </p>
                      <p className="text-2xl font-bold text-red-900">
                        {attendanceData.studentStats?.below60 || 0}
                      </p>
                    </div>
                    <Icons.TrendingDown size={24} className="text-red-600" />
                  </div>
                </div>
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm font-medium">
                        No Attendance
                      </p>
                      <p className="text-2xl font-bold text-gray-900">
                        {attendanceData.studentStats?.noAttendance || 0}
                      </p>
                    </div>
                    <Icons.HelpCircle size={24} className="text-gray-600" />
                  </div>
                </div>
              </div>

              {/* 2D Student-Subject Matrix */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-900">
                    Student-wise Attendance Report
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Batch: {attendanceData.batch?.name} (
                    {attendanceData.batch?.academicYear}) | Period:{' '}
                    {attendanceData.dateRange?.startDate} to{' '}
                    {attendanceData.dateRange?.endDate}
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                          Student
                        </th>
                        {attendanceData.subjects.map((subject) => (
                          <th
                            key={subject.id}
                            className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                            title={`${subject.name} - ${subject.teacher}`}
                          >
                            <div className="font-semibold">{subject.name}</div>
                            <div className="text-[10px] font-normal text-gray-400 mt-0.5">
                              Total: {subject.totalClasses} classes
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {studentReport.length > 0 ? (
                        studentReport.map((student) => (
                          <tr
                            key={student.studentId}
                            className="hover:bg-gray-50"
                          >
                            <td className="px-4 py-3 whitespace-nowrap sticky left-0 bg-white z-10">
                              <div className="flex items-center gap-2">
                                <div>
                                  <div className="font-medium text-gray-900">
                                    {student.studentName}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {student.email ||
                                      student.enrollmentNo ||
                                      'N/A'}
                                  </div>
                                </div>
                                {student.status !== 'active' && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600">
                                    Inactive
                                  </span>
                                )}
                              </div>
                            </td>
                            {student.subjects.map((subject) => (
                              <td
                                key={subject.classroomId}
                                className="px-3 py-3 whitespace-nowrap text-center"
                              >
                                {subject.totalClasses > 0 ? (
                                  <div className="space-y-1.5 min-w-[70px]">
                                    <div className="text-lg font-bold">
                                      <span
                                        className={`
                                          ${
                                            subject.percentage >= 75
                                              ? 'text-green-600'
                                              : ''
                                          }
                                          ${
                                            subject.percentage >= 60 &&
                                            subject.percentage < 75
                                              ? 'text-yellow-600'
                                              : ''
                                          }
                                          ${
                                            subject.percentage < 60
                                              ? 'text-red-600'
                                              : ''
                                          }
                                        `}
                                      >
                                        {subject.percentage}%
                                      </span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                                      <div
                                        className={`h-1.5 rounded-full ${getProgressColor(
                                          subject.percentage
                                        )}`}
                                        style={{
                                          width: `${subject.percentage}%`,
                                        }}
                                      />
                                    </div>
                                    <div className="flex items-center justify-center gap-1 text-[10px]">
                                      <span className="text-green-600 font-medium">
                                        {subject.presentDays}P
                                      </span>
                                      <span className="text-gray-300">|</span>
                                      <span className="text-red-600 font-medium">
                                        {subject.absentDays}A
                                      </span>
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-sm text-gray-400">
                                    -
                                  </span>
                                )}
                              </td>
                            ))}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={attendanceData.subjects.length + 1}
                            className="px-4 py-8 text-center text-gray-500"
                          >
                            {showOnlyActive
                              ? 'No active students found in this batch.'
                              : 'No students found in this batch.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Icons.Users size={48} className="text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Report Generated
              </h3>
              <p className="text-gray-600">
                Select a batch and date range, then click "Generate Report" to
                view student attendance summary
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        {attendanceData && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Showing {studentReport.length} student
              {studentReport.length !== 1 ? 's' : ''} | Total Subjects:{' '}
              {attendanceData.summary?.totalSubjects || 0}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleExportPDF}
                disabled={exporting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {exporting ? (
                  <Icons.Loader2 size={18} className="animate-spin" />
                ) : (
                  <Icons.FileText size={18} />
                )}
                Export PDF
              </button>
              <button
                onClick={handleExportCSV}
                disabled={exporting}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {exporting ? (
                  <Icons.Loader2 size={18} className="animate-spin" />
                ) : (
                  <Icons.Download size={18} />
                )}
                Export CSV
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
