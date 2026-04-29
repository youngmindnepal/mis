// app/api/classrooms/stats/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const totalClassrooms = await prisma.classroom.count();
    const totalEnrollments = await prisma.classroomEnrollment.count({
      where: { status: 'active' },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todaySessions = await prisma.classSession.count({
      where: { date: { gte: today, lt: tomorrow } },
    });

    const lastDayOfMonth = new Date(
      today.getFullYear(),
      today.getMonth() + 1,
      0
    );
    const upcomingEvents = await prisma.academicCalendar.count({
      where: { date: { gte: today, lte: lastDayOfMonth } },
    });

    return NextResponse.json({
      success: true,
      stats: {
        totalClassrooms,
        totalEnrollments,
        todaySessions,
        upcomingEvents,
      },
    });
  } catch (error) {
    console.error('Error fetching classroom stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
