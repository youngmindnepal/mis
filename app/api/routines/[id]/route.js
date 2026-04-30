// app/api/routines/[id]/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// DELETE - Remove routine
export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    const routine = await prisma.routine.findUnique({
      where: { id: parseInt(id) },
    });

    if (!routine) {
      return NextResponse.json({ error: 'Routine not found' }, { status: 404 });
    }

    await prisma.routine.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({
      success: true,
      message: 'Routine deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting routine:', error);
    return NextResponse.json(
      { error: 'Failed to delete routine', details: error.message },
      { status: 500 }
    );
  }
}
