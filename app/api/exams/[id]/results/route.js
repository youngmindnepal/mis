// app/api/exams/[id]/results/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Roles that have full access
const ALLOWED_ROLES = [
  'TEACHER',
  'COORDINATOR',
  'ADMIN',
  'SYSTEM_ADMIN',
  'SUPER_ADMIN',
];

// GET /api/exams/[id]/results - Fetch existing results
export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: idParam } = await params;
    const examId = parseInt(idParam);

    if (isNaN(examId)) {
      return NextResponse.json({ error: 'Invalid exam ID' }, { status: 400 });
    }

    // Check if exam exists
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: {
        examType: true,
        batch: true,
        classroom: true,
      },
    });

    if (!exam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
    }

    // Fetch existing results
    const results = await prisma.result.findMany({
      where: { examId },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            rollNo: true,
          },
        },
      },
      orderBy: {
        student: {
          rollNo: 'asc',
        },
      },
    });

    // Format results
    const formattedResults = results.map((result) => ({
      id: Number(result.id),
      studentId: Number(result.studentId),
      studentName: result.student?.name || 'Unknown',
      studentRollNo: result.student?.rollNo || '-',
      marksObtained: result.totalMarks || result.theoryMarks || 0,
      fullMarks: result.maxMarks || 100,
      passMarks: result.passMarks || 40,
      percentage: result.totalMarks
        ? (result.totalMarks / (result.maxMarks || 100)) * 100
        : 0,
      grade: result.grade || '',
      remarks: result.remarks || '',
    }));

    const examConfig =
      results.length > 0
        ? {
            fullMarks: results[0].maxMarks || 100,
            passMarks: results[0].passMarks || 40,
          }
        : {
            fullMarks: 100,
            passMarks: 40,
          };

    return NextResponse.json({
      results: formattedResults,
      examConfig,
      exam: {
        id: exam.id,
        name: exam.name,
        examType: exam.examType?.name,
        batch: exam.batch?.name,
        classroom: exam.classroom?.name,
        classroomId: exam.classroomId,
      },
    });
  } catch (error) {
    console.error('Error fetching exam results:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}

// POST /api/exams/[id]/results - Save results
export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user with role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { role: true },
    });

    if (!user || !user.role || !ALLOWED_ROLES.includes(user.role.name)) {
      console.log('User role not allowed:', user?.role?.name);
      return NextResponse.json(
        { error: 'Forbidden - You do not have permission to enter marks' },
        { status: 403 }
      );
    }

    const { id: idParam } = await params;
    const examId = parseInt(idParam);

    if (isNaN(examId)) {
      return NextResponse.json({ error: 'Invalid exam ID' }, { status: 400 });
    }

    // Check if exam exists and get classroomId
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: {
        examType: true,
      },
    });

    if (!exam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
    }

    // Don't allow editing if results are already published
    if (exam.status === 'result_published') {
      return NextResponse.json(
        { error: 'Cannot edit published results' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { results, fullMarks, passMarks } = body;

    if (!results || !Array.isArray(results)) {
      return NextResponse.json(
        { error: 'Results array is required' },
        { status: 400 }
      );
    }

    if (!fullMarks || fullMarks <= 0) {
      return NextResponse.json(
        { error: 'Full marks must be greater than 0' },
        { status: 400 }
      );
    }

    if (passMarks === undefined || passMarks < 0 || passMarks > fullMarks) {
      return NextResponse.json(
        { error: 'Pass marks must be between 0 and full marks' },
        { status: 400 }
      );
    }

    const savedResults = [];

    // Process each result
    for (const item of results) {
      const { studentId, marksObtained, remarks } = item;

      // Skip if marksObtained is invalid
      if (
        marksObtained === null ||
        marksObtained === undefined ||
        isNaN(marksObtained)
      ) {
        continue;
      }

      // Calculate percentage and grade
      const percentage = (marksObtained / fullMarks) * 100;
      const grade = calculateGrade(percentage);
      const isPassed = marksObtained >= passMarks;

      // Check if result already exists
      const existingResult = await prisma.result.findFirst({
        where: {
          examId,
          studentId,
        },
      });

      let savedResult;

      if (existingResult) {
        // Update existing result
        savedResult = await prisma.result.update({
          where: { id: existingResult.id },
          data: {
            totalMarks: marksObtained,
            maxMarks: fullMarks,
            passMarks: passMarks,
            grade,
            isPassed,
            remarks: remarks || null,
            resultStatus: 'draft',
          },
          include: {
            student: {
              select: {
                id: true,
                name: true,
                rollNo: true,
              },
            },
          },
        });
      } else {
        // Create new result - include classroomId from exam
        savedResult = await prisma.result.create({
          data: {
            examId,
            studentId,
            classroomId: exam.classroomId, // Required field from schema
            examTypeId: exam.examTypeId,
            totalMarks: marksObtained,
            maxMarks: fullMarks,
            passMarks: passMarks,
            grade,
            isPassed,
            remarks: remarks || null,
            resultStatus: 'draft',
            enteredBy: session.user.id,
          },
          include: {
            student: {
              select: {
                id: true,
                name: true,
                rollNo: true,
              },
            },
          },
        });
      }

      savedResults.push(savedResult);
    }

    // Update exam statistics if there are results
    if (savedResults.length > 0) {
      const totalResults = savedResults.length;
      const passedResults = savedResults.filter((r) => r.isPassed).length;
      const failedResults = totalResults - passedResults;

      const validMarks = savedResults.filter((r) => r.totalMarks !== null);
      const averageMarks =
        validMarks.length > 0
          ? validMarks.reduce((sum, r) => sum + (r.totalMarks || 0), 0) /
            validMarks.length
          : 0;
      const highestMarks =
        validMarks.length > 0
          ? Math.max(...validMarks.map((r) => r.totalMarks || 0))
          : 0;
      const lowestMarks =
        validMarks.length > 0
          ? Math.min(...validMarks.map((r) => r.totalMarks || 0))
          : 0;

      // Update exam with statistics
      await prisma.exam.update({
        where: { id: examId },
        data: {
          status: 'completed',
        },
      });
    }

    // Format response
    const formattedResults = savedResults.map((r) => ({
      id: Number(r.id),
      studentId: Number(r.studentId),
      studentName: r.student?.name || 'Unknown',
      studentRollNo: r.student?.rollNo || '-',
      marksObtained: r.totalMarks,
      fullMarks: r.maxMarks,
      passMarks: r.passMarks,
      percentage: r.totalMarks ? (r.totalMarks / (r.maxMarks || 100)) * 100 : 0,
      grade: r.grade,
      remarks: r.remarks,
    }));

    return NextResponse.json({
      message: 'Results saved successfully',
      results: formattedResults,
    });
  } catch (error) {
    console.error('Error saving exam results:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}

// PUT - Same as POST
export async function PUT(request, { params }) {
  return POST(request, { params });
}

// DELETE /api/exams/[id]/results - Delete all results for an exam
export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user with role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { role: true },
    });

    // Only admins can delete results
    const allowedRoles = ['ADMIN', 'SYSTEM_ADMIN', 'SUPER_ADMIN'];

    if (!user || !user.role || !allowedRoles.includes(user.role.name)) {
      return NextResponse.json(
        { error: 'Forbidden - Only admins can delete results' },
        { status: 403 }
      );
    }

    const { id: idParam } = await params;
    const examId = parseInt(idParam);

    if (isNaN(examId)) {
      return NextResponse.json({ error: 'Invalid exam ID' }, { status: 400 });
    }

    // Check if exam exists
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
    });

    if (!exam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
    }

    // Don't allow deletion if results are published
    if (exam.status === 'result_published') {
      return NextResponse.json(
        { error: 'Cannot delete published results' },
        { status: 400 }
      );
    }

    // Delete all results for this exam
    await prisma.result.deleteMany({
      where: { examId },
    });

    return NextResponse.json({
      message: 'All results deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting exam results:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}

// Helper function to calculate grade based on percentage
function calculateGrade(percentage) {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B+';
  if (percentage >= 60) return 'B';
  if (percentage >= 50) return 'C+';
  if (percentage >= 40) return 'C';
  if (percentage >= 33) return 'D';
  return 'F';
}
