// app/api/results/semester-wise/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');

    if (!batchId) {
      return NextResponse.json(
        { error: 'Batch ID is required' },
        { status: 400 }
      );
    }

    console.log('=== FETCHING SEMESTER-WISE DATA ===');
    console.log('Batch ID:', batchId);

    // Get all active students
    const students = await prisma.student.findMany({
      where: { batchId: parseInt(batchId), status: 'active' },
      select: { id: true, name: true, rollNo: true, enrollmentNo: true },
      orderBy: { name: 'asc' },
    });
    console.log(`Found ${students.length} students`);

    // Get course assignments for this batch
    const courseAssignments = await prisma.courseList.findMany({
      where: { batchId: parseInt(batchId) },
      include: { course: true },
    });
    console.log(`Found ${courseAssignments.length} course assignments`);

    // Build unique course-semester mapping (each course belongs to exactly one semester)
    const courseSemesterMap = {};
    const semesterCourses = {};

    courseAssignments.forEach((ca) => {
      // Only add if not already mapped (prevent duplicates)
      if (!courseSemesterMap[ca.courseId]) {
        courseSemesterMap[ca.courseId] = ca.semester;
      }

      if (!semesterCourses[ca.semester]) {
        semesterCourses[ca.semester] = [];
      }

      // Check if course already added to this semester
      const existingCourse = semesterCourses[ca.semester].find(
        (c) => c.id === ca.courseId
      );
      if (!existingCourse) {
        semesterCourses[ca.semester].push({
          id: ca.courseId,
          code: ca.course.code,
          name: ca.course.name,
          credits: ca.course.credits || 3,
        });
      }
    });

    console.log('Semesters found:', Object.keys(semesterCourses));
    Object.keys(semesterCourses).forEach((sem) => {
      console.log(`  ${sem}: ${semesterCourses[sem].length} courses`);
    });

    // Get REGULAR exam results
    const regularResults = await prisma.result.findMany({
      where: {
        student: { batchId: parseInt(batchId) },
        examCategory: 'regular',
      },
      include: { course: true },
    });
    console.log(`Found ${regularResults.length} regular exam results`);

    // Get SUPPLEMENTARY exam results
    const supplementaryResults = await prisma.result.findMany({
      where: {
        student: { batchId: parseInt(batchId) },
        examCategory: 'supplementary',
      },
      include: { course: true },
      orderBy: { attempt: 'asc' },
    });
    console.log(
      `Found ${supplementaryResults.length} supplementary exam results`
    );

    // Initialize data structure
    const studentSemesterData = {};

    students.forEach((student) => {
      studentSemesterData[student.id] = {
        studentInfo: {
          id: student.id,
          name: student.name,
          rollNo: student.rollNo,
          enrollmentNo: student.enrollmentNo,
        },
        semesters: {},
        supplementaryAttempts: [], // Store all supplementary attempts
      };
    });

    // Group supplementary results by student and attempt
    const supplementaryByStudent = {};
    supplementaryResults.forEach((result) => {
      const studentId = result.studentId;
      const attempt = result.attempt || 1;

      if (!supplementaryByStudent[studentId]) {
        supplementaryByStudent[studentId] = {};
      }
      if (!supplementaryByStudent[studentId][attempt]) {
        supplementaryByStudent[studentId][attempt] = {
          attemptNumber: attempt,
          resultDate: result.resultDate,
          courses: [],
          passedCourses: [],
          failedCourses: [],
          totalCredits: 0,
          earnedCredits: 0,
          totalGradePoints: 0,
          sgpa: 0,
        };
      }

      const attemptData = supplementaryByStudent[studentId][attempt];
      const course = result.course;
      const credits = course?.credits || 3;
      const gradePoint = result.gradePoint;

      const courseInfo = {
        courseId: result.courseId,
        code: course?.code || 'N/A',
        name: course?.name || 'N/A',
        credits: credits,
        gradePoint: gradePoint,
        grade: result.grade,
        isPassed: result.isPassed,
      };

      attemptData.courses.push(courseInfo);
      attemptData.totalCredits += credits;

      if (gradePoint !== null && !isNaN(gradePoint)) {
        if (gradePoint >= 2.0) {
          attemptData.earnedCredits += credits;
          attemptData.totalGradePoints += gradePoint * credits;
          attemptData.passedCourses.push(courseInfo);
        } else {
          attemptData.failedCourses.push(courseInfo);
        }
      }
    });

    // Calculate SGPA for supplementary attempts
    Object.keys(supplementaryByStudent).forEach((studentId) => {
      const attempts = supplementaryByStudent[studentId];
      const attemptList = [];

      Object.keys(attempts).forEach((attemptNum) => {
        const attempt = attempts[attemptNum];

        if (attempt.failedCourses.length === 0 && attempt.earnedCredits > 0) {
          attempt.sgpa = attempt.totalGradePoints / attempt.earnedCredits;
          attempt.status = 'PASS';
        } else {
          attempt.sgpa = 0;
          attempt.status = 'FAIL';
        }

        attemptList.push(attempt);
      });

      // Sort by attempt number
      attemptList.sort((a, b) => a.attemptNumber - b.attemptNumber);

      if (studentSemesterData[studentId]) {
        studentSemesterData[studentId].supplementaryAttempts = attemptList;
      }
    });

    // Process regular results by semester
    regularResults.forEach((result) => {
      const studentId = result.studentId;
      const courseId = result.courseId;
      const semester = courseSemesterMap[courseId];

      if (!semester) {
        console.log(`No semester mapping for course ${courseId}`);
        return;
      }

      if (!studentSemesterData[studentId]) return;

      if (!studentSemesterData[studentId].semesters[semester]) {
        studentSemesterData[studentId].semesters[semester] = {
          courses: [],
          totalCredits:
            semesterCourses[semester]?.reduce((sum, c) => sum + c.credits, 0) ||
            0,
          earnedCredits: 0,
          totalGradePoints: 0,
          sgpa: 0,
          grade: null,
          failedCourses: [],
          passedCourses: [],
          resultDate: null,
        };
      }

      const semData = studentSemesterData[studentId].semesters[semester];
      const course = result.course;
      const credits = course?.credits || 3;
      const gradePoint = result.gradePoint;

      // Check if course already added (prevent duplicates)
      const existingCourse = semData.courses.find(
        (c) => c.courseId === courseId
      );
      if (existingCourse) {
        return; // Skip duplicates
      }

      const courseInfo = {
        courseId: courseId,
        code: course?.code || 'N/A',
        name: course?.name || 'N/A',
        credits: credits,
        gradePoint: gradePoint,
        grade: result.grade,
        isPassed: result.isPassed,
      };

      semData.courses.push(courseInfo);

      if (gradePoint !== null && !isNaN(gradePoint)) {
        if (gradePoint >= 2.0) {
          semData.earnedCredits += credits;
          semData.totalGradePoints += gradePoint * credits;
          semData.passedCourses.push(courseInfo);
        } else {
          semData.failedCourses.push(courseInfo);
        }
      }

      if (!semData.resultDate && result.resultDate) {
        semData.resultDate = result.resultDate;
      }
    });

    // Calculate SGPA for each semester
    Object.keys(studentSemesterData).forEach((studentId) => {
      Object.keys(studentSemesterData[studentId].semesters).forEach(
        (semester) => {
          const semData = studentSemesterData[studentId].semesters[semester];

          if (semData.courses.length > 0) {
            if (
              semData.failedCourses.length === 0 &&
              semData.earnedCredits > 0
            ) {
              semData.sgpa = semData.totalGradePoints / semData.earnedCredits;
              semData.grade = calculateGradeFromGPA(semData.sgpa);
            }
          }
        }
      );
    });

    // Calculate CGPA
    Object.keys(studentSemesterData).forEach((studentId) => {
      const semesters = studentSemesterData[studentId].semesters;
      let totalEarnedCredits = 0;
      let totalGradePoints = 0;
      let allPassed = true;

      Object.keys(semesters).forEach((semester) => {
        const semData = semesters[semester];
        if (semData.courses.length > 0) {
          if (semData.failedCourses.length === 0 && semData.sgpa > 0) {
            totalEarnedCredits += semData.earnedCredits;
            totalGradePoints += semData.sgpa * semData.earnedCredits;
          } else if (semData.failedCourses.length > 0) {
            allPassed = false;
          }
        }
      });

      studentSemesterData[studentId].cgpa =
        allPassed && totalEarnedCredits > 0
          ? totalGradePoints / totalEarnedCredits
          : 0;
    });

    // Log summary
    console.log(`\n=== SUMMARY ===`);
    console.log(
      `Students with regular results: ${
        Object.keys(studentSemesterData).filter(
          (id) => Object.keys(studentSemesterData[id].semesters).length > 0
        ).length
      }`
    );
    console.log(
      `Students with supplementary attempts: ${
        Object.keys(supplementaryByStudent).length
      }`
    );

    return NextResponse.json({
      success: true,
      allSemesterData: studentSemesterData,
      semesterCourses,
      studentCount: students.length,
    });
  } catch (error) {
    console.error('Error in semester-wise API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch semester-wise data', details: error.message },
      { status: 500 }
    );
  }
}

function calculateGradeFromGPA(gpa) {
  if (gpa >= 3.71) return 'A';
  if (gpa >= 3.31) return 'A-';
  if (gpa >= 3.01) return 'B+';
  if (gpa >= 2.71) return 'B';
  if (gpa >= 2.31) return 'B-';
  if (gpa >= 2.01) return 'C+';
  return 'F';
}
