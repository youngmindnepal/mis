import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request) {
  try {
    const body = await request.json();
    const { studentId, batchId, examCategory, publishedAt } = body;

    if (!studentId || !batchId || !examCategory) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Update all results for this student in this exam category to published
    const updated = await prisma.result.updateMany({
      where: {
        studentId: parseInt(studentId),
        examCategory,
      },
      data: {
        resultStatus: 'published',
        publishedAt: new Date(publishedAt),
      },
    });

    return NextResponse.json({
      success: true,
      count: updated.count,
      publishedAt,
    });
  } catch (error) {
    console.error('Error publishing results:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
