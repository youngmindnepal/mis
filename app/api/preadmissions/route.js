// app/api/preadmissions/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const departmentId = searchParams.get('departmentId');
    const referralSource = searchParams.get('referralSource');
    const agentId = searchParams.get('agentId');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const where = {};

    if (status) where.status = status;
    if (referralSource) where.referralSource = referralSource;
    if (agentId) where.agentId = parseInt(agentId);
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom);
      if (dateTo) where.date.lte = new Date(dateTo + 'T23:59:59.999');
    }
    if (search) {
      where.OR = [
        { studentName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
        { previousCollege: { contains: search, mode: 'insensitive' } },
        { referralName: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (departmentId) {
      where.departments = { some: { departmentId: parseInt(departmentId) } };
    }

    const [preadmissions, total] = await Promise.all([
      prisma.preadmission.findMany({
        where,
        include: {
          departments: { include: { department: true } },
          counselor: { select: { id: true, name: true, email: true } },
          agent: {
            select: { id: true, name: true, company: true, phone: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.preadmission.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      preadmissions,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Error fetching preadmissions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch preadmissions', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      studentName,
      phone,
      address,
      email,
      date,
      referralSource,
      referralName,
      previousCollege,
      gpa,
      notes,
      departmentIds,
      agentId,
    } = body;

    if (!studentName?.trim())
      return NextResponse.json(
        { error: 'Student name is required' },
        { status: 400 }
      );
    if (!phone?.trim())
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    if (!departmentIds?.length)
      return NextResponse.json(
        { error: 'At least one department is required' },
        { status: 400 }
      );

    const preadmission = await prisma.preadmission.create({
      data: {
        studentName: studentName.trim(),
        phone: phone.trim(),
        address: address?.trim() || null,
        email: email?.trim() || null,
        date: date ? new Date(date) : new Date(),
        referralSource: referralSource || null,
        referralName:
          referralSource === 'referred_by' ? referralName?.trim() : null,
        previousCollege: previousCollege?.trim() || null,
        gpa: gpa ? parseFloat(gpa) : null,
        notes: notes?.trim() || null,
        status: 'pending',
        counselorId: session.user?.id ? parseInt(session.user.id) : null,
        agentId:
          referralSource === 'agent' && agentId ? parseInt(agentId) : null,
        departments: {
          create: departmentIds.map((id) => ({ departmentId: parseInt(id) })),
        },
      },
      include: {
        departments: { include: { department: true } },
        counselor: { select: { id: true, name: true, email: true } },
        agent: { select: { id: true, name: true, company: true, phone: true } },
      },
    });

    return NextResponse.json(
      { success: true, message: 'Created successfully', preadmission },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating preadmission:', error);
    return NextResponse.json(
      { error: 'Failed to create', details: error.message },
      { status: 500 }
    );
  }
}
