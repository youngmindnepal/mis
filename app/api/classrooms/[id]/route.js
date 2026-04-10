// app/api/classrooms/[id]/attendance/route.js
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

function convertToDateTime(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  const dateTimeStr = `${dateStr}T${timeStr}:00`;
  return new Date(dateTimeStr);
}

// POST - Create new attendance session
export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canCreateAttendance = await hasPermission(
      session.user.id,
      'attendance',
      'create'
    );
    if (!canCreateAttendance) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to mark attendance' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const classroomId = parseInt(id);
    const body = await request.json();
    const { date, startTime, endTime, syllabusCovered, attendances } = body;

    // Check if classroom exists
    const classroom = await prisma.classroom.findUnique({
      where: { id: classroomId },
    });

    if (!classroom) {
      return NextResponse.json(
        { error: 'Classroom not found' },
        { status: 404 }
      );
    }

    // Get active enrollments
    const activeEnrollments = await prisma.classroomEnrollment.findMany({
      where: {
        classroomId,
        status: 'active',
      },
      select: { studentId: true },
    });

    const activeStudentIds = activeEnrollments.map((e) => e.studentId);

    // Filter attendances to only active students
    const filteredAttendances = attendances.filter((a) =>
      activeStudentIds.includes(a.studentId)
    );

    const startDateTime = convertToDateTime(date, startTime);
    const endDateTime = convertToDateTime(date, endTime);

    // Create class session - using connect method
    const classSession = await prisma.classSession.create({
      data: {
        title: `Attendance - ${date}`,
        date: new Date(date),
        startTime: startDateTime,
        endTime: endDateTime,
        syllabusCovered: syllabusCovered || null,
        sessionType: 'regular',
        classroom: {
          connect: { id: classroomId },
        },
      },
    });

    // Create attendance records only for active students
    for (const att of filteredAttendances) {
      await prisma.attendance.create({
        data: {
          status: att.status,
          remarks: att.remarks || null,
          studentId: att.studentId,
          classSessionId: classSession.id,
          markedBy: session.user.id,
        },
      });
    }

    // Update attendance summaries for all active students
    for (const studentId of activeStudentIds) {
      const studentAttendances = await prisma.attendance.findMany({
        where: {
          studentId: studentId,
          classSession: { classroomId: classroomId },
        },
      });

      const totalSessions = studentAttendances.length;
      const presentCount = studentAttendances.filter(
        (a) => a.status === 'present'
      ).length;
      const absentCount = studentAttendances.filter(
        (a) => a.status === 'absent'
      ).length;
      const lateCount = studentAttendances.filter(
        (a) => a.status === 'late'
      ).length;
      const excusedCount = studentAttendances.filter(
        (a) => a.status === 'excused'
      ).length;
      const percentage =
        totalSessions > 0 ? (presentCount / totalSessions) * 100 : 0;

      await prisma.attendanceSummary.upsert({
        where: {
          studentId_classroomId: {
            studentId: studentId,
            classroomId: classroomId,
          },
        },
        update: {
          totalSessions,
          presentCount,
          absentCount,
          lateCount,
          excusedCount,
          percentage,
          lastUpdated: new Date(),
        },
        create: {
          studentId: studentId,
          classroomId: classroomId,
          totalSessions,
          presentCount,
          absentCount,
          lateCount,
          excusedCount,
          percentage,
          lastUpdated: new Date(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Attendance marked successfully',
      sessionId: classSession.id,
      totalMarked: filteredAttendances.length,
    });
  } catch (error) {
    console.error('Error marking attendance:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
