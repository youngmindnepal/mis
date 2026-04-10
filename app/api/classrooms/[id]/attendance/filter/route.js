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
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const search = searchParams.get('search');
    const studentId = searchParams.get('studentId');

    if (isNaN(classroomId)) {
      return NextResponse.json(
        { error: 'Invalid classroom ID' },
        { status: 400 }
      );
    }

    const classroom = await prisma.classroom.findUnique({
      where: { id: classroomId },
      include: { course: true, faculty: true },
    });

    if (!classroom) {
      return NextResponse.json(
        { error: 'Classroom not found' },
        { status: 404 }
      );
    }

    const activeEnrollments = await prisma.classroomEnrollment.findMany({
      where: { classroomId, status: 'active' },
      select: { studentId: true },
    });

    const activeStudentIds = activeEnrollments.map((e) => e.studentId);

    if (activeStudentIds.length === 0) {
      return NextResponse.json({
        attendances: [],
        sessions: [],
        classroom,
        summary: {
          total: 0,
          present: 0,
          absent: 0,
          late: 0,
          excused: 0,
          percentage: 0,
        },
      });
    }

    const dateFilter = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    const sessions = await prisma.classSession.findMany({
      where: {
        classroomId,
        ...(Object.keys(dateFilter).length > 0 && { date: dateFilter }),
      },
      orderBy: { date: 'asc' },
    });

    const sessionIds = sessions.map((s) => s.id);

    if (sessionIds.length === 0) {
      return NextResponse.json({
        attendances: [],
        sessions: [],
        classroom,
        summary: {
          total: 0,
          present: 0,
          absent: 0,
          late: 0,
          excused: 0,
          percentage: 0,
        },
      });
    }

    let attendancesWhere = {
      classSessionId: { in: sessionIds },
      studentId: { in: activeStudentIds },
    };

    if (studentId && activeStudentIds.includes(parseInt(studentId))) {
      attendancesWhere.studentId = parseInt(studentId);
    } else if (search) {
      const students = await prisma.student.findMany({
        where: {
          id: { in: activeStudentIds },
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { rollNo: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        },
        select: { id: true },
      });

      const matchingStudentIds = students.map((s) => s.id);
      if (matchingStudentIds.length > 0) {
        attendancesWhere.studentId = { in: matchingStudentIds };
      } else {
        return NextResponse.json({
          attendances: [],
          sessions,
          classroom,
          summary: {
            total: 0,
            present: 0,
            absent: 0,
            late: 0,
            excused: 0,
            percentage: 0,
          },
        });
      }
    }

    const attendances = await prisma.attendance.findMany({
      where: attendancesWhere,
      include: {
        student: { include: { user: true } },
        classSession: true,
      },
      orderBy: [
        { classSession: { date: 'asc' } },
        { student: { rollNo: 'asc' } },
      ],
    });

    const formattedAttendances = attendances.map((att) => ({
      id: att.id,
      status: att.status,
      remarks: att.remarks,
      studentId: att.studentId,
      classSessionId: att.classSessionId,
      student: att.student
        ? {
            id: att.student.id,
            name: att.student.user?.name || att.student.name,
            email: att.student.user?.email || att.student.email,
            rollNumber: att.student.rollNo || '-',
          }
        : null,
      classSession: att.classSession
        ? {
            id: att.classSession.id,
            date: att.classSession.date,
            startTime: att.classSession.startTime,
            endTime: att.classSession.endTime,
            syllabusCovered: att.classSession.syllabusCovered,
          }
        : null,
    }));

    const summary = {
      total: formattedAttendances.length,
      present: formattedAttendances.filter((a) => a.status === 'present')
        .length,
      absent: formattedAttendances.filter((a) => a.status === 'absent').length,
      late: formattedAttendances.filter((a) => a.status === 'late').length,
      excused: formattedAttendances.filter((a) => a.status === 'excused')
        .length,
      percentage:
        formattedAttendances.length > 0
          ? (formattedAttendances.filter((a) => a.status === 'present').length /
              formattedAttendances.length) *
            100
          : 0,
    };

    return NextResponse.json({
      attendances: formattedAttendances,
      sessions,
      classroom,
      summary,
    });
  } catch (error) {
    console.error('Error fetching filtered attendance:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
