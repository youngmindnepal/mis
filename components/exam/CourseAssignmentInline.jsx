// components/exam/CourseAssignmentInline.jsx
'use client';

import { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';

export default function CourseAssignmentInline({
  batchId,
  semester,
  departmentId,
  onCoursesAssigned,
  onCancel,
}) {
  const [availableCourses, setAvailableCourses] = useState([]);
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (departmentId) {
      fetchAvailableCourses();
    }
  }, [departmentId, semester]);

  const fetchAvailableCourses = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/courses?departmentId=${departmentId}&limit=200`
      );
      if (response.ok) {
        const data = await response.json();
        const courses = data.courses || data;
        // Filter courses that match the selected semester
        const semesterCourses = courses.filter((c) => c.semester === semester);
        setAvailableCourses(semesterCourses);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignCourses = async () => {
    if (selectedCourses.length === 0) {
      alert('Please select at least one course');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/batches/${batchId}/courses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseIds: selectedCourses,
          semester: semester,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (onCoursesAssigned) {
          onCoursesAssigned(data);
        }
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to assign courses');
      }
    } catch (error) {
      console.error('Error assigning courses:', error);
      alert('Failed to assign courses: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleCourseSelection = (courseId) => {
    setSelectedCourses((prev) =>
      prev.includes(courseId)
        ? prev.filter((id) => id !== courseId)
        : [...prev, courseId]
    );
  };

  const selectAll = () => {
    setSelectedCourses(filteredCourses.map((c) => c.id));
  };

  const clearSelection = () => {
    setSelectedCourses([]);
  };

  const filteredCourses = availableCourses.filter((course) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      course.name?.toLowerCase().includes(searchLower) ||
      course.code?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Icons.BookOpen className="text-blue-600" size={20} />
          Assign Courses for {semester?.replace('semester', 'Semester ')}
        </h3>
        <button
          onClick={onCancel}
          className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Icons.X size={20} />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Icons.Loader2 size={24} className="animate-spin text-blue-600" />
        </div>
      ) : availableCourses.length === 0 ? (
        <div className="text-center py-8">
          <Icons.AlertCircle size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">
            No courses available for{' '}
            {semester?.replace('semester', 'Semester ')}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            Please create courses for this semester first
          </p>
        </div>
      ) : (
        <>
          {/* Search and Actions */}
          <div className="flex gap-3 mb-4">
            <div className="flex-1 relative">
              <Icons.Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={16}
              />
              <input
                type="text"
                placeholder="Search courses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={selectAll}
              className="px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg"
            >
              Select All
            </button>
            <button
              onClick={clearSelection}
              className="px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg"
            >
              Clear
            </button>
          </div>

          {/* Course List */}
          <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg mb-4">
            {filteredCourses.length === 0 ? (
              <p className="text-sm text-gray-500 p-4 text-center">
                No matching courses
              </p>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredCourses.map((course) => (
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
                      <p className="font-medium text-gray-900">{course.name}</p>
                      <p className="text-xs text-gray-500">
                        {course.code} • Credits: {course.credits || 3}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Selected: {selectedCourses.length} course(s)
            </p>
            <div className="flex gap-2">
              <button
                onClick={onCancel}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignCourses}
                disabled={selectedCourses.length === 0 || saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
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
        </>
      )}
    </div>
  );
}
