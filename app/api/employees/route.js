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
    const search = searchParams.get('search');
    const status = searchParams.get('status');

    const where = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { employeeId: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const employees = await prisma.employee.findMany({
      where,
      include: {
        attendances: {
          where: {
            date: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
              lte: new Date(new Date().setHours(23, 59, 59, 999)),
            },
          },
          take: 1,
        },
        _count: { select: { attendances: true } },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ success: true, employees });
  } catch (error) {
    console.error('Error fetching employees:', error);
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
    console.log('Creating employee:', body);

    const {
      name,
      email,
      phone,
      department,
      designation,
      employeeId,
      faceDescriptor,
      faceImage,
    } = body;

    if (!name || !employeeId) {
      return NextResponse.json(
        { error: 'Name and ID required' },
        { status: 400 }
      );
    }

    // Check for duplicate
    const exists = await prisma.employee.findUnique({ where: { employeeId } });
    if (exists) {
      return NextResponse.json(
        { error: 'Employee ID already exists' },
        { status: 409 }
      );
    }

    const employee = await prisma.employee.create({
      data: {
        name: name.trim(),
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        department: department?.trim() || null,
        designation: designation?.trim() || null,
        employeeId: employeeId.trim(),
        faceDescriptor: faceDescriptor || null,
        faceImage: faceImage || null,
        status: 'active',
        joinedDate: new Date(),
      },
    });

    console.log('Employee created:', employee.id);
    return NextResponse.json(
      { success: true, message: 'Registered', employee },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating employee:', error);
    return NextResponse.json(
      { error: 'Failed to create', details: error.message },
      { status: 500 }
    );
  }
}
