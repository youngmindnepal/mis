// app/api/employees/available-users/route.js
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const departmentId = searchParams.get('departmentId');

    // Get users who are NOT yet employees
    const existingEmployeeUserIds = await prisma.employee.findMany({
      where: { userId: { not: null } },
      select: { userId: true },
    });

    const excludeUserIds = existingEmployeeUserIds
      .map((e) => e.userId)
      .filter(Boolean);

    const where = {
      status: 'active',
      id: { notIn: excludeUserIds },
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ];
    }

    if (departmentId) {
      where.departmentId = parseInt(departmentId);
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
      take: 50,
    });

    return NextResponse.json({ users, count: users.length });
  } catch (error) {
    console.error('Error fetching available users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users', details: error.message },
      { status: 500 }
    );
  }
}
