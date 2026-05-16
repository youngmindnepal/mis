import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request, { params }) {
  try {
    const { id } = await params; // Important: await params
    const classroomId = parseInt(id);

    if (isNaN(classroomId)) {
      return NextResponse.json(
        { error: 'Invalid classroom ID' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json(
        { error: 'Date parameter is required' },
        { status: 400 }
      );
    }

    // Find the class session for this date and classroom
    const session = await prisma.classSession.findFirst({
      where: {
        classroomId: classroomId,
        date: {
          gte: new Date(date),
          lt: new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000), // Next day
        },
      },
    });

    if (!session) {
      return NextResponse.json({
        session: null,
        attendances: [],
      });
    }

    // Get all attendances for this session
    const attendances = await prisma.attendance.findMany({
      where: {
        classSessionId: session.id,
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            rollNumber: true,
          },
        },
      },
    });

    // Transform for frontend
    const transformedAttendances = attendances.map((att) => ({
      studentId: att.studentId,
      studentName: att.student?.name || 'Unknown',
      rollNumber: att.student?.rollNumber || '-',
      status: att.status,
      remarks: att.remarks || '',
    }));

    return NextResponse.json({
      session,
      attendances: transformedAttendances,
    });
  } catch (error) {
    console.error('Error fetching attendance by date:', error);
    return NextResponse.json(
      { error: 'Failed to fetch attendance', details: error.message },
      { status: 500 }
    );
  }
}
