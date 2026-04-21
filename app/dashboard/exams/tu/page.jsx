// app/dashboard/exams/tu-examination/page.jsx
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import * as Icons from 'lucide-react';
import MarksEntryGrid from '@/components/exam/MarksEntryGrid';
import ReportCard from '@/components/exam/ReportCard';
import StudentSelector from '@/components/exam/StudentSelector';
import CourseAssignmentInline from '@/components/exam/CourseAssignmentInline';
import ResultsOverviewTable from '@/components/exam/ResultsOverviewTable';

export default function TUExaminationPage() {
  // ===== STATE DECLARATIONS =====
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [selectedExamCategory, setSelectedExamCategory] = useState('regular');
  const [resultDate, setResultDate] = useState('');
  const [supplementaryAttempt, setSupplementaryAttempt] = useState(1);

  const [departments, setDepartments] = useState([]);
  const [batches, setBatches] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [assignedCourses, setAssignedCourses] = useState([]);
  const [regularResults, setRegularResults] = useState({});
  const [failedStudentsData, setFailedStudentsData] = useState({});
  const [supplementaryAttempts, setSupplementaryAttempts] = useState([]);
  const [supplementaryAttemptsData, setSupplementaryAttemptsData] = useState(
    {}
  );

  const [currentStudentIndex, setCurrentStudentIndex] = useState(null);
  const [marksData, setMarksData] = useState({});
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('entry');
  const [initializing, setInitializing] = useState(true);
  const [showCourseAssignment, setShowCourseAssignment] = useState(false);
  const [loadingResults, setLoadingResults] = useState(false);
  const [hasExistingResults, setHasExistingResults] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [studentSelected, setStudentSelected] = useState(false);
  const [showInactiveStudents, setShowInactiveStudents] = useState(false);

  const examCategories = [
    { value: 'regular', label: 'Regular Examination' },
    { value: 'supplementary', label: 'Supplementary Examination' },
  ];

  // ===== HELPER FUNCTIONS =====
  const sortCoursesByNumericCode = (courses) => {
    return [...courses].sort((a, b) => {
      const codeA = a.course?.code || a.code || '';
      const codeB = b.course?.code || b.code || '';
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

  // ===== MEMOIZED VALUES =====
  const sortedCourses = useMemo(() => {
    return sortCoursesByNumericCode(assignedCourses);
  }, [assignedCourses]);

  const coursesForEntry = useMemo(() => {
    return sortedCourses.map((c) => ({
      id: c.courseId || c.id,
      code: c.course?.code || c.code || 'N/A',
      name: c.course?.name || c.name || 'N/A',
      credits: c.course?.credits || c.credits || 3,
    }));
  }, [sortedCourses]);

  const selectedDepartmentName = useMemo(() => {
    return departments.find((d) => d.id.toString() === selectedDepartment)
      ?.name;
  }, [departments, selectedDepartment]);

  const selectedBatchName = useMemo(() => {
    return batches.find((b) => b.id.toString() === selectedBatch)?.name;
  }, [batches, selectedBatch]);

  const categoryLabel = useMemo(() => {
    const cat = examCategories.find((c) => c.value === selectedExamCategory);
    if (selectedExamCategory === 'supplementary' && supplementaryAttempt > 1) {
      return `${cat?.label} (Attempt ${supplementaryAttempt})`;
    }
    return cat?.label;
  }, [selectedExamCategory, supplementaryAttempt]);

  const examConfigKey = useMemo(() => {
    if (!selectedBatch || !selectedSemester || !selectedExamCategory)
      return null;
    const baseKey = `${selectedBatch}-${selectedSemester}-${selectedExamCategory}`;
    return selectedExamCategory === 'supplementary'
      ? `${baseKey}-attempt${supplementaryAttempt}`
      : baseKey;
  }, [
    selectedBatch,
    selectedSemester,
    selectedExamCategory,
    supplementaryAttempt,
  ]);

  const sortedStudents = useMemo(() => {
    let filteredStudents = [...allStudents];

    if (selectedExamCategory === 'supplementary') {
      const failedStudentIds = new Set(Object.keys(failedStudentsData));
      filteredStudents = filteredStudents.filter((student) =>
        failedStudentIds.has(student.id.toString())
      );
    }

    if (!showInactiveStudents) {
      filteredStudents = filteredStudents.filter((student) => {
        if (student.status === 'active') return true;
        if (
          student.status === 'inactive' &&
          student.inactiveDate &&
          resultDate
        ) {
          try {
            return student.inactiveDate.split('T')[0] > resultDate;
          } catch {
            return false;
          }
        }
        return false;
      });
    }

    return filteredStudents.sort(
      (a, b) => a.name?.localeCompare(b.name || '') || 0
    );
  }, [
    allStudents,
    resultDate,
    showInactiveStudents,
    selectedExamCategory,
    failedStudentsData,
  ]);

  const currentStudent = useMemo(() => {
    if (currentStudentIndex !== null && sortedStudents[currentStudentIndex]) {
      return sortedStudents[currentStudentIndex];
    }
    return null;
  }, [sortedStudents, currentStudentIndex]);

  // In TUExaminationPage.jsx, replace the filteredCoursesForEntry useMemo

  const filteredCoursesForEntry = useMemo(() => {
    console.log('=== filteredCoursesForEntry DEBUG ===');
    console.log('selectedExamCategory:', selectedExamCategory);
    console.log('currentStudent:', currentStudent?.id, currentStudent?.name);
    console.log(
      'coursesForEntry:',
      coursesForEntry.map((c) => ({ id: c.id, code: c.code }))
    );
    console.log('failedStudentsData:', failedStudentsData);

    if (selectedExamCategory !== 'supplementary' || !currentStudent) {
      console.log('Returning all courses (not supplementary or no student)');
      return coursesForEntry;
    }

    const studentFailedData = failedStudentsData[currentStudent.id];
    console.log('Student failed data:', studentFailedData);

    if (!studentFailedData) {
      console.log('No failed data for student, returning empty array');
      return [];
    }

    // Check all possible places where failed subjects might be stored
    let failedCourseIds = new Set();

    // Check remainingFailedSubjects
    if (
      studentFailedData.remainingFailedSubjects &&
      Array.isArray(studentFailedData.remainingFailedSubjects)
    ) {
      studentFailedData.remainingFailedSubjects.forEach((subject) => {
        console.log('remainingFailedSubject:', subject);
        if (subject.courseId) failedCourseIds.add(subject.courseId);
        if (subject.id) failedCourseIds.add(subject.id);
      });
    }

    // Check regularFailedSubjects
    if (
      studentFailedData.regularFailedSubjects &&
      Array.isArray(studentFailedData.regularFailedSubjects)
    ) {
      studentFailedData.regularFailedSubjects.forEach((subject) => {
        console.log('regularFailedSubject:', subject);
        if (subject.courseId) failedCourseIds.add(subject.courseId);
        if (subject.id) failedCourseIds.add(subject.id);
      });
    }

    // Check failedSubjects (from the failed-students API)
    if (
      studentFailedData.failedSubjects &&
      Array.isArray(studentFailedData.failedSubjects)
    ) {
      studentFailedData.failedSubjects.forEach((subject) => {
        console.log('failedSubject:', subject);
        if (subject.courseId) failedCourseIds.add(subject.courseId);
        if (subject.id) failedCourseIds.add(subject.id);
      });
    }

    console.log('Failed course IDs set:', Array.from(failedCourseIds));

    const filtered = coursesForEntry.filter((course) => {
      const isFailed =
        failedCourseIds.has(course.id) ||
        failedCourseIds.has(course.id.toString());
      console.log(
        `Course ${course.code} (id: ${course.id}): isFailed=${isFailed}`
      );
      return isFailed;
    });

    console.log(
      'Filtered courses:',
      filtered.map((c) => ({ id: c.id, code: c.code }))
    );

    return filtered;
  }, [
    coursesForEntry,
    selectedExamCategory,
    currentStudent,
    failedStudentsData,
  ]);

  const isCurrentStudentInactive = useMemo(() => {
    return currentStudent?.status === 'inactive';
  }, [currentStudent]);

  const filteredInactiveCount = useMemo(() => {
    if (showInactiveStudents) return 0;
    return allStudents.filter((student) => {
      if (student.status !== 'inactive') return false;
      if (!student.inactiveDate || !resultDate) return true;
      return student.inactiveDate.split('T')[0] <= resultDate;
    }).length;
  }, [allStudents, resultDate, showInactiveStudents]);

  const shownInactiveCount = useMemo(() => {
    if (showInactiveStudents) {
      return allStudents.filter((s) => s.status === 'inactive').length;
    }
    return allStudents.filter((student) => {
      if (student.status !== 'inactive') return false;
      if (!student.inactiveDate || !resultDate) return false;
      return student.inactiveDate.split('T')[0] > resultDate;
    }).length;
  }, [allStudents, resultDate, showInactiveStudents]);

  // ===== API FUNCTIONS =====
  const fetchDepartments = useCallback(async () => {
    try {
      const response = await fetch('/api/departments/all');
      if (!response.ok) throw new Error('Failed to fetch departments');
      const data = await response.json();
      setDepartments(
        Array.isArray(data)
          ? data.sort((a, b) => a.name.localeCompare(b.name))
          : []
      );
    } catch (error) {
      console.error('Error fetching departments:', error);
    } finally {
      setInitializing(false);
    }
  }, []);

  const fetchBatches = useCallback(async (departmentId) => {
    if (!departmentId) return;
    setLoading(true);
    try {
      const response = await fetch(
        `/api/batches?departmentId=${departmentId}&limit=100`
      );
      if (!response.ok) throw new Error('Failed to fetch batches');
      const data = await response.json();
      const batchList = data.batches || data;
      const activeBatches = batchList.filter((b) => b.status === 'active');
      setBatches(activeBatches.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (error) {
      console.error('Error fetching batches:', error);
      setBatches([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStudents = useCallback(async (batchId) => {
    if (!batchId) return;
    try {
      const response = await fetch(`/api/batches/${batchId}/students`);
      if (!response.ok) throw new Error('Failed to fetch students');
      const data = await response.json();
      setAllStudents(data.students || data || []);
      setCurrentStudentIndex(null);
      setStudentSelected(false);
    } catch (error) {
      console.error('Error fetching students:', error);
      setAllStudents([]);
    }
  }, []);

  const fetchAssignedCourses = useCallback(async () => {
    if (!selectedBatch || !selectedSemester) return;
    setLoading(true);
    try {
      const response = await fetch(
        `/api/batches/${selectedBatch}/courses?semester=${selectedSemester}`
      );
      if (!response.ok) throw new Error('Failed to fetch courses');
      const data = await response.json();
      setAssignedCourses(data.courses || []);
    } catch (error) {
      console.error('Error fetching assigned courses:', error);
      setAssignedCourses([]);
    } finally {
      setLoading(false);
    }
  }, [selectedBatch, selectedSemester]);

  // In TUExaminationPage.jsx, update the fetchSupplementaryAttemptsData function:

  const fetchSupplementaryAttemptsData = useCallback(async () => {
    if (!selectedBatch || !selectedSemester) {
      console.log('Skipping fetch - missing batch or semester');
      return;
    }

    try {
      console.log(
        'Fetching supplementary attempts for batch:',
        selectedBatch,
        'semester:',
        selectedSemester
      );

      const url = `/api/results/supplementary-attempts?batchId=${selectedBatch}&semester=${selectedSemester}`;
      const response = await fetch(url);

      if (response.ok) {
        const data = await response.json();
        console.log('Supplementary attempts data received:', data);

        // The API already returns properly formatted data
        setSupplementaryAttemptsData(data.attemptsByStudent || {});
      } else {
        console.error(
          'Failed to fetch supplementary attempts:',
          response.status
        );
        // Try to get error details
        const errorText = await response.text();
        console.error('Error details:', errorText);
        setSupplementaryAttemptsData({});
      }
    } catch (error) {
      console.error('Error fetching supplementary attempts:', error);
      setSupplementaryAttemptsData({});
    }
  }, [selectedBatch, selectedSemester]);

  // In TUExaminationPage.jsx, update fetchFailedStudentsForSupplementary

  const fetchFailedStudentsForSupplementary = useCallback(async () => {
    if (!selectedBatch || !selectedSemester) return;
    try {
      const url = `/api/results/failed-students?batchId=${selectedBatch}&semester=${selectedSemester}`;
      console.log('Fetching failed students from:', url);

      const response = await fetch(url);
      if (!response.ok) {
        console.error('Failed to fetch failed students:', response.status);
        setFailedStudentsData({});
        return;
      }
      const data = await response.json();
      console.log('Failed students API response:', data);
      console.log('failedStudentsData structure:', data.failedStudentsData);

      // Log the structure for the first student to understand the data format
      const firstStudentId = Object.keys(data.failedStudentsData || {})[0];
      if (firstStudentId) {
        console.log(
          `Example student ${firstStudentId} data:`,
          data.failedStudentsData[firstStudentId]
        );
      }

      setFailedStudentsData(data.failedStudentsData || {});
    } catch (error) {
      console.error('Error fetching failed students:', error);
      setFailedStudentsData({});
    }
  }, [selectedBatch, selectedSemester]);

  const fetchRegularExamResults = useCallback(async () => {
    if (!selectedBatch || !selectedSemester) return;
    try {
      const url = `/api/results?batchId=${selectedBatch}&semester=${selectedSemester}&examCategory=regular`;
      const response = await fetch(url);
      if (!response.ok) {
        setRegularResults({});
        return;
      }
      const data = await response.json();
      setRegularResults(data.results || {});
    } catch (error) {
      console.error('Error fetching regular exam results:', error);
      setRegularResults({});
    }
  }, [selectedBatch, selectedSemester]);

  const fetchResultDateForConfig = useCallback(async () => {
    if (!examConfigKey) return;
    try {
      let url = `/api/exam-config?batchId=${selectedBatch}&semester=${selectedSemester}&examCategory=${selectedExamCategory}`;
      if (selectedExamCategory === 'supplementary') {
        url += `&attempt=${supplementaryAttempt}`;
      }
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setResultDate(data.resultDate ? data.resultDate.split('T')[0] : '');
      } else {
        setResultDate('');
      }
    } catch (error) {
      console.error('Error fetching result date:', error);
      setResultDate('');
    }
  }, [
    examConfigKey,
    selectedBatch,
    selectedSemester,
    selectedExamCategory,
    supplementaryAttempt,
  ]);

  const saveResultDateForConfig = useCallback(
    async (date) => {
      if (!examConfigKey || !date) return;
      try {
        await fetch('/api/exam-config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            batchId: parseInt(selectedBatch),
            semester: selectedSemester,
            examCategory: selectedExamCategory,
            attempt:
              selectedExamCategory === 'supplementary'
                ? supplementaryAttempt
                : null,
            resultDate: date,
          }),
        });
      } catch (error) {
        console.error('Error saving result date:', error);
      }
    },
    [
      examConfigKey,
      selectedBatch,
      selectedSemester,
      selectedExamCategory,
      supplementaryAttempt,
    ]
  );

  const initializeEmptyMarks = useCallback(() => {
    const initialMarks = {};
    sortedStudents.forEach((student) => {
      initialMarks[student.id] = {};
      coursesForEntry.forEach((course) => {
        let initialGradePoint = '';
        if (
          selectedExamCategory === 'supplementary' &&
          failedStudentsData[student.id]
        ) {
          const failedSubject = failedStudentsData[
            student.id
          ].failedSubjects?.find((s) => s.courseId === course.id);
          if (failedSubject) initialGradePoint = failedSubject.gpa;
        }
        initialMarks[student.id][course.id] = {
          gradePoint: initialGradePoint,
          grade: null,
          isPassed: null,
        };
      });
    });
    setMarksData(initialMarks);
    setHasExistingResults(false);
  }, [
    sortedStudents,
    coursesForEntry,
    selectedExamCategory,
    failedStudentsData,
  ]);

  const loadAllExistingResults = useCallback(async () => {
    if (!selectedBatch || !selectedExamCategory) return;
    setLoadingResults(true);
    try {
      let url = `/api/results?batchId=${selectedBatch}&examCategory=${selectedExamCategory}&semester=${selectedSemester}`;
      if (selectedExamCategory === 'supplementary') {
        url += `&attempt=${supplementaryAttempt}`;
      }
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch results');
      const data = await response.json();
      const existingResults = data.results || {};

      const updatedMarks = {};
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

      let commonResultDate = null;
      Object.entries(existingResults).forEach(([studentId, studentCourses]) => {
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
              if (!commonResultDate && result.resultDate) {
                commonResultDate = result.resultDate.split('T')[0];
              }
            }
          });
        }
      });

      setMarksData(updatedMarks);
      setHasExistingResults(Object.keys(existingResults).length > 0);
      if (commonResultDate) setResultDate(commonResultDate);
    } catch (error) {
      console.error('Error loading results:', error);
      setSaveError(error.message);
      initializeEmptyMarks();
    } finally {
      setLoadingResults(false);
    }
  }, [
    selectedBatch,
    selectedSemester,
    selectedExamCategory,
    supplementaryAttempt,
    sortedStudents,
    coursesForEntry,
    initializeEmptyMarks,
  ]);

  // ===== EVENT HANDLERS =====
  const handleStudentSelect = useCallback((index) => {
    setCurrentStudentIndex(index);
    setStudentSelected(true);
  }, []);

  // In TUExaminationPage.jsx, verify the handleMarksChange function

  const handleMarksChange = useCallback((studentId, courseId, field, value) => {
    setMarksData((prev) => {
      const currentStudentMarks = prev[studentId] || {};
      const currentCourseMarks = currentStudentMarks[courseId] || {};

      // Ensure we properly store the value, especially for 0
      const updatedCourseMarks = {
        ...currentCourseMarks,
        [field]: value,
      };

      console.log(
        `Marks change - Student: ${studentId}, Course: ${courseId}, Field: ${field}, Value: ${value} (type: ${typeof value})`
      );

      return {
        ...prev,
        [studentId]: {
          ...currentStudentMarks,
          [courseId]: updatedCourseMarks,
        },
      };
    });
  }, []);

  const handleResultDateChange = useCallback(
    async (e) => {
      const newDate = e.target.value;
      setResultDate(newDate);
      if (newDate) await saveResultDateForConfig(newDate);
      setCurrentStudentIndex(null);
      setStudentSelected(false);
    },
    [saveResultDateForConfig]
  );

  const handleExamCategoryChange = useCallback(
    (e) => {
      const newCategory = e.target.value;
      setSelectedExamCategory(newCategory);
      setCurrentStudentIndex(null);
      setStudentSelected(false);
      setMarksData({});
      setResultDate('');
      if (
        newCategory === 'supplementary' &&
        selectedBatch &&
        selectedSemester
      ) {
        fetchFailedStudentsForSupplementary();
      }
    },
    [selectedBatch, selectedSemester, fetchFailedStudentsForSupplementary]
  );

  const handleSupplementaryAttemptChange = useCallback((e) => {
    setSupplementaryAttempt(parseInt(e.target.value));
    setCurrentStudentIndex(null);
    setStudentSelected(false);
    setMarksData({});
    setResultDate('');
  }, []);

  const handleViewSupplementaryResult = useCallback(
    (student, attempt) => {
      setSelectedExamCategory('supplementary');
      setSupplementaryAttempt(attempt.attemptNumber || 1);
      if (attempt.resultDate) {
        setResultDate(new Date(attempt.resultDate).toISOString().split('T')[0]);
      }
      setTimeout(() => {
        const studentIndex = sortedStudents.findIndex(
          (s) => s.id === student.id
        );
        if (studentIndex !== -1) {
          setCurrentStudentIndex(studentIndex);
          setStudentSelected(true);
          setViewMode('report');
        }
      }, 100);
    },
    [sortedStudents]
  );

  // In TUExaminationPage.jsx, update the handleSaveStudentMarks function

  // In TUExaminationPage.jsx, update the handleSaveStudentMarks function

  // In TUExaminationPage.jsx, replace the handleSaveStudentMarks function

  const handleSaveStudentMarks = useCallback(
    async (studentId) => {
      if (!selectedBatch || !selectedExamCategory) {
        setSaveError('Please select batch and exam category first.');
        return;
      }
      if (!resultDate) {
        setSaveError('Please select a result date before saving.');
        return;
      }

      setSaving(true);
      setSaveError(null);
      setSaveSuccess(null);

      try {
        const studentMarks = marksData[studentId] || {};
        const coursesToUse =
          selectedExamCategory === 'supplementary'
            ? filteredCoursesForEntry
            : coursesForEntry;

        console.log('=== SAVE DEBUG ===');
        console.log('Student ID:', studentId);
        console.log('Exam Category:', selectedExamCategory);
        console.log(
          'Courses to use:',
          coursesToUse.map((c) => ({ id: c.id, code: c.code }))
        );
        console.log('Student marks keys:', Object.keys(studentMarks));
        console.log(
          'Full student marks:',
          JSON.stringify(studentMarks, null, 2)
        );

        // Build a map of course IDs for quick lookup
        const courseIdMap = new Map();
        coursesToUse.forEach((course) => {
          courseIdMap.set(course.id.toString(), course);
          courseIdMap.set(course.id, course);
        });

        // FIXED: Properly check for valid grades including 0
        const results = [];

        Object.entries(studentMarks).forEach(([courseId, data]) => {
          console.log(`Processing course ${courseId}:`, data);

          // Check if this course is in the coursesToUse list (try both string and number)
          const course =
            courseIdMap.get(courseId) || courseIdMap.get(parseInt(courseId));

          if (!course) {
            console.log(`  Course ${courseId} NOT found in coursesToUse`);
            return;
          }

          console.log(`  Course ${courseId} FOUND: ${course.code}`);

          // Check if gradePoint exists and is a valid number (including 0)
          const gradePoint = data.gradePoint;
          const hasValue =
            gradePoint !== undefined &&
            gradePoint !== null &&
            gradePoint !== '';

          console.log(
            `  gradePoint=${gradePoint}, hasValue=${hasValue}, type=${typeof gradePoint}`
          );

          if (hasValue) {
            const parsedGrade = parseFloat(gradePoint);
            console.log(
              `  parsedGrade=${parsedGrade}, isNaN=${isNaN(parsedGrade)}`
            );

            if (!isNaN(parsedGrade)) {
              results.push({
                courseId: parseInt(courseId),
                gradePoint: parsedGrade,
              });
              console.log(
                `  ADDED to results: courseId=${courseId}, gradePoint=${parsedGrade}`
              );
            }
          }
        });

        console.log('Final results array:', results);
        console.log('Results length:', results.length);

        if (results.length === 0) {
          // Count how many grades were actually entered
          const enteredGrades = Object.entries(studentMarks).filter(
            ([_, data]) => {
              const gp = data.gradePoint;
              return gp !== undefined && gp !== null && gp !== '';
            }
          );

          console.log('Entered grades:', enteredGrades);

          // Check if the issue is course ID mismatch
          const enteredCourseIds = enteredGrades.map(([id]) => id);
          const availableCourseIds = coursesToUse.map((c) => c.id.toString());

          console.log('Entered course IDs:', enteredCourseIds);
          console.log('Available course IDs:', availableCourseIds);

          const mismatch = enteredCourseIds.filter(
            (id) => !availableCourseIds.includes(id)
          );
          if (mismatch.length > 0) {
            setSaveError(
              `Course ID mismatch. Entered: ${enteredCourseIds.join(
                ', '
              )}, Available: ${availableCourseIds.join(', ')}`
            );
          } else {
            setSaveError(
              `No valid grades found. Please enter at least one grade (including 0).`
            );
          }
          return;
        }

        console.log('Sending to API:', {
          studentId: parseInt(studentId),
          batchId: parseInt(selectedBatch),
          semester: selectedSemester,
          examCategory: selectedExamCategory,
          attempt:
            selectedExamCategory === 'supplementary'
              ? supplementaryAttempt
              : null,
          resultDate: resultDate,
          results: results,
        });

        const response = await fetch('/api/results', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId: parseInt(studentId),
            batchId: parseInt(selectedBatch),
            semester: selectedSemester,
            examCategory: selectedExamCategory,
            attempt:
              selectedExamCategory === 'supplementary'
                ? supplementaryAttempt
                : null,
            resultDate: resultDate,
            results,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to save results');
        }

        const data = await response.json();
        setSaveSuccess(
          `Results saved successfully! (${
            data.count || results.length
          } courses)`
        );

        // Refresh both regular and supplementary data
        await loadAllExistingResults();
        await fetchSupplementaryAttemptsData();
      } catch (error) {
        console.error('Error saving results:', error);
        setSaveError(error.message);
      } finally {
        setSaving(false);
      }
    },
    [
      selectedBatch,
      selectedSemester,
      selectedExamCategory,
      supplementaryAttempt,
      resultDate,
      marksData,
      coursesForEntry,
      filteredCoursesForEntry,
      loadAllExistingResults,
      fetchSupplementaryAttemptsData,
    ]
  );

  // In TUExaminationPage.jsx, update the handleSaveAllMarks function

  const handleSaveAllMarks = useCallback(async () => {
    if (!selectedBatch || !selectedExamCategory) {
      setSaveError('Please select batch and exam category first.');
      return;
    }
    if (!resultDate) {
      setSaveError('Please select a result date before saving all marks.');
      return;
    }

    setLoading(true);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      // FIXED: Properly check for valid grades including 0
      const allMarks = Object.entries(marksData)
        .map(([studentId, studentMarks]) => {
          const results = Object.entries(studentMarks)
            .map(([courseId, data]) => {
              // Check if gradePoint exists and is a valid number (including 0)
              const hasValue =
                data.gradePoint !== undefined &&
                data.gradePoint !== null &&
                data.gradePoint !== '';

              return {
                courseId: parseInt(courseId),
                gradePoint: hasValue ? parseFloat(data.gradePoint) : null,
              };
            })
            .filter((r) => r.gradePoint !== null && !isNaN(r.gradePoint));

          return {
            studentId: parseInt(studentId),
            results,
          };
        })
        .filter((s) => s.results.length > 0);

      if (allMarks.length === 0) {
        setSaveError(
          'No grades entered to save. Please enter at least one grade (including 0).'
        );
        return;
      }

      console.log(`Saving marks for ${allMarks.length} students`);

      let savedCount = 0;
      let failedCount = 0;
      const errors = [];

      for (const studentData of allMarks) {
        try {
          const response = await fetch('/api/results', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              studentId: studentData.studentId,
              batchId: parseInt(selectedBatch),
              semester: selectedSemester,
              examCategory: selectedExamCategory,
              attempt:
                selectedExamCategory === 'supplementary'
                  ? supplementaryAttempt
                  : null,
              resultDate: resultDate,
              results: studentData.results,
            }),
          });

          if (response.ok) {
            savedCount++;
          } else {
            failedCount++;
            const error = await response.json().catch(() => ({}));
            errors.push(
              `Student ${studentData.studentId}: ${
                error.error || 'Unknown error'
              }`
            );
          }
        } catch (err) {
          failedCount++;
          console.error(`Error saving student ${studentData.studentId}:`, err);
          errors.push(`Student ${studentData.studentId}: ${err.message}`);
        }
      }

      if (savedCount > 0) {
        setSaveSuccess(
          `Saved ${savedCount} students successfully!${
            failedCount > 0 ? ` (${failedCount} failed)` : ''
          }`
        );
      }

      if (failedCount > 0) {
        console.error('Save errors:', errors);
        setSaveError(
          `${failedCount} student(s) failed to save. Check console for details.`
        );
      }

      // Refresh data
      await loadAllExistingResults();
      await fetchSupplementaryAttemptsData();
    } catch (error) {
      console.error('Error saving all results:', error);
      setSaveError(error.message);
    } finally {
      setLoading(false);
    }
  }, [
    selectedBatch,
    selectedSemester,
    selectedExamCategory,
    supplementaryAttempt,
    resultDate,
    marksData,
    loadAllExistingResults,
    fetchSupplementaryAttemptsData,
  ]);
  const handleCoursesAssigned = useCallback(() => {
    fetchAssignedCourses();
    setShowCourseAssignment(false);
  }, [fetchAssignedCourses]);

  // ===== EFFECTS =====
  useEffect(() => {
    if (saveSuccess) setTimeout(() => setSaveSuccess(null), 3000);
  }, [saveSuccess]);

  useEffect(() => {
    if (saveError) setTimeout(() => setSaveError(null), 5000);
  }, [saveError]);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  useEffect(() => {
    if (selectedDepartment) fetchBatches(selectedDepartment);
    setSelectedBatch('');
    setSelectedSemester('');
    setAssignedCourses([]);
    setAllStudents([]);
    setMarksData({});
    setCurrentStudentIndex(null);
    setStudentSelected(false);
    setResultDate('');
    setFailedStudentsData({});
    setSupplementaryAttemptsData({});
  }, [selectedDepartment, fetchBatches]);

  useEffect(() => {
    if (selectedBatch) fetchStudents(selectedBatch);
    setSelectedSemester('');
    setAssignedCourses([]);
    setMarksData({});
    setCurrentStudentIndex(null);
    setStudentSelected(false);
    setResultDate('');
    setFailedStudentsData({});
    setSupplementaryAttemptsData({});
  }, [selectedBatch, fetchStudents]);

  // Update the useEffect in TUExaminationPage.jsx

  useEffect(() => {
    if (selectedBatch && selectedSemester) {
      fetchAssignedCourses();
      fetchRegularExamResults();
      // ALWAYS fetch supplementary attempts data, regardless of exam category
      fetchSupplementaryAttemptsData();
      if (selectedExamCategory === 'supplementary') {
        fetchFailedStudentsForSupplementary();
      }
    } else {
      setAssignedCourses([]);
      setFailedStudentsData({});
      setSupplementaryAttemptsData({});
    }
    setCurrentStudentIndex(null);
    setStudentSelected(false);
  }, [
    selectedBatch,
    selectedSemester,
    selectedExamCategory,
    fetchAssignedCourses,
    fetchRegularExamResults,
    fetchFailedStudentsForSupplementary,
    fetchSupplementaryAttemptsData,
  ]);

  useEffect(() => {
    if (examConfigKey) fetchResultDateForConfig();
  }, [examConfigKey, fetchResultDateForConfig]);

  useEffect(() => {
    if (selectedExamCategory === 'supplementary' && sortedStudents.length > 0) {
      initializeEmptyMarks();
    }
  }, [selectedExamCategory, sortedStudents.length, initializeEmptyMarks]);

  useEffect(() => {
    if (
      selectedBatch &&
      selectedSemester &&
      sortedStudents.length > 0 &&
      coursesForEntry.length > 0
    ) {
      setMarksData({});
      loadAllExistingResults();
    }
  }, [
    selectedBatch,
    selectedSemester,
    sortedStudents.length,
    coursesForEntry.length,
    selectedExamCategory,
    supplementaryAttempt,
    loadAllExistingResults,
  ]);

  // Add this helper function at the top of your component, before the state declarations

  const formatAttemptDate = (resultDate) => {
    if (!resultDate) return 'Date not set';
    try {
      const date = new Date(resultDate);
      // Check if date is valid
      if (isNaN(date.getTime())) return 'Invalid date';
      // Check if it's the default epoch date
      if (
        date.getFullYear() <= 1970 &&
        date.getMonth() === 0 &&
        date.getDate() <= 2
      ) {
        return 'Date not recorded';
      }
      return date.toLocaleDateString();
    } catch (error) {
      return 'Invalid date';
    }
  };

  // Then use it in the display:
  {
    selectedExamCategory === 'supplementary' && (
      <div className="mt-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Supplementary Attempt
        </label>
        <div className="flex items-center gap-3">
          <select
            value={supplementaryAttempt}
            onChange={handleSupplementaryAttemptChange}
            className="w-full md:w-48 rounded-lg border border-gray-300 px-3 py-2.5 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
          >
            <option value={1}>Attempt 1</option>
            <option value={2}>Attempt 2</option>
            <option value={3}>Attempt 3</option>
            <option value={4}>Attempt 4</option>
          </select>
          {supplementaryAttempts.length > 0 && (
            <div className="flex flex-col gap-1">
              <p className="text-sm text-purple-700">
                <Icons.Info size={16} className="inline mr-1" />
                Previous attempts:
              </p>
              <div className="flex flex-wrap gap-2">
                {supplementaryAttempts.map((a) => (
                  <span
                    key={a.attemptNumber}
                    className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded"
                  >
                    Attempt {a.attemptNumber} ({formatAttemptDate(a.resultDate)}
                    )
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

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

  const coursesToDisplay =
    selectedExamCategory === 'supplementary' && currentStudent
      ? filteredCoursesForEntry
      : coursesForEntry;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Toasts */}
        {saveSuccess && (
          <div className="fixed top-20 right-6 z-50 bg-green-50 border-l-4 border-green-500 text-green-800 px-4 py-3 rounded-lg shadow-lg">
            <div className="flex items-center gap-2">
              <Icons.CheckCircle size={20} className="text-green-500" />
              <span className="font-medium">{saveSuccess}</span>
            </div>
          </div>
        )}
        {saveError && (
          <div className="fixed top-20 right-6 z-50 bg-red-50 border-l-4 border-red-500 text-red-800 px-4 py-3 rounded-lg shadow-lg">
            <div className="flex items-center gap-2">
              <Icons.AlertCircle size={20} className="text-red-500" />
              <span className="font-medium">{saveError}</span>
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
            Enter and edit grades for examinations
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
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
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
                onChange={handleExamCategoryChange}
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

          {selectedExamCategory === 'supplementary' && (
            <div className="mt-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Supplementary Attempt
              </label>
              <div className="flex items-center gap-3">
                <select
                  value={supplementaryAttempt}
                  onChange={handleSupplementaryAttemptChange}
                  className="w-full md:w-48 rounded-lg border border-gray-300 px-3 py-2.5 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                >
                  <option value={1}>Attempt 1</option>
                  <option value={2}>Attempt 2</option>
                  <option value={3}>Attempt 3</option>
                  <option value={4}>Attempt 4</option>
                </select>
                {supplementaryAttempts.length > 0 && (
                  <p className="text-sm text-purple-700">
                    <Icons.Info size={16} className="inline mr-1" />
                    Previous attempts:{' '}
                    {supplementaryAttempts
                      .map((a) => {
                        // Safely format the date
                        let dateStr = 'Date not set';
                        if (a.resultDate) {
                          try {
                            const date = new Date(a.resultDate);
                            // Check if date is valid
                            if (
                              !isNaN(date.getTime()) &&
                              date.getFullYear() > 1970
                            ) {
                              dateStr = date.toLocaleDateString();
                            }
                          } catch (e) {
                            dateStr = 'Invalid date';
                          }
                        }
                        return `Attempt ${a.attemptNumber} (${dateStr})`;
                      })
                      .join(', ')}
                  </p>
                )}
              </div>
            </div>
          )}
          {/* Supplementary Info */}
          {selectedExamCategory === 'supplementary' && (
            <div className="mt-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
              <div className="flex items-start gap-3">
                <Icons.AlertTriangle
                  size={20}
                  className="text-orange-600 mt-0.5"
                />
                <div>
                  <p className="text-sm font-medium text-orange-800">
                    Supplementary Examination Mode - Attempt{' '}
                    {supplementaryAttempt}
                  </p>
                  <p className="text-sm text-orange-700 mt-1">
                    Only showing students who failed in regular examination for{' '}
                    <span className="font-semibold">
                      {selectedSemester?.replace('semester', 'Semester ')}
                    </span>
                    .
                  </p>
                  <p className="text-sm text-orange-600 mt-1">
                    Failed Students: {sortedStudents.length} | Total Failed
                    Subjects:{' '}
                    {Object.values(failedStudentsData).reduce(
                      (acc, data) => acc + (data.failedCount || 0),
                      0
                    )}
                  </p>
                  {selectedSemester &&
                    Object.keys(failedStudentsData).length === 0 && (
                      <p className="text-sm text-green-600 mt-1">
                        ✅ All students passed! No supplementary exam needed.
                      </p>
                    )}
                </div>
              </div>
            </div>
          )}
          {/* Result Date */}
          {selectedBatch && selectedSemester && (
            <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Result Date for{' '}
                {selectedSemester.replace('semester', 'Semester ')} -{' '}
                {categoryLabel} <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="date"
                  value={resultDate}
                  onChange={handleResultDateChange}
                  className="w-full md:w-64 rounded-lg border border-gray-300 px-3 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  max={new Date().toISOString().split('T')[0]}
                />
                <p className="text-sm text-gray-600">
                  <Icons.Info size={16} className="inline mr-1" />
                  {selectedExamCategory === 'supplementary'
                    ? `Set result date for attempt ${supplementaryAttempt}`
                    : 'Students inactive before this date will be hidden'}
                </p>
              </div>
            </div>
          )}
          {/* Summary Bar */}
          {selectedDepartment && selectedBatch && selectedSemester && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-6 flex-wrap">
                <div className="flex items-center gap-2">
                  <Icons.Building size={16} className="text-blue-600" />
                  <span className="text-sm">
                    <span className="text-gray-600">Dept:</span>{' '}
                    <span className="font-medium">
                      {selectedDepartmentName}
                    </span>
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
                {resultDate && (
                  <div className="flex items-center gap-2">
                    <Icons.Calendar size={16} className="text-blue-600" />
                    <span className="text-sm">
                      <span className="text-gray-600">Result Date:</span>{' '}
                      <span className="font-medium">
                        {new Date(resultDate).toLocaleDateString()}
                      </span>
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Course Assignment */}
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
                    No courses assigned to{' '}
                    {selectedSemester.replace('semester', 'Semester ')}.
                  </p>
                  <button
                    onClick={() => setShowCourseAssignment(true)}
                    className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-flex items-center gap-2"
                  >
                    <Icons.Plus size={16} /> Assign Courses Now
                  </button>
                </div>
              )}
            </div>
          )}

        {/* Student Selector */}
        {sortedCourses.length > 0 && sortedStudents.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
            <StudentSelector
              students={sortedStudents}
              currentIndex={currentStudentIndex}
              onSelect={handleStudentSelect}
              marksData={marksData}
              courses={coursesToDisplay}
            />
            {!studentSelected && (
              <p className="text-center text-gray-500 text-sm mt-3">
                👆 Click on a student to enter marks
              </p>
            )}
          </div>
        )}

        {/* View Mode Toggle */}
        {studentSelected && currentStudent && viewMode !== 'overview' && (
          <div className="flex gap-2 mb-6 items-center justify-between">
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('entry')}
                className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 ${
                  viewMode === 'entry'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
                disabled={isCurrentStudentInactive}
              >
                <Icons.Edit size={16} /> Marks Entry
              </button>
              <button
                onClick={() => setViewMode('report')}
                className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 ${
                  viewMode === 'report'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Icons.FileText size={16} /> Report Card
              </button>
            </div>
            {isCurrentStudentInactive && (
              <div className="flex items-center gap-2 text-orange-600 bg-orange-50 px-3 py-1.5 rounded-lg">
                <Icons.AlertTriangle size={16} />
                <span className="text-sm">
                  Student is inactive - cannot edit
                </span>
              </div>
            )}
          </div>
        )}

        {/* Overview Toggle */}
        {sortedCourses.length > 0 && sortedStudents.length > 0 && (
          <div className="flex justify-end mb-4">
            <button
              onClick={() => {
                setViewMode('overview');
                setStudentSelected(false);
                setCurrentStudentIndex(null);
              }}
              className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 ${
                viewMode === 'overview'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Icons.LayoutGrid size={16} />{' '}
              {viewMode === 'overview'
                ? 'Overview View'
                : 'Show All Results Overview'}
            </button>
            {viewMode === 'overview' && (
              <button
                onClick={() => setViewMode('entry')}
                className="ml-3 px-4 py-2 rounded-lg font-medium bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 flex items-center gap-2"
              >
                <Icons.ArrowLeft size={16} /> Back to Entry
              </button>
            )}
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
        ) : !resultDate ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <Icons.Calendar size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">Please select a result date</p>
          </div>
        ) : sortedCourses.length === 0 ? null : sortedStudents.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <Icons.UserX size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">
              {selectedExamCategory === 'supplementary'
                ? `No failed students found for ${selectedSemester?.replace(
                    'semester',
                    'Semester '
                  )}`
                : 'No students found'}
            </p>
          </div>
        ) : viewMode === 'overview' ? (
          <ResultsOverviewTable
            students={sortedStudents}
            courses={coursesForEntry}
            marksData={marksData}
            batchName={selectedBatchName}
            semester={selectedSemester}
            examCategory={selectedExamCategory}
            resultDate={resultDate}
            supplementaryAttempt={
              selectedExamCategory === 'supplementary'
                ? supplementaryAttempt
                : null
            }
            supplementaryAttemptsData={supplementaryAttemptsData}
            failedStudentsData={failedStudentsData}
            onViewSupplementaryResult={handleViewSupplementaryResult}
          />
        ) : !studentSelected ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <Icons.UserPlus size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">
              Select a student from the list above
            </p>
          </div>
        ) : viewMode === 'entry' &&
          currentStudent &&
          !isCurrentStudentInactive ? (
          <>
            {viewMode === 'entry' &&
            currentStudent &&
            !isCurrentStudentInactive ? (
              <MarksEntryGrid
                student={currentStudent}
                courses={coursesForEntry}
                marksData={marksData[currentStudent?.id] || {}}
                onMarksChange={handleMarksChange}
                onSave={() => handleSaveStudentMarks(currentStudent?.id)}
                saving={saving}
                examCategory={selectedExamCategory}
                failedSubjectsData={
                  selectedExamCategory === 'supplementary'
                    ? failedStudentsData[currentStudent?.id] || null
                    : null
                }
                regularResults={
                  selectedExamCategory === 'supplementary' &&
                  regularResults[currentStudent?.id]
                    ? regularResults[currentStudent?.id]
                    : null
                }
              />
            ) : null}
            <div className="flex justify-between mt-6">
              <button
                onClick={() =>
                  setCurrentStudentIndex((prev) => Math.max(0, prev - 1))
                }
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
                <Icons.Save size={18} /> Save All
              </button>
              <button
                onClick={() =>
                  setCurrentStudentIndex((prev) =>
                    Math.min(sortedStudents.length - 1, prev + 1)
                  )
                }
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
            courses={coursesToDisplay}
            marksData={marksData[currentStudent?.id] || {}}
            semester={selectedSemester}
            batchName={selectedBatchName}
            examName={`${selectedBatchName} - ${selectedSemester.replace(
              'semester',
              'Semester '
            )} - ${categoryLabel}`}
            examCategory={selectedExamCategory}
            resultDate={resultDate}
          />
        ) : null}
      </div>
    </div>
  );
}
