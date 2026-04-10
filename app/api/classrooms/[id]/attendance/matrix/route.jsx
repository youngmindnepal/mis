// app/api/classrooms/[id]/attendance/matrix/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Permission checking function
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

    // SYSTEM_ADMIN has all permissions
    if (user.role?.name === 'SYSTEM_ADMIN') {
      return true;
    }

    // Check specific permission
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

// Helper function to format session response
function formatSessionResponse(session) {
  return {
    id: session.id,
    date: session.date,
    title: session.title,
    startTime: session.startTime,
    endTime: session.endTime,
    syllabusCovered: session.syllabusCovered,
  };
}

// Helper function to format student response
function formatStudentResponse(student) {
  return {
    id: student.id,
    name: student.user?.name || student.name || 'Unknown Student',
    email: student.user?.email || student.email || 'No email',
    rollNumber: student.rollNo || student.rollNumber || '-',
  };
}

export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission
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

    if (isNaN(classroomId)) {
      return NextResponse.json(
        { error: 'Invalid classroom ID' },
        { status: 400 }
      );
    }

    // Get classroom details
    const classroom = await prisma.classroom.findUnique({
      where: { id: classroomId },
    });

    if (!classroom) {
      return NextResponse.json(
        { error: 'Classroom not found' },
        { status: 404 }
      );
    }

    // Build date filter
    const dateFilter = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate);
    }

    // Get all sessions within date range
    const sessions = await prisma.classSession.findMany({
      where: {
        classroomId,
        ...(Object.keys(dateFilter).length > 0 && { date: dateFilter }),
      },
      orderBy: { date: 'asc' },
    });

    // Get all enrolled students
    const studentsQuery = {
      where: {
        classroomEnrollments: {
          some: {
            classroomId,
            status: 'active',
          },
        },
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        rollNo: 'asc',
      },
    };

    // Add search filter if provided
    if (search) {
      studentsQuery.where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { rollNo: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const students = await prisma.student.findMany(studentsQuery);

    // Get all attendances for these sessions and students
    const sessionIds = sessions.map((s) => s.id);
    const studentIds = students.map((s) => s.id);

    const attendances = await prisma.attendance.findMany({
      where: {
        classSessionId: { in: sessionIds },
        studentId: { in: studentIds },
      },
    });

    // Build attendance matrix
    const matrix = {};
    attendances.forEach((att) => {
      if (!matrix[att.studentId]) {
        matrix[att.studentId] = {};
      }
      matrix[att.studentId][att.classSessionId] = att.status;
    });

    // Calculate attendance statistics for each student
    const studentStats = students.map((student) => {
      const studentAttendance = attendances.filter(
        (a) => a.studentId === student.id
      );
      const totalSessions = sessions.length;
      const presentCount = studentAttendance.filter(
        (a) => a.status === 'present'
      ).length;
      const absentCount = studentAttendance.filter(
        (a) => a.status === 'absent'
      ).length;
      const lateCount = studentAttendance.filter(
        (a) => a.status === 'late'
      ).length;
      const excusedCount = studentAttendance.filter(
        (a) => a.status === 'excused'
      ).length;
      const percentage =
        totalSessions > 0 ? (presentCount / totalSessions) * 100 : 0;

      return {
        studentId: student.id,
        presentCount,
        absentCount,
        lateCount,
        excusedCount,
        totalSessions,
        percentage: percentage.toFixed(2),
      };
    });

    // Format students data
    const formattedStudents = students.map(formatStudentResponse);
    const formattedSessions = sessions.map(formatSessionResponse);

    // Get user role for access control
    const userWithRole = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { role: true },
    });

    const userRole = userWithRole?.role?.name;

    // If user is a student, filter to only show their own data
    if (userRole === 'STUDENT') {
      const student = await prisma.student.findUnique({
        where: { userId: session.user.id },
      });

      if (student) {
        const studentIndex = formattedStudents.findIndex(
          (s) => s.id === student.id
        );
        if (studentIndex !== -1) {
          const filteredStudents = [formattedStudents[studentIndex]];
          const filteredStats = [studentStats[studentIndex]];

          return NextResponse.json({
            students: filteredStudents,
            sessions: formattedSessions,
            matrix: { [student.id]: matrix[student.id] || {} },
            stats: filteredStats,
          });
        }
      }
    }

    return NextResponse.json({
      students: formattedStudents,
      sessions: formattedSessions,
      matrix,
      stats: studentStats,
      summary: {
        totalStudents: students.length,
        totalSessions: sessions.length,
        overallAttendance:
          studentStats.reduce((sum, s) => sum + parseFloat(s.percentage), 0) /
          (studentStats.length || 1),
      },
    });
  } catch (error) {
    console.error('Error fetching attendance matrix:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}
