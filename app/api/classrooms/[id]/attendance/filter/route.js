import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request, { params }) {
  try {
    const { id } = await params; // Important: await params in Next.js 15+
    const classroomId = parseInt(id);

    if (isNaN(classroomId)) {
      return NextResponse.json(
        { error: 'Invalid classroom ID' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build where clause
    const where = {
      classSession: {
        classroomId: classroomId,
      },
    };

    // Add date filters if provided
    if (startDate || endDate) {
      where.classSession.date = {};
      if (startDate) {
        where.classSession.date.gte = new Date(startDate);
      }
      if (endDate) {
        // Set to end of day for inclusive end date
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        where.classSession.date.lte = endDateTime;
      }
    }

    const attendances = await prisma.attendance.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            rollNo: true,
          },
        },
        classSession: {
          select: {
            id: true,
            date: true,
            startTime: true,
            endTime: true,
            syllabusCovered: true,
          },
        },
      },
      orderBy: {
        classSession: {
          date: 'asc',
        },
      },
    });

    return NextResponse.json({ attendances });
  } catch (error) {
    console.error('Error fetching attendance:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch attendance',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
