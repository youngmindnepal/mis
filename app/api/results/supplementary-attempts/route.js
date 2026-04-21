// app/api/results/supplementary-attempts/route.js
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

    console.log('Supplementary attempts API called with:', {
      batchId,
      semester,
    });

    if (!batchId || !semester) {
      return NextResponse.json(
        { error: 'Batch ID and semester are required' },
        { status: 400 }
      );
    }

    // Get all courses for this semester
    const courseLists = await prisma.courseList.findMany({
      where: {
        batchId: parseInt(batchId),
        semester: semester,
      },
      select: {
        courseId: true,
      },
    });

    const semesterCourseIds = courseLists.map((cl) => cl.courseId);
    console.log(
      `Found ${semesterCourseIds.length} courses for semester ${semester}`
    );

    if (semesterCourseIds.length === 0) {
      return NextResponse.json({
        success: true,
        attemptsByStudent: {},
        message: 'No courses found for this semester',
      });
    }

    // Fetch ALL supplementary results for this batch and semester
    const results = await prisma.result.findMany({
      where: {
        examCategory: 'supplementary',
        student: {
          batchId: parseInt(batchId),
        },
        courseId: {
          in: semesterCourseIds,
        },
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            rollNo: true,
            enrollmentNo: true,
          },
        },
        course: {
          select: {
            id: true,
            code: true,
            name: true,
            credits: true,
          },
        },
      },
      orderBy: [{ studentId: 'asc' }, { attempt: 'asc' }, { courseId: 'asc' }],
    });

    console.log(`Found ${results.length} supplementary results`);

    // Group results by student and attempt
    const attemptsByStudent = {};

    results.forEach((result) => {
      const studentId = result.studentId.toString();
      const attemptNumber = result.attempt || 1; // Using 'attempt' field from schema

      if (!attemptsByStudent[studentId]) {
        attemptsByStudent[studentId] = {};
      }

      if (!attemptsByStudent[studentId][attemptNumber]) {
        attemptsByStudent[studentId][attemptNumber] = {
          attemptNumber,
          resultDate: result.resultDate || result.createdAt,
          subjects: [],
          totalCredits: 0,
          earnedCredits: 0,
          totalGradePoints: 0,
        };
      }

      const attempt = attemptsByStudent[studentId][attemptNumber];
      const gradePoint = result.gradePoint;
      const credits = result.course?.credits || 3;
      const isPassed =
        result.isPassed || (gradePoint !== null && gradePoint >= 2.0);

      const subjectData = {
        courseId: result.courseId,
        code: result.course.code,
        name: result.course.name,
        credits,
        gradePoint,
        grade: result.grade,
        isPassed,
      };

      attempt.subjects.push(subjectData);
      attempt.totalCredits += credits;

      if (isPassed && gradePoint !== null) {
        attempt.earnedCredits += credits;
        attempt.totalGradePoints += gradePoint * credits;
      }
    });

    // Transform and calculate final data
    const transformedData = {};

    Object.entries(attemptsByStudent).forEach(([studentId, attempts]) => {
      transformedData[studentId] = Object.values(attempts)
        .map((attempt) => {
          const sgpa =
            attempt.earnedCredits > 0
              ? attempt.totalGradePoints / attempt.earnedCredits
              : 0;

          const passedSubjects = attempt.subjects.filter((s) => s.isPassed);
          const failedSubjects = attempt.subjects.filter((s) => !s.isPassed);

          return {
            attemptNumber: attempt.attemptNumber,
            resultDate: attempt.resultDate,
            status: failedSubjects.length === 0 ? 'PASS' : 'FAIL',
            sgpa,
            passedSubjects: passedSubjects.map((s) => ({
              id: s.courseId,
              code: s.code,
              name: s.name,
              gpa: s.gradePoint,
              credits: s.credits,
            })),
            failedSubjects: failedSubjects.map((s) => ({
              id: s.courseId,
              code: s.code,
              name: s.name,
              gpa: s.gradePoint,
              credits: s.credits,
            })),
          };
        })
        .sort((a, b) => b.attemptNumber - a.attemptNumber); // Newest first
    });

    console.log(
      `Processed supplementary attempts for ${
        Object.keys(transformedData).length
      } students`
    );

    return NextResponse.json({
      success: true,
      attemptsByStudent: transformedData,
    });
  } catch (error) {
    console.error('Error fetching supplementary attempts:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch supplementary attempts',
        details: error.message,
        attemptsByStudent: {},
      },
      { status: 500 }
    );
  }
}
