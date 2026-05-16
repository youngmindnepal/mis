import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// PUT - Update attendance session
export async function PUT(request, { params }) {
  try {
    const { id, sessionId } = await params;
    const classroomId = parseInt(id);
    const sessionIdInt = parseInt(sessionId);

    if (isNaN(classroomId) || isNaN(sessionIdInt)) {
      return NextResponse.json({ error: 'Invalid IDs' }, { status: 400 });
    }

    const body = await request.json();
    const { sessionDetails, attendances } = body;

    // Update session details
    if (sessionDetails) {
      await prisma.classSession.update({
        where: { id: sessionIdInt },
        data: {
          date: sessionDetails.date ? new Date(sessionDetails.date) : undefined,
          startTime: sessionDetails.startTime
            ? new Date(`${sessionDetails.date}T${sessionDetails.startTime}:00`)
            : undefined,
          endTime: sessionDetails.endTime
            ? new Date(`${sessionDetails.date}T${sessionDetails.endTime}:00`)
            : undefined,
          syllabusCovered: sessionDetails.syllabusCovered,
        },
      });
    }

    // Update attendance records
    if (attendances && Array.isArray(attendances)) {
      await Promise.all(
        attendances.map((att) =>
          prisma.attendance.updateMany({
            where: {
              classSessionId: sessionIdInt,
              studentId: att.studentId,
            },
            data: {
              status: att.status,
              remarks: att.remarks || '',
            },
          })
        )
      );
    }

    return NextResponse.json({ message: 'Attendance updated successfully' });
  } catch (error) {
    console.error('Error updating attendance:', error);
    return NextResponse.json(
      { error: 'Failed to update attendance', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Delete attendance session
export async function DELETE(request, { params }) {
  try {
    const { id, sessionId } = await params;
    const sessionIdInt = parseInt(sessionId);

    if (isNaN(sessionIdInt)) {
      return NextResponse.json(
        { error: 'Invalid session ID' },
        { status: 400 }
      );
    }

    // Delete all attendance records for this session first
    await prisma.attendance.deleteMany({
      where: { classSessionId: sessionIdInt },
    });

    // Then delete the session
    await prisma.classSession.delete({
      where: { id: sessionIdInt },
    });

    return NextResponse.json({
      message: 'Attendance session deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting attendance session:', error);
    return NextResponse.json(
      { error: 'Failed to delete attendance session', details: error.message },
      { status: 500 }
    );
  }
}
