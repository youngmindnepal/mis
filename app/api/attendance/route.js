// app/api/attendance/route.js
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const date =
      searchParams.get('date') || new Date().toISOString().split('T')[0];

    const start = new Date(date + 'T00:00:00');
    const end = new Date(date + 'T23:59:59');

    const attendances = await prisma.employeeAttendance.findMany({
      where: { date: { gte: start, lte: end } },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            employeeId: true,
            department: true,
            userId: true,
          },
        },
      },
      orderBy: { checkIn: 'desc' },
    });

    return NextResponse.json({ attendances });
  } catch (error) {
    console.error('GET /api/attendance error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch attendance' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { employeeId, confidence, action } = body;
    // action can be 'checkin' or 'checkout'

    if (!employeeId) {
      return NextResponse.json(
        { error: 'Employee ID is required' },
        { status: 400 }
      );
    }

    // Find employee
    let employee = await prisma.employee.findFirst({
      where: { userId: parseInt(employeeId) },
    });

    if (!employee) {
      employee = await prisma.employee.findUnique({
        where: { id: parseInt(employeeId) },
      });
    }

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 86400000);

    if (action === 'checkout') {
      // Find the latest attendance record without checkout
      const existing = await prisma.employeeAttendance.findFirst({
        where: {
          employeeId: employee.id,
          date: { gte: today, lt: tomorrow },
          checkOut: null,
        },
        orderBy: { checkIn: 'desc' },
      });

      if (existing) {
        const updated = await prisma.employeeAttendance.update({
          where: { id: existing.id },
          data: {
            checkOut: now,
            confidence: confidence || existing.confidence,
          },
        });

        return NextResponse.json({
          success: true,
          message: `${employee.name} checked out`,
          action: 'checkout',
          attendance: updated,
        });
      }

      return NextResponse.json({
        success: false,
        message: `${employee.name} has no active check-in to check out from`,
        action: 'no_checkin',
      });
    }

    // Default: checkin action
    // Always create a new check-in record
    const isLate = now.getHours() >= 9;
    const attendance = await prisma.employeeAttendance.create({
      data: {
        employeeId: employee.id,
        date: now,
        checkIn: now,
        checkOut: null,
        status: isLate ? 'late' : 'present',
        method: 'face',
        confidence: confidence || null,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: `${employee.name} checked in${isLate ? ' (Late)' : ''}`,
        action: 'checkin',
        attendance,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/attendance error:', error);
    return NextResponse.json(
      { error: 'Failed to mark attendance' },
      { status: 500 }
    );
  }
}
