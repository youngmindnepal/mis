import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request, { params }) {
  try {
    const { id } = await params; // Important: await params
    const classroomId = parseInt(id);

    if (isNaN(classroomId)) {
      return NextResponse.json(
        { error: 'Invalid classroom ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { date, startTime, endTime, syllabusCovered, attendances } = body;

    if (!date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 });
    }

    if (
      !attendances ||
      !Array.isArray(attendances) ||
      attendances.length === 0
    ) {
      return NextResponse.json(
        { error: 'Attendance data is required' },
        { status: 400 }
      );
    }

    // Create class session first
    const classSession = await prisma.classSession.create({
      data: {
        classroomId: classroomId,
        date: new Date(date),
        startTime: startTime ? new Date(`${date}T${startTime}:00`) : null,
        endTime: endTime ? new Date(`${date}T${endTime}:00`) : null,
        syllabusCovered: syllabusCovered || '',
      },
    });

    // Create attendance records
    const attendanceRecords = await Promise.all(
      attendances.map((att) =>
        prisma.attendance.create({
          data: {
            classSessionId: classSession.id,
            studentId: att.studentId,
            status: att.status || 'present',
            remarks: att.remarks || '',
          },
        })
      )
    );

    return NextResponse.json(
      {
        message: 'Attendance marked successfully',
        session: classSession,
        attendances: attendanceRecords,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error marking attendance:', error);
    return NextResponse.json(
      { error: 'Failed to mark attendance', details: error.message },
      { status: 500 }
    );
  }
}
