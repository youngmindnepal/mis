// app/api/attendance/[id]/route.js
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function DELETE(request) {
  try {
    // Extract ID directly from the URL - most reliable method
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/');
    const id = parseInt(pathSegments[pathSegments.length - 1]);

    console.log('DELETE attendance - URL:', request.url, 'ID:', id);

    if (!id || isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid attendance ID' },
        { status: 400 }
      );
    }

    // Check if record exists
    const existing = await prisma.employeeAttendance.findUnique({
      where: { id: id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Attendance record not found' },
        { status: 404 }
      );
    }

    // Delete the record
    await prisma.employeeAttendance.delete({
      where: { id: id },
    });

    console.log('Attendance deleted successfully:', id);
    return NextResponse.json({
      success: true,
      message: 'Attendance deleted successfully',
    });
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete attendance', details: error.message },
      { status: 500 }
    );
  }
}
