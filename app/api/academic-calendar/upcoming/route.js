// app/api/academic-calendar/upcoming/route.js
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

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const days = parseInt(searchParams.get('days') || '30');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + days);
    futureDate.setHours(23, 59, 59, 999);

    const events = await prisma.academicCalendar.findMany({
      where: {
        date: { gte: today, lte: futureDate },
      },
      include: {
        batch: { select: { id: true, name: true } },
      },
      orderBy: { date: 'asc' },
      take: limit,
    });

    // Group by date
    const eventsByDate = {};
    events.forEach((event) => {
      const dateKey = event.date.toISOString().split('T')[0];
      if (!eventsByDate[dateKey]) {
        eventsByDate[dateKey] = {
          date: dateKey,
          dayName: event.date.toLocaleDateString('en-US', { weekday: 'long' }),
          monthName: event.date.toLocaleDateString('en-US', { month: 'long' }),
          day: event.date.getDate(),
          events: [],
        };
      }
      eventsByDate[dateKey].events.push(event);
    });

    return NextResponse.json({
      success: true,
      upcomingEvents: Object.values(eventsByDate),
      totalEvents: events.length,
    });
  } catch (error) {
    console.error('Error fetching upcoming events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch upcoming events' },
      { status: 500 }
    );
  }
}
