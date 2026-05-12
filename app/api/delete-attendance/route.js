import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function DELETE(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    console.log('DELETE attendance request, ID:', id);

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    // Check if record exists
    const existing = await prisma.employeeAttendance.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existing) {
      console.log('Record not found:', id);
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    // Delete the record
    await prisma.employeeAttendance.delete({
      where: { id: parseInt(id) },
    });

    console.log('Successfully deleted attendance:', id);
    return NextResponse.json({
      success: true,
      message: 'Attendance deleted successfully',
    });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete', details: error.message },
      { status: 500 }
    );
  }
}
