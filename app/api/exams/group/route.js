// app/api/exams/group/route.js
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');

    if (!name) {
      return NextResponse.json(
        { error: 'Exam name is required' },
        { status: 400 }
      );
    }

    // Delete all exams with the given name
    const result = await prisma.exam.deleteMany({
      where: {
        name: name,
      },
    });

    return NextResponse.json({
      success: true,
      message: `${result.count} exam(s) deleted successfully`,
      count: result.count,
    });
  } catch (error) {
    console.error('Error deleting exam group:', error);
    return NextResponse.json(
      { error: 'Failed to delete exam group' },
      { status: 500 }
    );
  }
}
