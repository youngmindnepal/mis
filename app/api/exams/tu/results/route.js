// app/dashboard/exams/tu-examination/page.jsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import * as Icons from 'lucide-react';
import MarksEntryGrid from '@/components/exam/MarksEntryGrid';
import ReportCard from '@/components/exam/ReportCard';
import StudentSelector from '@/components/exam/StudentSelector';
import CourseAssignmentInline from '@/components/exam/CourseAssignmentInline';

export default function TUExaminationPage() {
  // ===== STATE DECLARATIONS =====
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [selectedExamCategory, setSelectedExamCategory] = useState('regular');

  const [departments, setDepartments] = useState([]);
  const [batches, setBatches] = useState([]);
  const [students, setStudents] = useState([]);
  const [assignedCourses, setAssignedCourses] = useState([]);

  const [currentStudentIndex, setCurrentStudentIndex] = useState(null);
  const [marksData, setMarksData] = useState({});
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('entry');
  const [initializing, setInitializing] = useState(true);
  const [showCourseAssignment, setShowCourseAssignment] = useState(false);
  const [loadingResults, setLoadingResults] = useState(false);
  const [hasExistingResults, setHasExistingResults] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(null);
  const [saving, setSaving] = useState(false);
  const [studentSelected, setStudentSelected] = useState(false);

  // Published date states
  const [publishedDates, setPublishedDates] = useState({}); // Store published date per student
  const [publishingStudent, setPublishingStudent] = useState(null);

  const examCategories = [
    { value: 'regular', label: 'Regular Examination' },
    { value: 'supplementary', label: 'Supplementary Examination' },
    { value: 'improvement', label: 'Improvement Examination' },
    { value: 'board', label: 'Board Examination' },
  ];

  // ===== MEMOIZED VALUES =====
  const sortCoursesByNumericCode = (courses) => {
    return [...courses].sort((a, b) => {
      const codeA = a.course?.code || '';
      const codeB = b.course?.code || '';
      const extractNumeric = (code) => {
        const matches = code.match(/\d+/g);
        if (matches && matches.length > 0) {
          return parseInt(matches[matches.length - 1], 10);
        }
        return 0;
      };
      return extractNumeric(codeA) - extractNumeric(codeB);
    });
  };

  const sortedCourses = useMemo(() => {
    return sortCoursesByNumericCode(assignedCourses);
  }, [assignedCourses]);

  const coursesForEntry = useMemo(() => {
    return sortedCourses.map((c) => ({
      id: c.courseId,
      code: c.course?.code || 'N/A',
      name: c.course?.name || 'N/A',
      credits: c.course?.credits || 3,
    }));
  }, [sortedCourses]);

  const sortedStudents = useMemo(() => {
    return [...students].sort((a, b) => {
      const nameA = a.name || '';
      const nameB = b.name || '';
      return nameA.localeCompare(nameB);
    });
  }, [students]);

  const currentStudent = useMemo(() => {
    if (currentStudentIndex !== null && sortedStudents[currentStudentIndex]) {
      return sortedStudents[currentStudentIndex];
    }
    return null;
  }, [sortedStudents, currentStudentIndex]);

  const selectedDepartmentName = useMemo(() => {
    return departments.find((d) => d.id.toString() === selectedDepartment)
      ?.name;
  }, [departments, selectedDepartment]);

  const selectedBatchName = useMemo(() => {
    return batches.find((b) => b.id.toString() === selectedBatch)?.name;
  }, [batches, selectedBatch]);

  const categoryLabel = useMemo(() => {
    return examCategories.find((c) => c.value === selectedExamCategory)?.label;
  }, [selectedExamCategory]);

  // Check if current student's results are published
  const isCurrentStudentPublished = useMemo(() => {
    if (!currentStudent) return false;
    return !!publishedDates[currentStudent.id];
  }, [currentStudent, publishedDates]);

  // ===== HELPER FUNCTIONS =====
  const initializeEmptyMarks = () => {
    const initialMarks = {};
    sortedStudents.forEach((student) => {
      initialMarks[student.id] = {};
      coursesForEntry.forEach((course) => {
        initialMarks[student.id][course.id] = {
          gradePoint: '',
          grade: null,
          isPassed: null,
        };
      });
    });
    setMarksData(initialMarks);
    setHasExistingResults(false);
  };

  const loadAllExistingResults = async () => {
    if (!selectedBatch) return;

    setLoadingResults(true);
    console.log('=== LOADING RESULTS ===');
    console.log('Batch ID:', selectedBatch);
    console.log('Exam Category:', selectedExamCategory);

    try {
      const url = `/api/results?batchId=${selectedBatch}&examCategory=${selectedExamCategory}`;
      const response = await fetch(url);

      if (response.ok) {
        const data = await response.json();
        const existingResults = data.results || {};
        const publishInfo = data.publishInfo || {};

        const updatedMarks = {};
        const updatedPublishedDates = {};

        sortedStudents.forEach((student) => {
          updatedMarks[student.id] = {};
          coursesForEntry.forEach((course) => {
            updatedMarks[student.id][course.id] = {
              gradePoint: '',
              grade: null,
              isPassed: null,
            };
          });
        });

        let loadedCount = 0;
        Object.entries(existingResults).forEach(
          ([studentId, studentCourses]) => {
            const studentIdNum = parseInt(studentId);

            if (updatedMarks[studentIdNum]) {
              Object.entries(studentCourses).forEach(([courseId, result]) => {
                const courseIdNum = parseInt(courseId);

                if (updatedMarks[studentIdNum][courseIdNum]) {
                  updatedMarks[studentIdNum][courseIdNum] = {
                    gradePoint: result.gradePoint ?? '',
                    grade: result.grade || null,
                    isPassed: result.isPassed || null,
                    resultStatus: result.resultStatus || null,
                  };
                  loadedCount++;
                }
              });

              // Check if this student's results are published
              if (publishInfo[studentIdNum]?.publishedAt) {
                updatedPublishedDates[studentIdNum] =
                  publishInfo[studentIdNum].publishedAt;
              }
            }
          }
        );

        console.log(`Loaded ${loadedCount} results`);
        setMarksData(updatedMarks);
        setPublishedDates(updatedPublishedDates);
        setHasExistingResults(loadedCount > 0);
      } else {
        initializeEmptyMarks();
        setPublishedDates({});
      }
    } catch (error) {
      console.error('Error loading results:', error);
      initializeEmptyMarks();
      setPublishedDates({});
    } finally {
      setLoadingResults(false);
    }
  };

  // ===== FETCH FUNCTIONS =====
  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/departments/all');
      if (response.ok) {
        const data = await response.json();
        const sortedDepts = (Array.isArray(data) ? data : []).sort((a, b) =>
          a.name.localeCompare(b.name)
        );
        setDepartments(sortedDepts);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
    } finally {
      setInitializing(false);
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
        const sortedBatches = activeBatches.sort((a, b) =>
          a.name.localeCompare(b.name)
        );
        setBatches(sortedBatches);
      }
    } catch (error) {
      console.error('Error fetching batches:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async (batchId) => {
    try {
      const response = await fetch(`/api/batches/${batchId}/students`);
      if (response.ok) {
        const data = await response.json();
        const studentList = data.students || data;
        const activeStudents = studentList.filter((s) => s.status === 'active');
        setStudents(activeStudents);
        setCurrentStudentIndex(null);
        setStudentSelected(false);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
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
        const courses = data.courses || [];
        setAssignedCourses(courses);
      } else {
        setAssignedCourses([]);
      }
    } catch (error) {
      console.error('Error fetching assigned courses:', error);
      setAssignedCourses([]);
    } finally {
      setLoading(false);
    }
  };

  // ===== EVENT HANDLERS =====
  const handleStudentSelect = (index) => {
    setCurrentStudentIndex(index);
    setStudentSelected(true);
  };

  const handleMarksChange = (studentId, courseId, field, value) => {
    setMarksData((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [courseId]: {
          ...prev[studentId]?.[courseId],
          [field]: value,
        },
      },
    }));
  };

  const handleSaveStudentMarks = async (studentId) => {
    if (!selectedBatch) {
      alert('Please select a batch first.');
      return;
    }

    setSaving(true);
    try {
      const studentMarks = marksData[studentId] || {};
      const results = Object.entries(studentMarks)
        .map(([courseId, data]) => ({
          courseId: parseInt(courseId),
          gradePoint:
            data.gradePoint === '' ? null : parseFloat(data.gradePoint),
        }))
        .filter((r) => r.gradePoint !== null && !isNaN(r.gradePoint));

      if (results.length === 0) {
        alert('Please enter at least one grade to save.');
        return;
      }

      const response = await fetch('/api/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: parseInt(studentId),
          batchId: parseInt(selectedBatch),
          examCategory: selectedExamCategory,
          results: results,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSaveSuccess(`Results saved successfully! (${data.count} courses)`);
        await loadAllExistingResults();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save results');
      }
    } catch (error) {
      console.error('Error saving results:', error);
      alert('Failed to save results: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAllMarks = async () => {
    if (!selectedBatch) {
      alert('Please select a batch first.');
      return;
    }

    setLoading(true);
    try {
      const allMarks = Object.entries(marksData)
        .map(([studentId, studentMarks]) => ({
          studentId: parseInt(studentId),
          results: Object.entries(studentMarks)
            .map(([courseId, data]) => ({
              courseId: parseInt(courseId),
              gradePoint:
                data.gradePoint === '' ? null : parseFloat(data.gradePoint),
            }))
            .filter((r) => r.gradePoint !== null && !isNaN(r.gradePoint)),
        }))
        .filter((s) => s.results.length > 0);

      if (allMarks.length === 0) {
        alert('No grades entered to save.');
        return;
      }

      let savedCount = 0;
      for (const studentData of allMarks) {
        try {
          const response = await fetch('/api/results', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              studentId: studentData.studentId,
              batchId: parseInt(selectedBatch),
              examCategory: selectedExamCategory,
              results: studentData.results,
            }),
          });
          if (response.ok) savedCount++;
        } catch (err) {
          console.error('Error saving student:', studentData.studentId, err);
        }
      }

      setSaveSuccess(`Saved ${savedCount} students`);
      await loadAllExistingResults();
    } catch (error) {
      console.error('Error saving all results:', error);
      alert('Failed to save results: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePublishStudentResults = async (studentId) => {
    if (!selectedBatch) {
      alert('Please select a batch first.');
      return;
    }

    // Check if all courses have grades entered
    const studentMarks = marksData[studentId] || {};
    const hasAllGrades = coursesForEntry.every((course) => {
      const grade = studentMarks[course.id]?.gradePoint;
      return (
        grade !== '' && grade !== null && grade !== undefined && !isNaN(grade)
      );
    });

    if (!hasAllGrades) {
      alert('Please enter grades for all courses before publishing.');
      return;
    }

    setPublishingStudent(studentId);
    try {
      const publishedAt = new Date().toISOString();

      const response = await fetch('/api/results/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: parseInt(studentId),
          batchId: parseInt(selectedBatch),
          examCategory: selectedExamCategory,
          publishedAt,
        }),
      });

      if (response.ok) {
        setPublishedDates((prev) => ({
          ...prev,
          [studentId]: publishedAt,
        }));
        setSaveSuccess(`Results published successfully!`);
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to publish results');
      }
    } catch (error) {
      console.error('Error publishing results:', error);
      alert('Failed to publish results: ' + error.message);
    } finally {
      setPublishingStudent(null);
    }
  };

  const handlePublishAllResults = async () => {
    if (!selectedBatch) {
      alert('Please select a batch first.');
      return;
    }

    // Check which students have all grades
    const studentsWithAllGrades = sortedStudents.filter((student) => {
      const studentMarks = marksData[student.id] || {};
      return coursesForEntry.every((course) => {
        const grade = studentMarks[course.id]?.gradePoint;
        return (
          grade !== '' && grade !== null && grade !== undefined && !isNaN(grade)
        );
      });
    });

    if (studentsWithAllGrades.length === 0) {
      alert('No students have all grades entered.');
      return;
    }

    if (
      !confirm(`Publish results for ${studentsWithAllGrades.length} students?`)
    ) {
      return;
    }

    setLoading(true);
    try {
      const publishedAt = new Date().toISOString();
      let publishedCount = 0;

      for (const student of studentsWithAllGrades) {
        try {
          const response = await fetch('/api/results/publish', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              studentId: student.id,
              batchId: parseInt(selectedBatch),
              examCategory: selectedExamCategory,
              publishedAt,
            }),
          });

          if (response.ok) {
            setPublishedDates((prev) => ({
              ...prev,
              [student.id]: publishedAt,
            }));
            publishedCount++;
          }
        } catch (err) {
          console.error('Error publishing student:', student.id, err);
        }
      }

      setSaveSuccess(`Published results for ${publishedCount} students!`);
    } catch (error) {
      console.error('Error publishing all results:', error);
      alert('Failed to publish results: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCoursesAssigned = () => {
    fetchAssignedCourses();
    setShowCourseAssignment(false);
  };

  // Format date for display
  const formatPublishedDate = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // ===== EFFECTS =====
  useEffect(() => {
    if (saveSuccess) {
      const timer = setTimeout(() => setSaveSuccess(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [saveSuccess]);

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    if (selectedDepartment) {
      fetchBatches(selectedDepartment);
    }
    setSelectedBatch('');
    setSelectedSemester('');
    setAssignedCourses([]);
    setStudents([]);
    setHasExistingResults(false);
    setMarksData({});
    setPublishedDates({});
    setCurrentStudentIndex(null);
    setStudentSelected(false);
  }, [selectedDepartment]);

  useEffect(() => {
    if (selectedBatch) {
      fetchStudents(selectedBatch);
    }
    setSelectedSemester('');
    setAssignedCourses([]);
    setHasExistingResults(false);
    setMarksData({});
    setPublishedDates({});
    setCurrentStudentIndex(null);
    setStudentSelected(false);
  }, [selectedBatch]);

  useEffect(() => {
    if (selectedBatch && selectedSemester) {
      fetchAssignedCourses();
    } else {
      setAssignedCourses([]);
      setHasExistingResults(false);
    }
    setCurrentStudentIndex(null);
    setStudentSelected(false);
  }, [selectedBatch, selectedSemester]);

  useEffect(() => {
    if (
      selectedBatch &&
      selectedSemester &&
      sortedStudents.length > 0 &&
      coursesForEntry.length > 0
    ) {
      setMarksData({});
      setPublishedDates({});
      loadAllExistingResults();
    }
  }, [
    selectedBatch,
    selectedSemester,
    sortedStudents.length,
    coursesForEntry.length,
    selectedExamCategory,
  ]);

  // ===== RENDER =====
  if (initializing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Icons.Loader2
            size={48}
            className="animate-spin text-blue-600 mx-auto mb-4"
          />
          <p className="text-gray-600">Initializing examination system...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Success Toast */}
        {saveSuccess && (
          <div className="fixed top-20 right-6 z-50 bg-green-50 border-l-4 border-green-500 text-green-800 px-4 py-3 rounded-lg shadow-lg">
            <div className="flex items-center gap-2">
              <Icons.CheckCircle size={20} className="text-green-500" />
              <span className="font-medium">{saveSuccess}</span>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <span>📚</span>
            <span>/</span>
            <span>Examination</span>
            <span>/</span>
            <span className="text-gray-900 font-medium">
              TU Results Management
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Icons.GraduationCap className="text-blue-600" size={28} />
            TU Results Management
          </h1>
          <p className="text-gray-600 mt-1">
            Enter and edit grades for regular, supplementary, and improvement
            examinations
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Department <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                disabled={loading}
              >
                <option value="">Select Department</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name} ({dept.code})
                  </option>
                ))}
              </select>
            </div>

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
                    {batch.name}
                  </option>
                ))}
              </select>
            </div>

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
                {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                  <option key={sem} value={`semester${sem}`}>
                    Semester {sem}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Exam Category
              </label>
              <select
                value={selectedExamCategory}
                onChange={(e) => setSelectedExamCategory(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {examCategories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Summary Bar */}
          {selectedDepartment && selectedBatch && selectedSemester && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg flex items-center gap-6 flex-wrap">
              <div className="flex items-center gap-2">
                <Icons.Building size={16} className="text-blue-600" />
                <span className="text-sm">
                  <span className="text-gray-600">Dept:</span>{' '}
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
                <Icons.BookOpen size={16} className="text-blue-600" />
                <span className="text-sm">
                  <span className="text-gray-600">Semester:</span>{' '}
                  <span className="font-medium">
                    {selectedSemester.replace('semester', 'Semester ')}
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Icons.LayoutGrid size={16} className="text-blue-600" />
                <span className="text-sm">
                  <span className="text-gray-600">Courses:</span>{' '}
                  <span className="font-medium">{sortedCourses.length}</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Icons.UserCheck size={16} className="text-blue-600" />
                <span className="text-sm">
                  <span className="text-gray-600">Students:</span>{' '}
                  <span className="font-medium">{sortedStudents.length}</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Icons.CheckCircle size={16} className="text-green-600" />
                <span className="text-sm">
                  <span className="text-gray-600">Published:</span>{' '}
                  <span className="font-medium">
                    {Object.keys(publishedDates).length}
                  </span>
                </span>
              </div>
              {hasExistingResults && (
                <div className="flex items-center gap-2">
                  <Icons.Database size={16} className="text-purple-600" />
                  <span className="text-sm text-purple-700">
                    Results Loaded
                  </span>
                </div>
              )}
              {loadingResults && (
                <div className="flex items-center gap-2">
                  <Icons.Loader2
                    size={16}
                    className="animate-spin text-blue-600"
                  />
                  <span className="text-sm text-blue-700">
                    Loading results...
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Course Assignment Section */}
        {selectedBatch &&
          selectedSemester &&
          sortedCourses.length === 0 &&
          !loading && (
            <div className="mb-6">
              {showCourseAssignment ? (
                <CourseAssignmentInline
                  batchId={selectedBatch}
                  semester={selectedSemester}
                  departmentId={selectedDepartment}
                  onCoursesAssigned={handleCoursesAssigned}
                  onCancel={() => setShowCourseAssignment(false)}
                />
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
                  <Icons.AlertCircle
                    size={48}
                    className="mx-auto text-yellow-600 mb-4"
                  />
                  <h3 className="text-lg font-semibold text-yellow-800 mb-2">
                    No Courses Assigned
                  </h3>
                  <p className="text-yellow-700 mb-4">
                    No courses have been assigned to{' '}
                    {selectedSemester.replace('semester', 'Semester ')} for this
                    batch.
                  </p>
                  <button
                    onClick={() => setShowCourseAssignment(true)}
                    className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
                  >
                    <Icons.Plus size={16} />
                    Assign Courses Now
                  </button>
                </div>
              )}
            </div>
          )}

        {/* Student Selector */}
        {sortedCourses.length > 0 && sortedStudents.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700">
                Select Student
              </h3>
              {Object.keys(publishedDates).length > 0 && (
                <button
                  onClick={handlePublishAllResults}
                  disabled={loading}
                  className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
                >
                  <Icons.Globe size={14} />
                  Publish All Ready
                </button>
              )}
            </div>
            <StudentSelector
              students={sortedStudents}
              currentIndex={currentStudentIndex}
              onSelect={handleStudentSelect}
              marksData={marksData}
              courses={coursesForEntry}
              publishedDates={publishedDates}
            />
            {!studentSelected && (
              <p className="text-center text-gray-500 text-sm mt-3">
                👆 Click on a student above to enter or edit their marks
              </p>
            )}
          </div>
        )}

        {/* View Mode Toggle */}
        {studentSelected && currentStudent && (
          <div className="flex gap-2 mb-6 items-center justify-between">
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('entry')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  viewMode === 'entry'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Icons.Edit size={16} /> Marks Entry
              </button>
              <button
                onClick={() => setViewMode('report')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  viewMode === 'report'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Icons.FileText size={16} /> Report Card
              </button>
            </div>

            {/* Publish Status and Button */}
            <div className="flex items-center gap-3">
              {isCurrentStudentPublished ? (
                <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-1.5 rounded-lg">
                  <Icons.Globe size={16} />
                  <span className="text-sm">
                    Published:{' '}
                    {formatPublishedDate(publishedDates[currentStudent.id])}
                  </span>
                </div>
              ) : (
                <button
                  onClick={() => handlePublishStudentResults(currentStudent.id)}
                  disabled={publishingStudent === currentStudent.id}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {publishingStudent === currentStudent.id ? (
                    <>
                      <Icons.Loader2 size={16} className="animate-spin" />
                      Publishing...
                    </>
                  ) : (
                    <>
                      <Icons.Globe size={16} />
                      Publish Results
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Main Content */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Icons.Loader2 size={32} className="animate-spin text-blue-600" />
          </div>
        ) : !selectedDepartment ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <Icons.Building size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">Please select a department</p>
          </div>
        ) : !selectedBatch ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <Icons.Users size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">Please select a batch</p>
          </div>
        ) : !selectedSemester ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <Icons.BookOpen size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">Please select a semester</p>
          </div>
        ) : sortedCourses.length === 0 ? null : sortedStudents.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <Icons.UserX size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No students found in this batch</p>
          </div>
        ) : !studentSelected ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <Icons.UserPlus size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">
              Select a student from the list above to enter marks
            </p>
          </div>
        ) : viewMode === 'entry' && currentStudent ? (
          <>
            <MarksEntryGrid
              student={currentStudent}
              courses={coursesForEntry}
              marksData={marksData[currentStudent?.id] || {}}
              onMarksChange={handleMarksChange}
              onSave={() => handleSaveStudentMarks(currentStudent?.id)}
              saving={saving}
              isPublished={isCurrentStudentPublished}
            />

            <div className="flex justify-between mt-6">
              <button
                onClick={() => {
                  const prevIndex = Math.max(0, currentStudentIndex - 1);
                  setCurrentStudentIndex(prevIndex);
                }}
                disabled={currentStudentIndex === 0}
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 flex items-center gap-2"
              >
                <Icons.ChevronLeft size={18} /> Previous
              </button>

              <button
                onClick={handleSaveAllMarks}
                disabled={loading}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
              >
                <Icons.Save size={18} /> Save All Students
              </button>

              <button
                onClick={() => {
                  const nextIndex = Math.min(
                    sortedStudents.length - 1,
                    currentStudentIndex + 1
                  );
                  setCurrentStudentIndex(nextIndex);
                }}
                disabled={currentStudentIndex === sortedStudents.length - 1}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                Next <Icons.ChevronRight size={18} />
              </button>
            </div>

            <div className="mt-4 text-center text-sm text-gray-500">
              Student {currentStudentIndex + 1} of {sortedStudents.length}
            </div>
          </>
        ) : viewMode === 'report' && currentStudent ? (
          <ReportCard
            student={currentStudent}
            courses={coursesForEntry}
            marksData={marksData[currentStudent?.id] || {}}
            semester={selectedSemester}
            batchName={selectedBatchName}
            examName={`${selectedBatchName} - ${selectedSemester.replace(
              'semester',
              'Semester '
            )} - ${categoryLabel}`}
            examCategory={selectedExamCategory}
            publishedAt={publishedDates[currentStudent.id]}
          />
        ) : null}
      </div>
    </div>
  );
}
