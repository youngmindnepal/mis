import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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

  return permissions.includes(`${resource}:${action}`);
}

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canRead = await hasPermission(session, 'batches', 'read');
    if (!canRead) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status');
    const departmentId = searchParams.get('departmentId');

    const validPage = isNaN(page) || page < 1 ? 1 : page;
    const validLimit = isNaN(limit) || limit < 1 ? 10 : Math.min(limit, 100);
    const skip = (validPage - 1) * validLimit;

    const where = {};

    if (search && search.trim()) {
      where.OR = [
        { name: { contains: search.trim(), mode: 'insensitive' } },
        { description: { contains: search.trim(), mode: 'insensitive' } },
        { academicYear: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    if (status && status !== 'all' && status !== 'undefined') {
      where.status = status;
    }

    if (
      departmentId &&
      departmentId !== 'all' &&
      departmentId !== 'undefined'
    ) {
      const parsedDeptId = parseInt(departmentId);
      if (!isNaN(parsedDeptId)) {
        where.departmentId = parsedDeptId;
      }
    }

    const isAdmin = session.user.roles?.some((r) => {
      const roleName = typeof r === 'string' ? r : r.name;
      return ['SYSTEM_ADMIN', 'ADMIN', 'SUPER_ADMIN'].includes(roleName);
    });

    if (!isAdmin && session.user.departmentId) {
      if (
        where.departmentId &&
        where.departmentId !== session.user.departmentId
      ) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      where.departmentId = session.user.departmentId;
    }

    const total = await prisma.batch.count({ where });

    const batches = await prisma.batch.findMany({
      where,
      skip,
      take: validLimit,
      orderBy: { createdAt: 'desc' },
      include: {
        department: {
          select: { id: true, name: true, code: true },
        },
        // Add _count to include student count
        _count: {
          select: {
            students: true, // Count the students relation
          },
        },
      },
    });

    const formattedBatches = batches.map((batch) => ({
      ...batch,
      id: Number(batch.id),
      departmentId: batch.departmentId ? Number(batch.departmentId) : null,
      startDate: batch.startDate ? batch.startDate.toISOString() : null,
      endDate: batch.endDate ? batch.endDate.toISOString() : null,
      createdAt: batch.createdAt.toISOString(),
      updatedAt: batch.updatedAt.toISOString(),
      // Include student count in the response
      studentCount: batch._count.students,
    }));

    return NextResponse.json({
      batches: formattedBatches,
      pagination: {
        page: validPage,
        limit: validLimit,
        total,
        totalPages: Math.ceil(total / validLimit),
      },
    });
  } catch (error) {
    console.error('Error fetching batches:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canCreate = await hasPermission(session, 'batches', 'create');
    if (!canCreate) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { error: 'Batch name is required' },
        { status: 400 }
      );
    }

    const existingBatch = await prisma.batch.findFirst({
      where: {
        name: { equals: name.trim(), mode: 'insensitive' },
      },
    });

    if (existingBatch) {
      return NextResponse.json(
        { error: 'A batch with this name already exists' },
        { status: 409 }
      );
    }

    let parsedDepartmentId = null;
    if (departmentId) {
      parsedDepartmentId = parseInt(departmentId);
      if (isNaN(parsedDepartmentId)) {
        return NextResponse.json(
          { error: 'Invalid department ID' },
          { status: 400 }
        );
      }

      const departmentExists = await prisma.department.findUnique({
        where: { id: parsedDepartmentId },
      });

      if (!departmentExists) {
        return NextResponse.json(
          { error: 'Department not found' },
          { status: 404 }
        );
      }

      const isAdmin = session.user.roles?.some((r) => {
        const roleName = typeof r === 'string' ? r : r.name;
        return ['SYSTEM_ADMIN', 'ADMIN', 'SUPER_ADMIN'].includes(roleName);
      });

      if (
        !isAdmin &&
        session.user.departmentId &&
        session.user.departmentId !== parsedDepartmentId
      ) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    let parsedStartDate = null;
    let parsedEndDate = null;

    if (startDate) {
      parsedStartDate = new Date(startDate);
      if (isNaN(parsedStartDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid start date' },
          { status: 400 }
        );
      }
    }

    if (endDate) {
      parsedEndDate = new Date(endDate);
      if (isNaN(parsedEndDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid end date' },
          { status: 400 }
        );
      }

      if (parsedStartDate && parsedEndDate < parsedStartDate) {
        return NextResponse.json(
          { error: 'End date cannot be before start date' },
          { status: 400 }
        );
      }
    }

    const batch = await prisma.batch.create({
      data: {
        name: name.trim(),
        description: description || null,
        academicYear: academicYear || null,
        startDate: parsedStartDate,
        endDate: parsedEndDate,
        departmentId: parsedDepartmentId,
        status: status || 'active',
      },
      include: {
        department: { select: { id: true, name: true, code: true } },
      },
    });

    const formattedBatch = {
      ...batch,
      id: Number(batch.id),
      departmentId: batch.departmentId ? Number(batch.departmentId) : null,
      startDate: batch.startDate ? batch.startDate.toISOString() : null,
      endDate: batch.endDate ? batch.endDate.toISOString() : null,
      createdAt: batch.createdAt.toISOString(),
      updatedAt: batch.updatedAt.toISOString(),
    };

    return NextResponse.json(formattedBatch, { status: 201 });
  } catch (error) {
    console.error('Error creating batch:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}
