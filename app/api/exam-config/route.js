// app/api/exam-config/route.js
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/exam-config?batchId=X&semester=Y&examCategory=Z
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');
    const semester = searchParams.get('semester');
    const examCategory = searchParams.get('examCategory');

    // Validate required parameters
    if (!batchId || !semester || !examCategory) {
      return NextResponse.json(
        {
          error: 'Missing required parameters: batchId, semester, examCategory',
        },
        { status: 400 }
      );
    }

    // Find the exam configuration
    const examConfig = await prisma.examConfig.findUnique({
      where: {
        batchId_semester_examCategory: {
          batchId: parseInt(batchId),
          semester: semester,
          examCategory: examCategory,
        },
      },
      select: {
        resultDate: true,
        updatedAt: true,
      },
    });

    if (!examConfig) {
      return NextResponse.json(
        { resultDate: null, message: 'No configuration found' },
        { status: 200 }
      );
    }

    return NextResponse.json(examConfig, { status: 200 });
  } catch (error) {
    console.error('Error fetching exam config:', error);
    return NextResponse.json(
      { error: 'Failed to fetch exam configuration' },
      { status: 500 }
    );
  }
}

// POST /api/exam-config
export async function POST(request) {
  try {
    const body = await request.json();
    const { batchId, semester, examCategory, resultDate } = body;

    // Validate required fields
    if (!batchId || !semester || !examCategory) {
      return NextResponse.json(
        { error: 'Missing required fields: batchId, semester, examCategory' },
        { status: 400 }
      );
    }

    if (!resultDate) {
      return NextResponse.json(
        { error: 'resultDate is required' },
        { status: 400 }
      );
    }

    // Validate resultDate format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(resultDate)) {
      return NextResponse.json(
        { error: 'Invalid date format. Expected YYYY-MM-DD' },
        { status: 400 }
      );
    }

    // Convert to DateTime object
    const parsedDate = new Date(resultDate);
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date value' },
        { status: 400 }
      );
    }

    // Upsert the exam configuration
    const examConfig = await prisma.examConfig.upsert({
      where: {
        batchId_semester_examCategory: {
          batchId: parseInt(batchId),
          semester: semester,
          examCategory: examCategory,
        },
      },
      update: {
        resultDate: parsedDate,
      },
      create: {
        batchId: parseInt(batchId),
        semester: semester,
        examCategory: examCategory,
        resultDate: parsedDate,
      },
    });

    return NextResponse.json(
      {
        message: 'Exam configuration saved successfully',
        examConfig: {
          batchId: examConfig.batchId,
          semester: examConfig.semester,
          examCategory: examConfig.examCategory,
          resultDate: examConfig.resultDate,
          updatedAt: examConfig.updatedAt,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error saving exam config:', error);

    // Handle specific Prisma errors
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Configuration already exists for this combination' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to save exam configuration' },
      { status: 500 }
    );
  }
}

// PUT /api/exam-config (same as POST but more RESTful for updates)
export async function PUT(request) {
  return POST(request);
}

// DELETE /api/exam-config (optional - for removing configurations)
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');
    const semester = searchParams.get('semester');
    const examCategory = searchParams.get('examCategory');

    if (!batchId || !semester || !examCategory) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    await prisma.examConfig.delete({
      where: {
        batchId_semester_examCategory: {
          batchId: parseInt(batchId),
          semester: semester,
          examCategory: examCategory,
        },
      },
    });

    return NextResponse.json(
      { message: 'Exam configuration deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting exam config:', error);

    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Configuration not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to delete exam configuration' },
      { status: 500 }
    );
  }
}
