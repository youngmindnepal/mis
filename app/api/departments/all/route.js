// app/api/departments/route.js
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET - Fetch all departments (simplified for dropdown)
export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // For dropdown, fetch all active departments without pagination
    const departments = await prisma.department.findMany({
      where: {
        status: 'active', // Only fetch active departments
      },
      select: {
        id: true,
        name: true,
        code: true,
        status: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Return array directly for easy consumption
    return NextResponse.json(departments);
  } catch (error) {
    console.error('Error fetching departments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create a new department
export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to create departments
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
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

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check for admin or specific permission
    const hasPermission =
      user.role?.permissions?.some(
        (rp) =>
          rp.permission.resource === 'departments' &&
          rp.permission.action === 'create'
      ) ||
      user.role?.name === 'SYSTEM_ADMIN' ||
      user.role?.name === 'ADMIN';

    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { name, code, description, headOfDepartmentId, status } = body;

    // Validate required fields
    if (!name || !code) {
      return NextResponse.json(
        { error: 'Name and code are required' },
        { status: 400 }
      );
    }

    // Check if department code already exists
    const existingDepartment = await prisma.department.findFirst({
      where: {
        OR: [{ code: code.toUpperCase() }, { name: name }],
      },
    });

    if (existingDepartment) {
      return NextResponse.json(
        { error: 'Department with this name or code already exists' },
        { status: 409 }
      );
    }

    // Prepare create data
    const createData = {
      name,
      code: code.toUpperCase(),
      description: description || null,
      status: status || 'active',
    };

    // Handle headOfDepartmentId
    if (
      headOfDepartmentId &&
      headOfDepartmentId !== '' &&
      headOfDepartmentId !== 'null'
    ) {
      const headId = parseInt(headOfDepartmentId);
      if (!isNaN(headId)) {
        createData.headOfDepartment = {
          connect: { id: headId },
        };
      }
    }

    // Create department
    const department = await prisma.department.create({
      data: createData,
      include: {
        headOfDepartment: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    // Return only the created department
    return NextResponse.json(department, { status: 201 });
  } catch (error) {
    console.error('Error creating department:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
