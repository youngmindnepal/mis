// app/api/preadmissions/route.js
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
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const departmentId = searchParams.get('departmentId') || '';
    const agentId = searchParams.get('agentId') || '';
    const referralSource = searchParams.get('referralSource') || '';
    const dateFrom = searchParams.get('dateFrom') || '';
    const dateTo = searchParams.get('dateTo') || '';

    const where = {};

    if (search) {
      where.OR = [
        { studentName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) where.status = status;
    if (referralSource) where.referralSource = referralSource;
    if (agentId) where.agentId = parseInt(agentId);

    if (departmentId) {
      where.departments = {
        some: { departmentId: parseInt(departmentId) },
      };
    }

    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom);
      if (dateTo) where.date.lte = new Date(dateTo + 'T23:59:59.999');
    }

    const [preadmissions, total] = await Promise.all([
      prisma.preadmission.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          departments: { include: { department: true } },
          agent: { select: { id: true, name: true, company: true } },
          counselor: { select: { id: true, name: true } },
          _count: { select: { followUps: true } },
        },
      }),
      prisma.preadmission.count({ where }),
    ]);

    return NextResponse.json({
      preadmissions,
      pagination: {
        total,
        totalPages: Math.ceil(total / limit),
        page,
        limit,
      },
    });
  } catch (error) {
    console.error('Error fetching preadmissions:', error);
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

    // Validate required fields
    if (!body.studentName?.trim()) {
      return NextResponse.json(
        { error: 'Student name is required' },
        { status: 400 }
      );
    }
    if (!body.phone?.trim()) {
      return NextResponse.json({ error: 'Phone is required' }, { status: 400 });
    }

    const departmentIds = body.departmentIds || [];
    if (departmentIds.length === 0) {
      return NextResponse.json(
        { error: 'At least one department is required' },
        { status: 400 }
      );
    }

    const preadmission = await prisma.preadmission.create({
      data: {
        studentName: body.studentName.trim(),
        phone: body.phone.trim(),
        address: body.address?.trim() || null,
        email: body.email?.trim() || null,
        date: body.date ? new Date(body.date) : new Date(),
        referralSource: body.referralSource || null,
        referralName: body.referralName?.trim() || null,
        previousCollege: body.previousCollege?.trim() || null,
        gpa: body.gpa ? parseFloat(body.gpa) : null,
        notes: body.notes?.trim() || null,
        status: 'pending',
        counselorId: parseInt(session.user.id),
        agentId: body.agentId ? parseInt(body.agentId) : null,
        departments: {
          create: departmentIds.map((deptId) => ({
            departmentId: parseInt(deptId),
          })),
        },
      },
      include: {
        departments: { include: { department: true } },
        agent: true,
        counselor: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ success: true, preadmission }, { status: 201 });
  } catch (error) {
    console.error('Error creating preadmission:', error);
    return NextResponse.json(
      { error: 'Failed to create', details: error.message },
      { status: 500 }
    );
  }
}
