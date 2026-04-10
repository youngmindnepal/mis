// app/api/departments/[id]/route.js
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

// PUT - Update a department (returns only the updated department)
export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to update departments
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
          rp.permission.action === 'update'
      ) ||
      user.role?.name === 'SYSTEM_ADMIN' ||
      user.role?.name === 'ADMIN';

    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Await params if it's a promise (Next.js App Router)
    const resolvedParams = await params;
    const { id } = resolvedParams;

    const departmentId = parseInt(id);

    // Validate department ID
    if (isNaN(departmentId)) {
      return NextResponse.json(
        { error: 'Invalid department ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, code, description, headOfDepartmentId, status } = body;

    // Validate required fields
    if (!name || !code) {
      return NextResponse.json(
        { error: 'Name and code are required' },
        { status: 400 }
      );
    }

    // Check if department exists
    const existingDepartment = await prisma.department.findUnique({
      where: { id: departmentId },
    });

    if (!existingDepartment) {
      return NextResponse.json(
        { error: 'Department not found' },
        { status: 404 }
      );
    }

    // Check if new code/name conflicts with other departments
    const conflictDepartment = await prisma.department.findFirst({
      where: {
        AND: [
          { NOT: { id: departmentId } },
          {
            OR: [{ code: code.toUpperCase() }, { name: name }],
          },
        ],
      },
    });

    if (conflictDepartment) {
      return NextResponse.json(
        { error: 'Another department with this name or code already exists' },
        { status: 409 }
      );
    }

    // Prepare update data
    const updateData = {
      name,
      code: code.toUpperCase(),
      description: description || null,
      status: status || 'active',
    };

    // Handle headOfDepartmentId properly
    if (
      headOfDepartmentId &&
      headOfDepartmentId !== '' &&
      headOfDepartmentId !== 'null'
    ) {
      const headId = parseInt(headOfDepartmentId);
      if (!isNaN(headId)) {
        // Check if the user exists
        const headUser = await prisma.user.findUnique({
          where: { id: headId },
        });

        if (headUser) {
          updateData.headOfDepartment = {
            connect: { id: headId },
          };
        } else {
          updateData.headOfDepartment = {
            disconnect: true,
          };
        }
      } else {
        updateData.headOfDepartment = {
          disconnect: true,
        };
      }
    } else {
      // Disconnect the head of department if none selected
      updateData.headOfDepartment = {
        disconnect: true,
      };
    }

    // Update department
    const updatedDepartment = await prisma.department.update({
      where: { id: departmentId },
      data: updateData,
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

    // Return only the updated department
    return NextResponse.json(updatedDepartment);
  } catch (error) {
    console.error('Error updating department:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Delete a department
export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to delete departments
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
          rp.permission.action === 'delete'
      ) ||
      user.role?.name === 'SYSTEM_ADMIN' ||
      user.role?.name === 'ADMIN';

    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Await params if it's a promise (Next.js App Router)
    const resolvedParams = await params;
    const { id } = resolvedParams;
    const departmentId = parseInt(id);

    if (isNaN(departmentId)) {
      return NextResponse.json(
        { error: 'Invalid department ID' },
        { status: 400 }
      );
    }

    // Check if department exists
    const existingDepartment = await prisma.department.findUnique({
      where: { id: departmentId },
      include: {
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    if (!existingDepartment) {
      return NextResponse.json(
        { error: 'Department not found' },
        { status: 404 }
      );
    }

    // Check if department has users
    if (existingDepartment._count.users > 0) {
      return NextResponse.json(
        { error: 'Cannot delete department with assigned users' },
        { status: 400 }
      );
    }

    // Delete department
    await prisma.department.delete({
      where: { id: departmentId },
    });

    return NextResponse.json(
      { message: 'Department deleted successfully', id: departmentId },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting department:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
