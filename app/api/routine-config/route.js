// app/api/routine-config/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - Fetch config for a batch
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');

    if (!batchId) {
      return NextResponse.json({ error: 'batchId required' }, { status: 400 });
    }

    let config = await prisma.routineConfig.findUnique({
      where: { batchId: parseInt(batchId) },
    });

    if (!config) {
      // Return default config
      return NextResponse.json({
        config: {
          batchId: parseInt(batchId),
          timeSlots: [
            { id: 0, start: '07:01', end: '07:30', display: '07:01-07:30' },
            { id: 1, start: '07:31', end: '08:00', display: '07:31-08:00' },
            { id: 2, start: '08:01', end: '08:30', display: '08:01-08:30' },
            { id: 3, start: '08:31', end: '09:00', display: '08:31-09:00' },
            { id: 4, start: '09:01', end: '09:30', display: '09:01-09:30' },
            { id: 5, start: '09:31', end: '10:00', display: '09:31-10:00' },
            { id: 6, start: '10:01', end: '10:30', display: '10:01-10:30' },
            { id: 7, start: '10:31', end: '11:00', display: '10:31-11:00' },
            { id: 8, start: '11:01', end: '11:30', display: '11:01-11:30' },
            { id: 9, start: '11:31', end: '12:00', display: '11:31-12:00' },
            { id: 10, start: '12:01', end: '12:30', display: '12:01-12:30' },
            { id: 11, start: '12:31', end: '13:00', display: '12:31-01:00' },
            { id: 12, start: '13:01', end: '13:30', display: '01:01-01:30' },
            { id: 13, start: '13:31', end: '14:00', display: '01:31-02:00' },
          ],
          startTime: '07:01',
          endTime: '14:00',
          interval: 30,
          termCount: 2,
          termWeeks: [7, 12],
          examDays: 5,
          semesterDuration: 16,
          isDefault: true,
        },
      });
    }

    return NextResponse.json({ config });
  } catch (error) {
    console.error('GET routine-config error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create or update config
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      batchId,
      timeSlots,
      startTime,
      endTime,
      interval,
      termCount,
      termWeeks,
      examDays,
      semesterDuration,
    } = body;

    if (!batchId) {
      return NextResponse.json({ error: 'batchId required' }, { status: 400 });
    }

    const config = await prisma.routineConfig.upsert({
      where: { batchId: parseInt(batchId) },
      create: {
        batchId: parseInt(batchId),
        timeSlots: timeSlots || [],
        startTime: startTime || '07:01',
        endTime: endTime || '14:00',
        interval: interval || 30,
        termCount: termCount || 2,
        termWeeks: termWeeks || [7, 12],
        examDays: examDays || 5,
        semesterDuration: semesterDuration || 16,
      },
      update: {
        timeSlots: timeSlots || undefined,
        startTime: startTime || undefined,
        endTime: endTime || undefined,
        interval: interval || undefined,
        termCount: termCount || undefined,
        termWeeks: termWeeks || undefined,
        examDays: examDays || undefined,
        semesterDuration: semesterDuration || undefined,
      },
    });

    return NextResponse.json({ config, message: 'Configuration saved' });
  } catch (error) {
    console.error('POST routine-config error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
