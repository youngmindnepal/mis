// app/api/employees/[id]/route.js
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Helper function to extract ID from URL
function extractIdFromUrl(url) {
  try {
    const segments = url.split('/');
    // Filter out empty segments and find the last numeric segment
    const numericSegments = segments.filter((s) => s && /^\d+$/.test(s));
    return parseInt(numericSegments[numericSegments.length - 1]);
  } catch {
    return NaN;
  }
}

export async function GET(request, { params }) {
  try {
    // Try to get ID from params first (Next.js 14)
    let employeeId;

    try {
      if (params && params.id) {
        employeeId = parseInt(params.id);
      }
    } catch {
      // params might be async in Next.js 15
    }

    if (!employeeId || isNaN(employeeId)) {
      // Extract from URL as fallback
      employeeId = extractIdFromUrl(request.url);
    }

    if (isNaN(employeeId)) {
      return NextResponse.json(
        { error: 'Invalid employee ID' },
        { status: 400 }
      );
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ employee });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch employee', details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    // Try multiple ways to get the ID
    let employeeId;

    // Try from params
    try {
      if (params && params.id) {
        employeeId = parseInt(params.id);
      }
    } catch {
      // params might be async
    }

    // Try from URL if params didn't work
    if (!employeeId || isNaN(employeeId)) {
      employeeId = extractIdFromUrl(request.url);
    }

    console.log('PUT request - Employee ID:', employeeId);

    if (isNaN(employeeId)) {
      return NextResponse.json(
        { error: 'Invalid employee ID' },
        { status: 400 }
      );
    }

    // Check if employee exists
    const existing = await prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!existing) {
      console.log('Employee not found:', employeeId);
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    const data = await request.json();
    console.log('Update data received:', Object.keys(data));

    // Build update data object
    const updateData = {};

    if (data.faceDescriptor !== undefined && data.faceDescriptor !== null) {
      updateData.faceDescriptor = data.faceDescriptor;
    }

    if (data.faceImage !== undefined && data.faceImage !== null) {
      updateData.faceImage = data.faceImage;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid data to update' },
        { status: 400 }
      );
    }

    // Update employee
    const employee = await prisma.employee.update({
      where: { id: employeeId },
      data: updateData,
    });

    console.log('Employee updated successfully:', employee.id);

    return NextResponse.json({
      success: true,
      message: 'Face data updated successfully',
      employee: {
        id: employee.id,
        name: employee.name,
        employeeId: employee.employeeId,
      },
    });
  } catch (error) {
    console.error('PUT error:', error);

    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update employee', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    let employeeId;

    try {
      if (params && params.id) {
        employeeId = parseInt(params.id);
      }
    } catch {}

    if (!employeeId || isNaN(employeeId)) {
      employeeId = extractIdFromUrl(request.url);
    }

    if (isNaN(employeeId)) {
      return NextResponse.json(
        { error: 'Invalid employee ID' },
        { status: 400 }
      );
    }

    // Soft delete - set status to inactive
    await prisma.employee.update({
      where: { id: employeeId },
      data: { status: 'inactive' },
    });

    return NextResponse.json({
      success: true,
      message: 'Employee deactivated',
    });
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete employee', details: error.message },
      { status: 500 }
    );
  }
}
