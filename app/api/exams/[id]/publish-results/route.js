// app/api/exams/[id]/publish-results/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Roles that can publish results
const ALLOWED_ROLES = [
  'TEACHER',
  'COORDINATOR',
  'ADMIN',
  'SYSTEM_ADMIN',
  'SUPER_ADMIN',
];

// POST /api/exams/[id]/publish-results
export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user with role from database
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { role: true },
    });

    // Check if user has allowed role
    if (!user || !user.role || !ALLOWED_ROLES.includes(user.role.name)) {
      console.log('User role not allowed to publish:', user?.role?.name);
      return NextResponse.json(
        { error: 'Forbidden - You do not have permission to publish results' },
        { status: 403 }
      );
    }

    const { id: idParam } = await params;
    const examId = parseInt(idParam);

    if (isNaN(examId)) {
      return NextResponse.json({ error: 'Invalid exam ID' }, { status: 400 });
    }

    // Check if exam exists and has results
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: {
        _count: {
          select: { results: true },
        },
      },
    });

    if (!exam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
    }

    // Check if exam has results
    if (exam._count.results === 0) {
      return NextResponse.json(
        { error: 'Cannot publish results - no marks have been entered' },
        { status: 400 }
      );
    }

    // Check if exam is completed (should have results entered)
    if (exam.status !== 'completed' && exam.status !== 'result_published') {
      return NextResponse.json(
        { error: 'Cannot publish results - exam must be completed first' },
        { status: 400 }
      );
    }

    // Check if already published
    if (exam.status === 'result_published') {
      return NextResponse.json(
        { error: 'Results are already published' },
        { status: 400 }
      );
    }

    // Update exam status to result_published AND update all results to published
    const result = await prisma.$transaction(async (tx) => {
      // Update exam status
      const updatedExam = await tx.exam.update({
        where: { id: examId },
        data: {
          status: 'result_published',
        },
      });

      // Update all results for this exam to published status
      await tx.result.updateMany({
        where: { examId },
        data: {
          resultStatus: 'published',
          publishedAt: new Date(),
        },
      });

      return updatedExam;
    });

    return NextResponse.json({
      message: 'Results published successfully',
      exam: {
        id: result.id,
        name: result.name,
        status: result.status,
      },
    });
  } catch (error) {
    console.error('Error publishing results:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}
