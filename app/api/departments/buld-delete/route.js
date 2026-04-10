import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(request, { params }) {
  try {
    const resolvedParams = await params;
    console.log('PUT request received with params:', resolvedParams);

    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get and validate ID
    const { id } = resolvedParams;
    console.log('Raw ID from params:', id);

    // Parse the ID safely
    let departmentId;
    if (id === undefined || id === null) {
      return NextResponse.json(
        { error: 'Department ID is required' },
        { status: 400 }
      );
    }

    if (typeof id === 'string') {
      departmentId = parseInt(id, 10);
    } else if (typeof id === 'number') {
      departmentId = id;
    } else {
      return NextResponse.json(
        { error: 'Invalid department ID format' },
        { status: 400 }
      );
    }

    if (isNaN(departmentId) || departmentId <= 0) {
      return NextResponse.json(
        { error: 'Invalid department ID' },
        { status: 400 }
      );
    }

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (err) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    const { name, code, description, headOfDepartmentId, status } = body;

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

    // Prepare update data
    const updateData = {};

    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description || null;
    if (status !== undefined) updateData.status = status;

    // Handle code update
    if (code !== undefined) {
      if (code && code !== existingDepartment.code) {
        const codeConflict = await prisma.department.findFirst({
          where: {
            code: code.toUpperCase(),
            id: { not: departmentId },
          },
        });
        if (codeConflict) {
          return NextResponse.json(
            { error: 'Department code already exists' },
            { status: 400 }
          );
        }
        updateData.code = code.toUpperCase();
      }
    }

    // Handle name conflict
    if (name && name !== existingDepartment.name) {
      const nameConflict = await prisma.department.findFirst({
        where: { name, id: { not: departmentId } },
      });
      if (nameConflict) {
        return NextResponse.json(
          { error: 'Department name already exists' },
          { status: 400 }
        );
      }
    }

    // Handle head of department
    if (headOfDepartmentId !== undefined) {
      if (headOfDepartmentId === null || headOfDepartmentId === '') {
        updateData.headOfDepartmentId = null;
      } else {
        const headId = parseInt(headOfDepartmentId, 10);
        if (isNaN(headId)) {
          return NextResponse.json(
            { error: 'Invalid head of department ID' },
            { status: 400 }
          );
        }

        const userExists = await prisma.user.findUnique({
          where: { id: headId },
        });
        if (!userExists) {
          return NextResponse.json(
            { error: 'Selected head of department does not exist' },
            { status: 404 }
          );
        }

        // REMOVED: Validation that checks if user is already head of another department
        // Now a user can be head of multiple departments

        updateData.headOfDepartmentId = headId;
      }
    }

    console.log('Updating department with data:', updateData);

    // Update department
    const department = await prisma.department.update({
      where: { id: departmentId },
      data: updateData,
      include: {
        headOfDepartment: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    console.log('Department updated successfully:', department);

    return NextResponse.json({
      department,
      message: 'Department updated successfully',
    });
  } catch (error) {
    console.error('Error updating department:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const resolvedParams = await params;

    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = resolvedParams;

    // Parse the ID
    let departmentId;
    if (id === undefined || id === null) {
      return NextResponse.json(
        { error: 'Department ID is required' },
        { status: 400 }
      );
    }

    if (typeof id === 'string') {
      departmentId = parseInt(id, 10);
    } else if (typeof id === 'number') {
      departmentId = id;
    } else {
      return NextResponse.json(
        { error: 'Invalid department ID format' },
        { status: 400 }
      );
    }

    if (isNaN(departmentId) || departmentId <= 0) {
      return NextResponse.json(
        { error: 'Invalid department ID' },
        { status: 400 }
      );
    }

    const department = await prisma.department.findUnique({
      where: { id: departmentId },
      include: { _count: { select: { users: true } } },
    });

    if (!department) {
      return NextResponse.json(
        { error: 'Department not found' },
        { status: 404 }
      );
    }

    if (department._count.users > 0) {
      return NextResponse.json(
        { error: 'Cannot delete department with assigned employees' },
        { status: 400 }
      );
    }

    await prisma.department.delete({ where: { id: departmentId } });

    return NextResponse.json({ message: 'Department deleted successfully' });
  } catch (error) {
    console.error('Error deleting department:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}
