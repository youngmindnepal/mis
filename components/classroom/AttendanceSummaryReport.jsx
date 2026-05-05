// components/classroom/AttendanceSummaryReport.jsx
'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import * as Icons from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import AttendancePDFDocument from './AttendancePDFDocument';

export default function AttendanceSummaryReport({
  onClose,
  preSelectedBatch = '',
  preSelectedStartDate = '',
  preSelectedEndDate = '',
  batchName = '',
}) {
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(preSelectedBatch);
  const [attendanceData, setAttendanceData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState({
    startDate:
      preSelectedStartDate ||
      new Date(new Date().setMonth(new Date().getMonth() - 1))
        .toISOString()
        .split('T')[0],
    endDate: preSelectedEndDate || new Date().toISOString().split('T')[0],
  });
  const [showOnlyActive, setShowOnlyActive] = useState(true);

  // Track if initial auto-fetch has been done
  const hasAutoFetched = useRef(false);

  // Fetch batches on mount
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

  const fetchAttendanceSummary = useCallback(async () => {
    if (!selectedBatch) {
      alert('Please select a batch');
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        batchId: selectedBatch,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        activeOnly: showOnlyActive,
      });

      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }

      const url = `/api/classrooms/attendance/summary?${params.toString()}`;

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
  }, [
    selectedBatch,
    dateRange.startDate,
    dateRange.endDate,
    showOnlyActive,
    searchQuery,
  ]);

  // Auto-trigger report if batch is pre-selected with dates
  useEffect(() => {
    if (preSelectedBatch && !hasAutoFetched.current) {
      hasAutoFetched.current = true;
      // Wait for batches to load before auto-fetching
      const timer = setTimeout(() => {
        fetchAttendanceSummary();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [preSelectedBatch, fetchAttendanceSummary]);

  // Update selected batch when preSelectedBatch prop changes
  useEffect(() => {
    if (preSelectedBatch) {
      setSelectedBatch(preSelectedBatch);
    }
  }, [preSelectedBatch]);

  // Update date range when preSelected dates change
  useEffect(() => {
    if (preSelectedStartDate) {
      setDateRange((prev) => ({ ...prev, startDate: preSelectedStartDate }));
    }
    if (preSelectedEndDate) {
      setDateRange((prev) => ({ ...prev, endDate: preSelectedEndDate }));
    }
  }, [preSelectedStartDate, preSelectedEndDate]);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
  };

  // Trigger API call when search query changes (with debounce)
  useEffect(() => {
    if (!selectedBatch || !attendanceData) return;

    const timeoutId = setTimeout(() => {
      fetchAttendanceSummary();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, showOnlyActive]);

  // Client-side filtering as fallback
  const filteredStudentReport = useMemo(() => {
    if (!attendanceData?.studentReport) return [];

    if (attendanceData.appliedFilter) {
      return attendanceData.studentReport;
    }

    const query = searchQuery.toLowerCase().trim();
    if (!query) return attendanceData.studentReport;

    return attendanceData.studentReport.filter((student) => {
      const name = (student.studentName || '').toLowerCase();
      const rollNo = (student.rollNo || '').toLowerCase();
      const enrollmentNo = (student.enrollmentNo || '').toLowerCase();
      const email = (student.email || '').toLowerCase();

      return (
        name.includes(query) ||
        rollNo.includes(query) ||
        enrollmentNo.includes(query) ||
        email.includes(query)
      );
    });
  }, [attendanceData, searchQuery]);

  // Export to CSV
  const handleExportCSV = () => {
    if (!attendanceData || filteredStudentReport.length === 0) {
      alert('No data to export');
      return;
    }

    setExporting(true);
    try {
      const { subjects, batch, dateRange } = attendanceData;
      const exportData = filteredStudentReport;

      let csv = '';
      csv += `"BATCH: ${batch.name} (${batch.academicYear})"\n`;
      csv += `"Period: ${dateRange.startDate} to ${dateRange.endDate}"\n`;
      csv += `"Generated: ${new Date().toLocaleDateString()}"\n`;
      if (searchQuery) {
        csv += `"Filter: "${searchQuery}"\n`;
      }
      csv += '\n';

      csv += '"Student Name","Roll No","Email/Enrollment","Status"';
      subjects.forEach((subject) => {
        csv += `,"${subject.name} (%)"`;
      });
      subjects.forEach((subject) => {
        csv += `,"${subject.name} (P/A)"`;
      });
      csv += '\n';

      exportData.forEach((student) => {
        csv += `"${student.studentName}","${student.rollNo || 'N/A'}","${
          student.email || student.enrollmentNo || 'N/A'
        }","${student.status || 'N/A'}"`;

        student.subjects.forEach((subject) => {
          csv += `,${
            subject.totalClasses > 0 ? subject.percentage + '%' : '-'
          }`;
        });

        student.subjects.forEach((subject) => {
          csv += `,"${
            subject.totalClasses > 0
              ? subject.presentDays + '/' + subject.absentDays
              : '-'
          }"`;
        });

        csv += '\n';
      });

      csv += '\n"SUMMARY STATISTICS"\n';
      csv += `"Total Students (Filtered)",${exportData.length}\n`;
      csv += `"Total Subjects",${subjects.length}\n`;

      const above75 = exportData.filter(
        (s) => s.overall.percentage >= 75
      ).length;
      const between60And75 = exportData.filter(
        (s) => s.overall.percentage >= 60 && s.overall.percentage < 75
      ).length;
      const below60 = exportData.filter(
        (s) => s.overall.percentage < 60 && s.overall.totalClasses > 0
      ).length;
      const noAttendance = exportData.filter(
        (s) => s.overall.totalClasses === 0
      ).length;

      csv += `"Above 75%",${above75}\n`;
      csv += `"60% - 75%",${between60And75}\n`;
      csv += `"Below 60%",${below60}\n`;
      csv += `"No Attendance",${noAttendance}\n`;

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

  // Export to PDF
  const handleExportPDF = async () => {
    if (!attendanceData || filteredStudentReport.length === 0) {
      alert('No data to export');
      return;
    }

    setExporting(true);
    try {
      const filteredData = {
        ...attendanceData,
        studentReport: filteredStudentReport,
      };

      const blob = await pdf(
        <AttendancePDFDocument attendanceData={filteredData} />
      ).toBlob();

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

  const getProgressColor = (percentage) => {
    if (percentage >= 75) return 'bg-green-500';
    if (percentage >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getProgressTextColor = (percentage) => {
    if (percentage >= 75) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const activeCount = filteredStudentReport.filter(
    (s) => s.status === 'active'
  ).length;
  const inactiveCount = filteredStudentReport.filter(
    (s) => s.status !== 'active'
  ).length;

  const filteredStats = useMemo(
    () => ({
      above75: filteredStudentReport.filter((s) => s.overall.percentage >= 75)
        .length,
      between60And75: filteredStudentReport.filter(
        (s) => s.overall.percentage >= 60 && s.overall.percentage < 75
      ).length,
      below60: filteredStudentReport.filter(
        (s) => s.overall.percentage < 60 && s.overall.totalClasses > 0
      ).length,
      noAttendance: filteredStudentReport.filter(
        (s) => s.overall.totalClasses === 0
      ).length,
    }),
    [filteredStudentReport]
  );

  // Get batch display name
  const displayBatchName = batchName || attendanceData?.batch?.name || '';

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
                {displayBatchName
                  ? `${displayBatchName} - Attendance across all subjects`
                  : 'Attendance percentage across all subjects'}
                {searchQuery && (
                  <span className="ml-2 text-white bg-white/20 px-2 py-0.5 rounded-full text-xs">
                    Filtered: "{searchQuery}"
                  </span>
                )}
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
                  setSearchQuery('');
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
                disabled={loading || !selectedBatch}
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

          {/* Search and Active Filter Row */}
          <div className="flex items-center gap-4 mt-4">
            {/* Student Search Input */}
            <div className="flex-1 relative">
              <Icons.Search
                size={18}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search by name, roll number, or enrollment number..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <Icons.X size={18} />
                </button>
              )}
            </div>

            {/* Active Student Filter Toggle */}
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showOnlyActive}
                  onChange={(e) => setShowOnlyActive(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
                  Show only active students
                </span>
              </label>
              {attendanceData && !showOnlyActive && (
                <div className="flex items-center gap-3 text-sm">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    <span className="text-gray-600 whitespace-nowrap">
                      Active: {activeCount}
                    </span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                    <span className="text-gray-600 whitespace-nowrap">
                      Inactive: {inactiveCount}
                    </span>
                  </span>
                </div>
              )}
            </div>
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
                <p className="text-gray-600">
                  {searchQuery
                    ? 'Searching students...'
                    : 'Generating attendance report...'}
                </p>
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
                        {filteredStats.above75}
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
                        {filteredStats.between60And75}
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
                        {filteredStats.below60}
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
                        {filteredStats.noAttendance}
                      </p>
                    </div>
                    <Icons.HelpCircle size={24} className="text-gray-600" />
                  </div>
                </div>
              </div>

              {/* Student-Subject Matrix */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      Student-wise Attendance Report
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Batch: {attendanceData.batch?.name} (
                      {attendanceData.batch?.academicYear}) | Period:{' '}
                      {attendanceData.dateRange?.startDate} to{' '}
                      {attendanceData.dateRange?.endDate}
                      {searchQuery && (
                        <span className="ml-2 text-indigo-600 font-medium">
                          | Filter: "{searchQuery}"
                        </span>
                      )}
                    </p>
                  </div>
                  {searchQuery && (
                    <span className="text-sm text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                      {filteredStudentReport.length} student
                      {filteredStudentReport.length !== 1 ? 's' : ''} found
                    </span>
                  )}
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
                              {subject.totalClasses} classes
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredStudentReport.length > 0 ? (
                        filteredStudentReport.map((student) => (
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
                                    {student.rollNo !== 'N/A' && (
                                      <span className="mr-2">
                                        Roll: {student.rollNo}
                                      </span>
                                    )}
                                    {student.enrollmentNo !== 'N/A' && (
                                      <span>EN: {student.enrollmentNo}</span>
                                    )}
                                    {student.rollNo === 'N/A' &&
                                      student.enrollmentNo === 'N/A' &&
                                      student.email}
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
                                        className={getProgressTextColor(
                                          subject.percentage
                                        )}
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
                            {searchQuery
                              ? `No students found matching "${searchQuery}"`
                              : showOnlyActive
                              ? 'No active students found'
                              : 'No students found'}
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
                {preSelectedBatch
                  ? 'Loading report for ' +
                    (displayBatchName || 'selected batch') +
                    '...'
                  : 'Select a batch and date range, then click "Generate Report"'}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        {attendanceData && filteredStudentReport.length > 0 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Showing {filteredStudentReport.length} student
              {filteredStudentReport.length !== 1 ? 's' : ''}
              {' | '}Subjects: {attendanceData.summary?.totalSubjects || 0}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleExportPDF}
                disabled={exporting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50"
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
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50"
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
