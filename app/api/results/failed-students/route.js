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
    const semester = searchParams.get('semester');

    if (!batchId || !semester) {
      return NextResponse.json(
        { error: 'Batch ID and semester are required' },
        { status: 400 }
      );
    }

    // Get all courses assigned to this batch and semester
    const courseLists = await prisma.courseList.findMany({
      where: {
        batchId: parseInt(batchId),
        semester: semester,
      },
      include: {
        course: {
          select: {
            id: true,
            code: true,
            name: true,
            credits: true,
          },
        },
      },
    });

    const semesterCourseIds = courseLists.map((cl) => cl.courseId);

    if (semesterCourseIds.length === 0) {
      return NextResponse.json({
        success: true,
        failedStudents: [],
        failedStudentsData: {},
        passedStudents: [],
        summary: {
          totalStudentsWithResults: 0,
          failedStudentsCount: 0,
          passedStudentsCount: 0,
          totalFailedSubjects: 0,
        },
        message: 'No courses assigned for this semester',
        batchId: parseInt(batchId),
        semester: semester,
      });
    }

    // Get all active students in the batch
    const students = await prisma.student.findMany({
      where: {
        batchId: parseInt(batchId),
        status: 'active',
      },
      select: {
        id: true,
        name: true,
        rollNo: true,
        enrollmentNo: true,
        batchId: true,
        status: true,
        inactiveDate: true,
        email: true,
        phone: true,
      },
    });

    // Get regular exam results
    const regularResults = await prisma.result.findMany({
      where: {
        examCategory: 'regular',
        studentId: {
          in: students.map((s) => s.id),
        },
        courseId: {
          in: semesterCourseIds,
        },
      },
      include: {
        course: {
          select: {
            id: true,
            code: true,
            name: true,
            credits: true,
          },
        },
      },
    });

    // Get supplementary results for all attempts
    const supplementaryResults = await prisma.result.findMany({
      where: {
        examCategory: 'supplementary',
        studentId: {
          in: students.map((s) => s.id),
        },
        courseId: {
          in: semesterCourseIds,
        },
      },
      include: {
        course: {
          select: {
            id: true,
            code: true,
            name: true,
            credits: true,
          },
        },
      },
    });

    // Process students
    const studentsMap = new Map();

    students.forEach((student) => {
      studentsMap.set(student.id, {
        student: student,
        regularResults: [],
        supplementaryAttempts: [],
        failedSubjects: [],
        passedSubjects: [],
        totalSemesterCourses: semesterCourseIds.length,
      });
    });

    // Process regular results
    regularResults.forEach((result) => {
      const studentData = studentsMap.get(result.studentId);
      if (!studentData) return;

      const subjectInfo = {
        courseId: result.courseId,
        courseCode: result.course.code,
        courseName: result.course.name,
        credits: result.course.credits,
        gradePoint: result.gradePoint,
        grade: result.grade,
        isPassed: result.isPassed,
        resultDate: result.resultPublishedDate,
      };

      studentData.regularResults.push(subjectInfo);

      if (result.gradePoint < 2.0) {
        studentData.failedSubjects.push({
          ...subjectInfo,
          failedIn: 'regular',
        });
      } else {
        studentData.passedSubjects.push({
          ...subjectInfo,
          passedIn: 'regular',
        });
      }
    });

    // Process supplementary results grouped by attempt
    supplementaryResults.forEach((result) => {
      const studentData = studentsMap.get(result.studentId);
      if (!studentData) return;

      const attemptNumber = result.attemptNumber || 1;

      let attempt = studentData.supplementaryAttempts.find(
        (a) => a.attemptNumber === attemptNumber
      );

      if (!attempt) {
        attempt = {
          attemptNumber,
          resultDate: result.resultPublishedDate,
          subjects: [],
        };
        studentData.supplementaryAttempts.push(attempt);
      }

      attempt.subjects.push({
        courseId: result.courseId,
        courseCode: result.course.code,
        courseName: result.course.name,
        credits: result.course.credits,
        gradePoint: result.gradePoint,
        grade: result.grade,
        isPassed: result.isPassed,
      });
    });

    // Sort supplementary attempts
    studentsMap.forEach((data) => {
      data.supplementaryAttempts.sort(
        (a, b) => a.attemptNumber - b.attemptNumber
      );
    });

    // Separate failed and passed students
    const failedStudents = [];
    const passedStudents = [];

    studentsMap.forEach((data, studentId) => {
      const regularFailed = data.regularResults.filter(
        (r) => r.gradePoint < 2.0
      );
      const hasRegularFailed = regularFailed.length > 0;

      if (hasRegularFailed) {
        // Check if passed in any supplementary attempt
        let passedInAttempt = null;
        let remainingFailedSubjects = [...regularFailed];

        for (const attempt of data.supplementaryAttempts) {
          const passedInThisAttempt = attempt.subjects.filter(
            (s) => s.isPassed
          );
          const failedInThisAttempt = attempt.subjects.filter(
            (s) => !s.isPassed
          );

          if (failedInThisAttempt.length === 0) {
            passedInAttempt = attempt;
            break;
          }

          // Update remaining failed subjects
          passedInThisAttempt.forEach((passed) => {
            remainingFailedSubjects = remainingFailedSubjects.filter(
              (f) => f.courseId !== passed.courseId
            );
          });
        }

        failedStudents.push({
          studentId: parseInt(studentId),
          student: data.student,
          regularFailedSubjects: regularFailed,
          remainingFailedSubjects,
          supplementaryAttempts: data.supplementaryAttempts,
          passedInAttempt,
          totalFailedInRegular: regularFailed.length,
          currentFailedCount: remainingFailedSubjects.length,
          semester: semester,
          batchId: parseInt(batchId),
        });
      } else if (data.regularResults.length === data.totalSemesterCourses) {
        passedStudents.push({
          studentId: parseInt(studentId),
          student: data.student,
          passedSubjects: data.passedSubjects,
          totalSemesterCourses: data.totalSemesterCourses,
        });
      }
    });

    // Format failed students data
    const failedStudentsData = {};
    failedStudents.forEach((student) => {
      failedStudentsData[student.studentId] = {
        studentInfo: student.student,
        regularFailedSubjects: student.regularFailedSubjects,
        remainingFailedSubjects: student.remainingFailedSubjects,
        supplementaryAttempts: student.supplementaryAttempts,
        passedInAttempt: student.passedInAttempt,
        totalFailedInRegular: student.totalFailedInRegular,
        currentFailedCount: student.currentFailedCount,
        semester: semester,
        batchId: parseInt(batchId),
      };
    });

    return NextResponse.json({
      success: true,
      failedStudents,
      failedStudentsData,
      passedStudents,
      semesterCourseIds,
      summary: {
        totalStudents: students.length,
        totalSemesterCourses: semesterCourseIds.length,
        failedStudentsCount: failedStudents.length,
        passedStudentsCount: passedStudents.length,
        totalFailedSubjects: failedStudents.reduce(
          (acc, s) => acc + s.currentFailedCount,
          0
        ),
      },
      batchId: parseInt(batchId),
      semester: semester,
    });
  } catch (error) {
    console.error('Error fetching failed students:', error);
    return NextResponse.json(
      { error: 'Failed to fetch failed students', details: error.message },
      { status: 500 }
    );
  }
}
