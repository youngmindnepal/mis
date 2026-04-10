import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function hasPermission(userId, resource, action) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    if (!user) return false;
    if (user.role?.name === 'SYSTEM_ADMIN') return true;

    const hasRequiredPermission = user.role?.permissions?.some(
      (rp) =>
        rp.permission.resource === resource && rp.permission.action === action
    );
    return hasRequiredPermission || false;
  } catch (error) {
    console.error('Error checking permission:', error);
    return false;
  }
}

// PUT - Update attendance for a session
export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canUpdateAttendance = await hasPermission(
      session.user.id,
      'attendance',
      'update'
    );
    if (!canUpdateAttendance) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to update attendance' },
        { status: 403 }
      );
    }

    // IMPORTANT: Await the params object
    const resolvedParams = await params;
    console.log('Received params:', resolvedParams);

    // The folder structure is [id]/attendance/session/[sessionId]
    // So params will have: { id: string, sessionId: string }
    const classroomId = parseInt(resolvedParams.id);
    const sessionId = parseInt(resolvedParams.sessionId);

    console.log('Classroom ID:', classroomId, 'Session ID:', sessionId);

    if (isNaN(classroomId) || isNaN(sessionId)) {
      return NextResponse.json(
        { error: 'Invalid classroom ID or session ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { sessionDetails, attendances } = body;

    // Check if session exists
    const existingSession = await prisma.classSession.findFirst({
      where: {
        id: sessionId,
        classroomId: classroomId,
      },
    });

    if (!existingSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Update session details if provided
    if (sessionDetails) {
      const updateData = {};
      if (sessionDetails.date) updateData.date = new Date(sessionDetails.date);
      if (sessionDetails.startTime !== undefined && sessionDetails.date) {
        updateData.startTime = sessionDetails.startTime
          ? new Date(`${sessionDetails.date}T${sessionDetails.startTime}:00`)
          : null;
      }
      if (sessionDetails.endTime !== undefined && sessionDetails.date) {
        updateData.endTime = sessionDetails.endTime
          ? new Date(`${sessionDetails.date}T${sessionDetails.endTime}:00`)
          : null;
      }
      if (sessionDetails.syllabusCovered !== undefined) {
        updateData.syllabusCovered = sessionDetails.syllabusCovered || null;
      }

      await prisma.classSession.update({
        where: { id: sessionId },
        data: updateData,
      });
    }

    // Update attendance records
    if (attendances && attendances.length > 0) {
      for (const att of attendances) {
        const existingAttendance = await prisma.attendance.findFirst({
          where: {
            classSessionId: sessionId,
            studentId: att.studentId,
          },
        });

        if (existingAttendance) {
          await prisma.attendance.update({
            where: { id: existingAttendance.id },
            data: {
              status: att.status,
              remarks: att.remarks || null,
            },
          });
        } else {
          await prisma.attendance.create({
            data: {
              status: att.status,
              remarks: att.remarks || null,
              studentId: att.studentId,
              classSessionId: sessionId,
              markedBy: session.user.id,
            },
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Attendance updated successfully',
    });
  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete an attendance session
export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canDeleteAttendance = await hasPermission(
      session.user.id,
      'attendance',
      'delete'
    );
    if (!canDeleteAttendance) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to delete attendance' },
        { status: 403 }
      );
    }

    // IMPORTANT: Await the params object
    const resolvedParams = await params;
    console.log('DELETE - Received params:', resolvedParams);

    const classroomId = parseInt(resolvedParams.id);
    const sessionId = parseInt(resolvedParams.sessionId);

    console.log(
      'DELETE - Classroom ID:',
      classroomId,
      'Session ID:',
      sessionId
    );

    if (isNaN(classroomId) || isNaN(sessionId)) {
      return NextResponse.json(
        { error: 'Invalid classroom ID or session ID' },
        { status: 400 }
      );
    }

    // Verify the session belongs to the classroom
    const existingSession = await prisma.classSession.findFirst({
      where: {
        id: sessionId,
        classroomId: classroomId,
      },
    });

    if (!existingSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Delete all attendance records for this session
    await prisma.attendance.deleteMany({
      where: { classSessionId: sessionId },
    });

    // Delete the session
    await prisma.classSession.delete({
      where: { id: sessionId },
    });

    return NextResponse.json({
      success: true,
      message: 'Attendance session deleted successfully',
    });
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
