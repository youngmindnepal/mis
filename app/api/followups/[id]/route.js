import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const updateData = {};

    if (body.followUpDate) {
      const parsedDate = new Date(body.followUpDate);
      if (isNaN(parsedDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid followUpDate' },
          { status: 400 }
        );
      }
      updateData.followUpDate = parsedDate;
    }
    if (body.notes !== undefined) updateData.notes = body.notes?.trim() || null;
    if (body.status) updateData.status = body.status;
    if (body.outcome !== undefined) updateData.outcome = body.outcome;

    const followUp = await prisma.followUp.update({
      where: { id: parseInt(params.id) },
      data: updateData,
      include: {
        preadmission: { select: { id: true, studentName: true, phone: true } },
        counselor: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ success: true, followUp });
  } catch (error) {
    console.error('Error updating follow-up:', error);
    return NextResponse.json(
      { error: 'Failed to update follow-up', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await prisma.followUp.delete({ where: { id: parseInt(params.id) } });
    return NextResponse.json({ success: true, message: 'Deleted' });
  } catch (error) {
    console.error('Error deleting follow-up:', error);
    return NextResponse.json(
      { error: 'Failed to delete follow-up', details: error.message },
      { status: 500 }
    );
  }
}
