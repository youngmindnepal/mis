// app/api/exams/stats/route.js
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const [
      total,
      scheduled,
      ongoing,
      completed,
      published,
      cancelled,
      upcomingExams,
      recentExams,
    ] = await Promise.all([
      prisma.exam.count(),
      prisma.exam.count({ where: { status: 'scheduled' } }),
      prisma.exam.count({ where: { status: 'ongoing' } }),
      prisma.exam.count({ where: { status: 'completed' } }),
      prisma.exam.count({ where: { status: 'result_published' } }),
      prisma.exam.count({ where: { status: 'cancelled' } }),
      prisma.exam.findMany({
        where: {
          status: 'scheduled',
          date: { gte: new Date() },
        },
        orderBy: { date: 'asc' },
        take: 5,
        include: {
          examType: true,
        },
      }),
      prisma.exam.findMany({
        where: {
          status: { in: ['completed', 'result_published'] },
        },
        orderBy: { date: 'desc' },
        take: 5,
        include: {
          examType: true,
          _count: {
            select: { results: true },
          },
        },
      }),
    ]);

    return NextResponse.json({
      total,
      scheduled,
      ongoing,
      completed,
      published,
      cancelled,
      upcomingExams,
      recentExams,
    });
  } catch (error) {
    console.error('Error fetching exam stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch exam statistics' },
      { status: 500 }
    );
  }
}
