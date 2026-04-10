// app/api/faculty/list/route.js
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

// Helper function to format faculty response
function formatFacultyResponse(faculty) {
  return {
    id: faculty.id,
    name: faculty.name,
    email: faculty.email,
    phone: faculty.phone,
    designation: faculty.designation,
    qualification: faculty.qualification,
    specialization: faculty.specialization,
    status: faculty.status,
    joinedDate: faculty.joinedDate,
    userId: faculty.userId,
  };
}

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission - using 'faculty' resource with 'read' action
    const canReadFaculty = await hasPermission(
      session.user.id,
      'faculty',
      'read'
    );
    if (!canReadFaculty) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to view faculty' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '200');
    const search = searchParams.get('search') || '';
    const activeOnly = searchParams.get('activeOnly') === 'true';
    const status = searchParams.get('status');

    // Validate limit
    const validLimit = isNaN(limit) || limit < 1 ? 200 : Math.min(limit, 500);

    const where = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { designation: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Filter by active only
    if (activeOnly) {
      where.status = 'active';
    }

    // Filter by specific status
    if (status && status !== 'all') {
      where.status = status;
    }

    // Get user role for additional filtering
    const userWithRole = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { role: true },
    });

    // If user is not admin, only show faculty from their department
    const isAdmin =
      userWithRole?.role?.name === 'SYSTEM_ADMIN' ||
      userWithRole?.role?.name === 'ADMIN';

    if (!isAdmin && session.user.departmentId) {
      // This would require faculty to have department relation
      // If faculty doesn't have department, this filter might need adjustment
      where.departmentId = session.user.departmentId;
    }

    const faculties = await prisma.faculty.findMany({
      where,
      take: validLimit,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        designation: true,
        qualification: true,
        specialization: true,
        status: true,
        joinedDate: true,
        userId: true,
      },
    });

    const formattedFaculties = faculties.map(formatFacultyResponse);

    return NextResponse.json({
      faculties: formattedFaculties,
      total: faculties.length,
      limit: validLimit,
    });
  } catch (error) {
    console.error('Error fetching faculty list:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}
