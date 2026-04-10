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

export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canReadAttendance = await hasPermission(
      session.user.id,
      'attendance',
      'read'
    );
    if (!canReadAttendance) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to view attendance' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const classroomId = parseInt(id);
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');

    if (!dateParam) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 });
    }

    const targetDate = new Date(dateParam);
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const classSession = await prisma.classSession.findFirst({
      where: {
        classroomId,
        date: { gte: targetDate, lt: nextDay },
      },
      include: { attendances: true },
    });

    const enrollments = await prisma.classroomEnrollment.findMany({
      where: { classroomId, status: 'active' },
      include: {
        student: {
          include: { user: true },
        },
      },
    });

    const activeEnrollments = enrollments.filter(
      (enrollment) =>
        enrollment.student && enrollment.student.status === 'active'
    );

    const attendances = activeEnrollments.map((enrollment) => {
      const attendance = classSession?.attendances?.find(
        (a) => a.studentId === enrollment.studentId
      );
      return {
        studentId: enrollment.student.id,
        studentName: enrollment.student.user?.name || enrollment.student.name,
        rollNumber: enrollment.student.rollNo || '-',
        status: attendance?.status || 'present',
        remarks: attendance?.remarks || '',
        attendanceId: attendance?.id || null,
      };
    });

    return NextResponse.json({
      session: classSession
        ? {
            id: classSession.id,
            date: classSession.date,
            startTime: classSession.startTime,
            endTime: classSession.endTime,
            syllabusCovered: classSession.syllabusCovered,
          }
        : null,
      attendances,
    });
  } catch (error) {
    console.error('Error fetching attendance by date:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}
