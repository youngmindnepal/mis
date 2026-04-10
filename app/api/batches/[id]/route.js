import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Helper function to check permissions
async function hasPermission(session, resource, action) {
  if (!session || !session.user) return false;

  const hasAdminRole = session.user.roles?.some((r) => {
    const roleName = typeof r === 'string' ? r : r.name;
    return ['SYSTEM_ADMIN', 'ADMIN', 'SUPER_ADMIN'].includes(roleName);
  });

  if (hasAdminRole) return true;

  let permissions = session.user.permissions || [];

  if (permissions.length > 0 && typeof permissions[0] === 'object') {
    return permissions.some(
      (p) => p.resource === resource && p.action === action
    );
  }

  const permissionString = `${resource}:${action}`;
  return permissions.includes(permissionString);
}

// GET /api/batches/[id]
export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canRead = await hasPermission(session, 'batches', 'read');
    if (!canRead) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // IMPORTANT: Await params before using it
    const { id: idParam } = await params;
    const id = parseInt(idParam);

    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid batch ID' }, { status: 400 });
    }

    const batch = await prisma.batch.findUnique({
      where: { id },
      include: {
        department: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    const studentCount = await prisma.student.count({
      where: { batchId: id },
    });

    const formattedBatch = {
      ...batch,
      id: Number(batch.id),
      departmentId: batch.departmentId ? Number(batch.departmentId) : null,
      startDate: batch.startDate ? batch.startDate.toISOString() : null,
      endDate: batch.endDate ? batch.endDate.toISOString() : null,
      createdAt: batch.createdAt.toISOString(),
      updatedAt: batch.updatedAt.toISOString(),
      _count: { students: studentCount },
    };

    return NextResponse.json(formattedBatch);
  } catch (error) {
    console.error('Error fetching batch:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}

// PUT /api/batches/[id]
export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canUpdate = await hasPermission(session, 'batches', 'update');
    if (!canUpdate) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // IMPORTANT: Await params before using it
    const { id: idParam } = await params;
    const id = parseInt(idParam);

    console.log('PUT - ID from params:', idParam, 'Parsed:', id);

    if (isNaN(id)) {
      return NextResponse.json(
        { error: `Invalid batch ID: ${idParam}` },
        { status: 400 }
      );
    }

    const existingBatch = await prisma.batch.findUnique({
      where: { id },
      include: { department: true },
    });

    if (!existingBatch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const {
      name,
      description,
      academicYear,
      startDate,
      endDate,
      departmentId,
      status,
    } = body;

    const updateData = {};
    if (name !== undefined) updateData.name = name?.trim();
    if (description !== undefined) updateData.description = description || null;
    if (academicYear !== undefined)
      updateData.academicYear = academicYear || null;
    if (status !== undefined) updateData.status = status;

    const isAdmin = session.user.roles?.some((r) => {
      const roleName = typeof r === 'string' ? r : r.name;
      return ['SYSTEM_ADMIN', 'ADMIN', 'SUPER_ADMIN'].includes(roleName);
    });

    if (departmentId !== undefined) {
      if (departmentId === null || departmentId === '') {
        updateData.departmentId = null;
      } else {
        const parsedDeptId = parseInt(departmentId);
        if (isNaN(parsedDeptId)) {
          return NextResponse.json(
            { error: 'Invalid department ID' },
            { status: 400 }
          );
        }

        const departmentExists = await prisma.department.findUnique({
          where: { id: parsedDeptId },
        });

        if (!departmentExists) {
          return NextResponse.json(
            { error: 'Department not found' },
            { status: 404 }
          );
        }

        if (
          !isAdmin &&
          session.user.departmentId &&
          parsedDeptId !== session.user.departmentId
        ) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        updateData.departmentId = parsedDeptId;
      }
    }

    if (startDate !== undefined) {
      updateData.startDate = startDate ? new Date(startDate) : null;
    }

    if (endDate !== undefined) {
      updateData.endDate = endDate ? new Date(endDate) : null;
    }

    const updatedBatch = await prisma.batch.update({
      where: { id },
      data: updateData,
      include: {
        department: { select: { id: true, name: true, code: true } },
      },
    });

    const studentCount = await prisma.student.count({ where: { batchId: id } });

    const formattedBatch = {
      ...updatedBatch,
      id: Number(updatedBatch.id),
      departmentId: updatedBatch.departmentId
        ? Number(updatedBatch.departmentId)
        : null,
      startDate: updatedBatch.startDate
        ? updatedBatch.startDate.toISOString()
        : null,
      endDate: updatedBatch.endDate ? updatedBatch.endDate.toISOString() : null,
      createdAt: updatedBatch.createdAt.toISOString(),
      updatedAt: updatedBatch.updatedAt.toISOString(),
      _count: { students: studentCount },
    };

    return NextResponse.json(formattedBatch);
  } catch (error) {
    console.error('Error updating batch:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/batches/[id]
export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canDelete = await hasPermission(session, 'batches', 'delete');
    if (!canDelete) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // IMPORTANT: Await params before using it
    const { id: idParam } = await params;
    const id = parseInt(idParam);

    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid batch ID' }, { status: 400 });
    }

    const existingBatch = await prisma.batch.findUnique({ where: { id } });

    if (!existingBatch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    const studentCount = await prisma.student.count({ where: { batchId: id } });

    if (studentCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete batch with assigned students' },
        { status: 400 }
      );
    }

    await prisma.batch.delete({ where: { id } });

    return NextResponse.json({ message: 'Batch deleted successfully' });
  } catch (error) {
    console.error('Error deleting batch:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}
