// app/api/employees/route.js
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request) {
  try {
    console.log('Fetching employees from User table...');

    // Get users who have employee records OR all active users
    const users = await prisma.user.findMany({
      where: {
        status: 'active',
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: {
          select: {
            id: true,
            name: true,
          },
        },
        department: {
          select: {
            id: true,
            name: true,
          },
        },
        employees: {
          select: {
            id: true,
            employeeId: true,
            designation: true,
            department: true,
            faceDescriptor: true,
            faceImage: true,
            status: true,
            joinedDate: true,
            attendances: {
              where: {
                date: {
                  gte: new Date(new Date().setHours(0, 0, 0, 0)),
                  lte: new Date(new Date().setHours(23, 59, 59, 999)),
                },
              },
              select: {
                id: true,
                checkIn: true,
                checkOut: true,
                status: true,
                method: true,
                confidence: true,
              },
              take: 1,
            },
            _count: {
              select: { attendances: true },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Process users into employee format
    const employees = users
      .filter((user) => user.employees && user.employees.length > 0)
      .map((user) => {
        const emp = user.employees[0];
        return {
          id: user.id, // User ID
          employeeRecordId: emp.id, // Employee record ID
          name: user.name,
          email: user.email,
          phone: user.phone,
          department: user.department?.name || emp.department,
          designation: emp.designation,
          employeeId: emp.employeeId,
          faceDescriptor: emp.faceDescriptor,
          faceImage: emp.faceImage,
          status: emp.status,
          joinedDate: emp.joinedDate,
          role: user.role,
          todayAttendance: emp.attendances?.[0] || null,
          totalAttendances: emp._count?.attendances || 0,
        };
      });

    console.log(`Found ${employees.length} employees from User table`);
    return NextResponse.json({ employees });
  } catch (error) {
    console.error('GET /api/employees error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch employees', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    console.log('Registering employee from User:', data);

    const {
      userId, // User ID from User table
      name,
      email,
      phone,
      department,
      designation,
      employeeId,
      faceDescriptor,
      faceImage,
    } = data;

    // If userId provided, link to existing user
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: parseInt(userId) },
        include: { department: true },
      });

      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      // Check if user already has employee record
      const existingEmployee = await prisma.employee.findFirst({
        where: { userId: user.id },
      });

      if (existingEmployee) {
        return NextResponse.json(
          { error: 'User already has an employee record' },
          { status: 409 }
        );
      }

      // Create employee record linked to user
      const employee = await prisma.employee.create({
        data: {
          userId: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          employeeId: employeeId || `EMP${user.id}`,
          department: department || user.department?.name || null,
          designation: designation || null,
          faceDescriptor: faceDescriptor || null,
          faceImage: faceImage || null,
          status: 'active',
          joinedDate: new Date(),
        },
      });

      console.log('Employee created from user:', user.name, 'ID:', employee.id);
      return NextResponse.json(
        {
          success: true,
          message: 'Employee registered from user',
          employee: {
            id: user.id,
            employeeRecordId: employee.id,
            name: user.name,
            employeeId: employee.employeeId,
            faceDescriptor: employee.faceDescriptor,
          },
        },
        { status: 201 }
      );
    }

    // Create new employee without user link
    if (!name || !employeeId) {
      return NextResponse.json(
        { error: 'Name and Employee ID are required' },
        { status: 400 }
      );
    }

    // Check duplicate employeeId
    const exists = await prisma.employee.findUnique({
      where: { employeeId },
    });

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

    console.log('New employee created:', employee.name, 'ID:', employee.id);
    return NextResponse.json(
      {
        success: true,
        message: 'Employee registered successfully',
        employee: {
          id: employee.id,
          employeeRecordId: employee.id,
          name: employee.name,
          employeeId: employee.employeeId,
          faceDescriptor: employee.faceDescriptor,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/employees error:', error);
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Employee ID or email already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create employee', details: error.message },
      { status: 500 }
    );
  }
}
