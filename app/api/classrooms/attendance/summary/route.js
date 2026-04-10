// app/api/classrooms/attendance/summary/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';

export async function GET(request) {
  console.log('API Route called: /api/classrooms/attendance/summary');

  try {
    const session = await getServerSession();
    console.log('Session:', session ? 'Found' : 'Not found');

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const activeOnly = searchParams.get('activeOnly') === 'true';

    console.log('Params:', { batchId, startDate, endDate, activeOnly });

    if (!batchId) {
      return NextResponse.json(
        { error: 'Batch ID is required' },
        { status: 400 }
      );
    }

    // Fetch batch with classrooms and their courses
    const batch = await prisma.batch.findUnique({
      where: { id: parseInt(batchId) },
      include: {
        students: {
          orderBy: {
            name: 'asc',
          },
        },
        classrooms: {
          include: {
            course: true,
            faculty: true,
          },
          orderBy: {
            name: 'asc',
          },
        },
      },
    });

    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    // Filter students if activeOnly is true
    const filteredStudents = activeOnly
      ? batch.students.filter((s) => s.status === 'active')
      : batch.students;

    console.log(
      'Batch found:',
      batch.name,
      'with',
      batch.classrooms.length,
      'classrooms and',
      filteredStudents.length,
      'students (filtered from',
      batch.students.length,
      'total)'
    );

    // Parse dates
    const startDateTime = startDate
      ? new Date(startDate)
      : new Date('2000-01-01');
    const endDateTime = endDate ? new Date(endDate) : new Date();
    endDateTime.setHours(23, 59, 59, 999);

    // Get all classroom IDs for this batch
    const classroomIds = batch.classrooms.map((c) => c.id);
    const studentIds = filteredStudents.map((s) => s.id);

    // Fetch attendance records through class sessions
    let classSessions = [];
    if (classroomIds.length > 0) {
      try {
        classSessions = await prisma.classSession.findMany({
          where: {
            classroomId: { in: classroomIds },
            date: {
              gte: startDateTime,
              lte: endDateTime,
            },
          },
          include: {
            classroom: {
              include: {
                course: true,
                faculty: true,
              },
            },
            attendances: {
              where: {
                studentId: { in: studentIds },
              },
              include: {
                student: true,
              },
            },
          },
          orderBy: {
            date: 'asc',
          },
        });
        console.log('Found', classSessions.length, 'class sessions');
      } catch (error) {
        console.error('Error fetching attendance records:', error);
      }
    }

    // Process data for each classroom (subject)
    const subjectsData = batch.classrooms.map((classroom) => {
      const classroomSessions = classSessions.filter(
        (session) => session.classroomId === classroom.id
      );

      const totalClasses = classroomSessions.length;
      let totalPresent = 0;
      let totalAbsent = 0;

      // Daily attendance breakdown
      const dailyAttendance = classroomSessions.map((session) => {
        const presentCount =
          session.attendances?.filter((a) => a.status === 'present').length ||
          0;
        const absentCount =
          session.attendances?.filter((a) => a.status === 'absent').length || 0;
        const totalStudents = presentCount + absentCount;

        totalPresent += presentCount;
        totalAbsent += absentCount;

        return {
          date: session.date.toISOString().split('T')[0],
          present: presentCount,
          absent: absentCount,
          percentage:
            totalStudents > 0
              ? parseFloat(((presentCount / totalStudents) * 100).toFixed(1))
              : 0,
        };
      });

      const totalRecords = totalPresent + totalAbsent;
      const attendancePercentage =
        totalRecords > 0
          ? parseFloat(((totalPresent / totalRecords) * 100).toFixed(1))
          : 0;

      return {
        id: classroom.id,
        name: classroom.course?.name || classroom.name || 'Unknown Subject',
        code: classroom.course?.code || 'N/A',
        teacher: classroom.faculty?.name || 'Unknown Teacher',
        totalClasses,
        presentCount: totalPresent,
        absentCount: totalAbsent,
        attendancePercentage,
        dailyAttendance,
      };
    });

    // Build student-wise report
    const studentReport = filteredStudents.map((student) => {
      const subjectWiseAttendance = batch.classrooms.map((classroom) => {
        const classroomSessions = classSessions.filter(
          (session) => session.classroomId === classroom.id
        );

        let present = 0;
        let absent = 0;
        let total = 0;

        classroomSessions.forEach((session) => {
          const attendance = session.attendances?.find(
            (a) => a.studentId === student.id
          );

          if (attendance) {
            total++;
            if (attendance.status === 'present') {
              present++;
            } else if (attendance.status === 'absent') {
              absent++;
            }
          }
        });

        const percentage =
          total > 0 ? parseFloat(((present / total) * 100).toFixed(1)) : 0;

        return {
          classroomId: classroom.id,
          subjectName: classroom.course?.name || classroom.name || 'N/A',
          subjectCode: classroom.course?.code || 'N/A',
          totalClasses: total,
          presentDays: present,
          absentDays: absent,
          percentage,
        };
      });

      const overallTotal = subjectWiseAttendance.reduce(
        (sum, s) => sum + s.totalClasses,
        0
      );
      const overallPresent = subjectWiseAttendance.reduce(
        (sum, s) => sum + s.presentDays,
        0
      );
      const overallAbsent = subjectWiseAttendance.reduce(
        (sum, s) => sum + s.absentDays,
        0
      );
      const overallPercentage =
        overallTotal > 0
          ? parseFloat(((overallPresent / overallTotal) * 100).toFixed(1))
          : 0;

      return {
        studentId: student.id,
        studentName: student.name,
        enrollmentNo: student.enrollmentNo || 'N/A',
        email: student.email || 'N/A',
        rollNo: student.rollNo || 'N/A',
        status: student.status,
        subjects: subjectWiseAttendance,
        overall: {
          totalClasses: overallTotal,
          presentDays: overallPresent,
          absentDays: overallAbsent,
          percentage: overallPercentage,
          status:
            overallPercentage >= 75
              ? 'Good'
              : overallPercentage >= 60
              ? 'Average'
              : 'Poor',
        },
      };
    });

    // Calculate overall summary
    const totalClasses = subjectsData.reduce(
      (sum, s) => sum + s.totalClasses,
      0
    );
    const totalPresent = subjectsData.reduce(
      (sum, s) => sum + s.presentCount,
      0
    );
    const totalAbsent = subjectsData.reduce((sum, s) => sum + s.absentCount, 0);
    const totalRecords = totalPresent + totalAbsent;
    const overallPercentage =
      totalRecords > 0
        ? parseFloat(((totalPresent / totalRecords) * 100).toFixed(1))
        : 0;

    const summary = {
      totalSubjects: subjectsData.length,
      totalClasses,
      totalPresent,
      totalAbsent,
      overallPercentage,
      totalStudents: filteredStudents.length,
    };

    // Student stats
    const studentStats = {
      above75: studentReport.filter((s) => s.overall.percentage >= 75).length,
      between60And75: studentReport.filter(
        (s) => s.overall.percentage >= 60 && s.overall.percentage < 75
      ).length,
      below60: studentReport.filter(
        (s) => s.overall.percentage < 60 && s.overall.totalClasses > 0
      ).length,
      noAttendance: studentReport.filter((s) => s.overall.totalClasses === 0)
        .length,
    };

    const responseData = {
      batch: {
        id: batch.id,
        name: batch.name,
        academicYear: batch.academicYear,
      },
      summary,
      subjects: subjectsData,
      studentReport,
      studentStats,
      dateRange: {
        startDate: startDateTime.toISOString().split('T')[0],
        endDate: endDateTime.toISOString().split('T')[0],
      },
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error in attendance summary API:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch attendance summary',
        details:
          process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
