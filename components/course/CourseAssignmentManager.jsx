// components/course/CourseAssignmentManager.jsx
'use client';

import { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';

export default function CourseAssignmentManager() {
  // Selection states
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');

  // Data states
  const [departments, setDepartments] = useState([]);
  const [batches, setBatches] = useState([]);
  const [availableCourses, setAvailableCourses] = useState([]);
  const [assignedCourses, setAssignedCourses] = useState([]);
  const [selectedCourses, setSelectedCourses] = useState([]);

  // UI states
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState(null);

  const semesters = [
    { value: 'semester1', label: 'Semester 1' },
    { value: 'semester2', label: 'Semester 2' },
    { value: 'semester3', label: 'Semester 3' },
    { value: 'semester4', label: 'Semester 4' },
    { value: 'semester5', label: 'Semester 5' },
    { value: 'semester6', label: 'Semester 6' },
    { value: 'semester7', label: 'Semester 7' },
    { value: 'semester8', label: 'Semester 8' },
  ];

  // Fetch departments on load
  useEffect(() => {
    fetchDepartments();
  }, []);

  // Fetch batches when department changes
  useEffect(() => {
    if (selectedDepartment) {
      fetchBatches(selectedDepartment);
      setSelectedBatch('');
      setSelectedSemester('');
      setAssignedCourses([]);
      setAvailableCourses([]);
    } else {
      setBatches([]);
    }
  }, [selectedDepartment]);

  // Fetch assigned courses when batch and semester change
  useEffect(() => {
    if (selectedBatch && selectedSemester) {
      fetchAssignedCourses();
      fetchAvailableCoursesForDepartment();
    } else {
      setAssignedCourses([]);
      setAvailableCourses([]);
    }
    setSelectedCourses([]);
  }, [selectedBatch, selectedSemester]);

  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/departments/all');
      if (response.ok) {
        const data = await response.json();
        setDepartments(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
      showMessage('Failed to fetch departments', 'error');
    }
  };

  const fetchBatches = async (departmentId) => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/batches?departmentId=${departmentId}&limit=100`
      );
      if (response.ok) {
        const data = await response.json();
        const batchList = data.batches || data;
        const activeBatches = batchList.filter((b) => b.status === 'active');
        setBatches(activeBatches);
      }
    } catch (error) {
      console.error('Error fetching batches:', error);
      showMessage('Failed to fetch batches', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableCoursesForDepartment = async () => {
    if (!selectedDepartment) return;

    try {
      const response = await fetch(
        `/api/courses?departmentId=${selectedDepartment}&limit=200`
      );
      if (response.ok) {
        const data = await response.json();
        const courses = data.courses || data;
        // Filter courses that match the selected semester
        const semesterCourses = courses.filter(
          (c) => c.semester === selectedSemester
        );
        setAvailableCourses(semesterCourses);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
      showMessage('Failed to fetch courses', 'error');
    }
  };

  const fetchAssignedCourses = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/batches/${selectedBatch}/courses?semester=${selectedSemester}`
      );
      if (response.ok) {
        const data = await response.json();
        setAssignedCourses(data.courses || []);
      }
    } catch (error) {
      console.error('Error fetching assigned courses:', error);
      showMessage('Failed to fetch assigned courses', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleAssignCourses = async () => {
    if (selectedCourses.length === 0) {
      showMessage('Please select at least one course', 'error');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/batches/${selectedBatch}/courses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseIds: selectedCourses,
          semester: selectedSemester,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        await fetchAssignedCourses();
        setSelectedCourses([]);
        showMessage(
          data.message || 'Courses assigned successfully!',
          'success'
        );
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to assign courses');
      }
    } catch (error) {
      console.error('Error assigning courses:', error);
      showMessage(error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveCourse = async (courseId) => {
    if (!confirm('Remove this course from the semester?')) return;

    try {
      const response = await fetch(
        `/api/batches/${selectedBatch}/courses?courseId=${courseId}&semester=${selectedSemester}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        await fetchAssignedCourses();
        showMessage('Course removed successfully!', 'success');
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to remove course');
      }
    } catch (error) {
      console.error('Error removing course:', error);
      showMessage(error.message, 'error');
    }
  };

  const handleRemoveAllCourses = async () => {
    if (
      !confirm(
        `Remove ALL courses from ${selectedSemester.replace(
          'semester',
          'Semester '
        )}?`
      )
    )
      return;

    try {
      const response = await fetch(
        `/api/batches/${selectedBatch}/courses?semester=${selectedSemester}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        const data = await response.json();
        await fetchAssignedCourses();
        showMessage(data.message, 'success');
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to remove courses');
      }
    } catch (error) {
      console.error('Error removing courses:', error);
      showMessage(error.message, 'error');
    }
  };

  // Filter available courses (not already assigned)
  const filteredAvailableCourses = availableCourses.filter((course) => {
    const isAssigned = assignedCourses.some((ac) => ac.courseId === course.id);
    if (isAssigned) return false;

    const searchLower = searchTerm.toLowerCase();
    return (
      course.name?.toLowerCase().includes(searchLower) ||
      course.code?.toLowerCase().includes(searchLower)
    );
  });

  const toggleCourseSelection = (courseId) => {
    setSelectedCourses((prev) =>
      prev.includes(courseId)
        ? prev.filter((id) => id !== courseId)
        : [...prev, courseId]
    );
  };

  const selectAllFiltered = () => {
    const filteredIds = filteredAvailableCourses.map((c) => c.id);
    setSelectedCourses(filteredIds);
  };

  const clearSelection = () => {
    setSelectedCourses([]);
  };

  const selectedDepartmentName = departments.find(
    (d) => d.id.toString() === selectedDepartment
  )?.name;
  const selectedBatchName = batches.find(
    (b) => b.id.toString() === selectedBatch
  )?.name;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Icons.BookOpen className="text-blue-600" size={28} />
          Course Assignment Manager
        </h1>
        <p className="text-gray-600 mt-1">
          Assign courses to batches for each semester
        </p>
      </div>

      {/* Message Toast */}
      {message && (
        <div
          className={`mb-4 p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Selection Panel */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Department Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Department <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select Department</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name} ({dept.code})
                </option>
              ))}
            </select>
          </div>

          {/* Batch Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Batch <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
              disabled={!selectedDepartment || loading}
            >
              <option value="">Select Batch</option>
              {batches.map((batch) => (
                <option key={batch.id} value={batch.id}>
                  {batch.name} ({batch.academicYear})
                </option>
              ))}
            </select>
          </div>

          {/* Semester Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Semester <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
              disabled={!selectedBatch || loading}
            >
              <option value="">Select Semester</option>
              {semesters.map((sem) => (
                <option key={sem.value} value={sem.value}>
                  {sem.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Selection Summary */}
        {selectedDepartment && selectedBatch && selectedSemester && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Icons.Building size={16} className="text-blue-600" />
              <span className="text-sm">
                <span className="text-gray-600">Department:</span>{' '}
                <span className="font-medium">{selectedDepartmentName}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Icons.Users size={16} className="text-blue-600" />
              <span className="text-sm">
                <span className="text-gray-600">Batch:</span>{' '}
                <span className="font-medium">{selectedBatchName}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Icons.Calendar size={16} className="text-blue-600" />
              <span className="text-sm">
                <span className="text-gray-600">Semester:</span>{' '}
                <span className="font-medium">
                  {selectedSemester.replace('semester', 'Semester ')}
                </span>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Course Assignment Panel */}
      {selectedBatch && selectedSemester && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Assigned Courses */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Icons.CheckCircle className="text-green-600" size={20} />
                Assigned Courses ({assignedCourses.length})
              </h3>
              {assignedCourses.length > 0 && (
                <button
                  onClick={handleRemoveAllCourses}
                  className="text-sm text-red-600 hover:text-red-800 flex items-center gap-1"
                >
                  <Icons.Trash2 size={14} />
                  Remove All
                </button>
              )}
            </div>

            {loading ? (
              <div className="flex justify-center py-8">
                <Icons.Loader2
                  size={24}
                  className="animate-spin text-blue-600"
                />
              </div>
            ) : assignedCourses.length === 0 ? (
              <p className="text-gray-500 text-center py-8 border border-dashed border-gray-300 rounded-lg">
                No courses assigned to{' '}
                {selectedSemester.replace('semester', 'Semester ')}
              </p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {assignedCourses.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {item.course?.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {item.course?.code} • Credits:{' '}
                        {item.course?.credits || 3}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemoveCourse(item.courseId)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remove course"
                    >
                      <Icons.X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Available Courses */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Icons.BookOpen className="text-blue-600" size={20} />
                Available Courses
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={selectAllFiltered}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Select All
                </button>
                <button
                  onClick={clearSelection}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <Icons.Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={16}
              />
              <input
                type="text"
                placeholder="Search courses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="max-h-80 overflow-y-auto border border-gray-200 rounded-lg">
              {filteredAvailableCourses.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  {searchTerm ? 'No matching courses' : 'All courses assigned'}
                </p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredAvailableCourses.map((course) => (
                    <label
                      key={course.id}
                      className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCourses.includes(course.id)}
                        onChange={() => toggleCourseSelection(course.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {course.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {course.code} • Credits: {course.credits || 3}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Selected: {selectedCourses.length} course(s)
              </p>
              <button
                onClick={handleAssignCourses}
                disabled={selectedCourses.length === 0 || saving}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <Icons.Loader2 size={16} className="animate-spin" />
                    Assigning...
                  </>
                ) : (
                  <>
                    <Icons.Plus size={16} />
                    Assign Courses
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
