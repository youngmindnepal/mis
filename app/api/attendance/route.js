import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const date =
      searchParams.get('date') || new Date().toISOString().split('T')[0];
    const employeeId = searchParams.get('employeeId');

    const where = {
      date: {
        gte: new Date(date + 'T00:00:00'),
        lte: new Date(date + 'T23:59:59.999'),
      },
    };
    if (employeeId) where.employeeId = parseInt(employeeId);

    const attendances = await prisma.employeeAttendance.findMany({
      where,
      include: {
        employee: {
          select: { id: true, name: true, employeeId: true, department: true },
        },
      },
      orderBy: { checkIn: 'desc' },
    });

    return NextResponse.json({ success: true, attendances, date });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { employeeId, confidence } = body;
    if (!employeeId)
      return NextResponse.json(
        { error: 'Employee ID required' },
        { status: 400 }
      );

    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    const todayEnd = new Date(todayStart.getTime() + 86400000);

    const existing = await prisma.employeeAttendance.findFirst({
      where: {
        employeeId: parseInt(employeeId),
        date: { gte: todayStart, lt: todayEnd },
      },
    });

    if (existing) {
      if (existing.checkIn && !existing.checkOut) {
        const att = await prisma.employeeAttendance.update({
          where: { id: existing.id },
          data: { checkOut: now },
          include: { employee: { select: { name: true } } },
        });
        return NextResponse.json({
          success: true,
          type: 'checkout',
          message: `${att.employee.name} checked out!`,
          attendance: att,
        });
      }
      return NextResponse.json({
        success: false,
        message: 'Already checked in/out today',
      });
    }

    const isLate = now.getHours() >= 9;
    const att = await prisma.employeeAttendance.create({
      data: {
        employeeId: parseInt(employeeId),
        date: now,
        checkIn: now,
        status: isLate ? 'late' : 'present',
        method: 'face',
        confidence: confidence || null,
      },
      include: { employee: { select: { name: true } } },
    });

    return NextResponse.json(
      {
        success: true,
        type: 'checkin',
        message: `Welcome ${att.employee.name}!`,
        attendance: att,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed', details: error.message },
      { status: 500 }
    );
  }
}
