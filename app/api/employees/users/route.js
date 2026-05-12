import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - Fetch users not yet registered as employees
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const roleId = searchParams.get('roleId');

    // Get all employee IDs that are already registered
    const existingEmployeeUserIds = await prisma.employee.findMany({
      where: { userId: { not: null } },
      select: { userId: true },
    });
    const existingUserIds = existingEmployeeUserIds
      .map((e) => e.userId)
      .filter(Boolean);

    // Also get existing employee IDs for matching
    const existingEmployeeIds = await prisma.employee.findMany({
      select: { employeeId: true },
    });

    const where = {
      status: 'active',
      id: { notIn: existingUserIds }, // Exclude already registered users
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ];
    }

    if (roleId) {
      where.roleId = parseInt(roleId);
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        role: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({
      success: true,
      users,
      existingEmployeeIds: existingEmployeeIds.map((e) => e.employeeId),
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
