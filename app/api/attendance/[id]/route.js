import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function DELETE(request, context) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get ID from URL
    const url = request.url;
    const id = url.split('/').pop();

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    console.log('Deleting attendance ID:', id);

    // Check if record exists
    const existing = await prisma.employeeAttendance.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    await prisma.employeeAttendance.delete({
      where: { id: parseInt(id) },
    });

    console.log('Attendance deleted:', id);
    return NextResponse.json({ success: true, message: 'Attendance deleted' });
  } catch (error) {
    console.error('Error deleting attendance:', error);
    return NextResponse.json(
      { error: 'Failed to delete', details: error.message },
      { status: 500 }
    );
  }
}
