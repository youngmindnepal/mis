// app/api/followups/[id]/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - Fetch a single follow-up
export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const followUpId = parseInt(id);

    if (isNaN(followUpId)) {
      return NextResponse.json(
        { error: 'Invalid follow-up ID' },
        { status: 400 }
      );
    }

    const followUp = await prisma.followUp.findUnique({
      where: { id: followUpId },
      include: {
        preadmission: { select: { id: true, studentName: true, phone: true } },
        counselor: { select: { id: true, name: true } },
      },
    });

    if (!followUp) {
      return NextResponse.json(
        { error: 'Follow-up not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ followUp });
  } catch (error) {
    console.error('Error fetching follow-up:', error);
    return NextResponse.json(
      { error: 'Failed to fetch follow-up', details: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update a follow-up
export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const followUpId = parseInt(id);

    if (isNaN(followUpId)) {
      return NextResponse.json(
        { error: 'Invalid follow-up ID' },
        { status: 400 }
      );
    }

    // Check if follow-up exists
    const existing = await prisma.followUp.findUnique({
      where: { id: followUpId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Follow-up not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const updateData = {};

    // Handle followUpDate
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

    // Handle notes
    if (body.notes !== undefined) {
      updateData.notes = body.notes?.trim() || null;
    }

    // Handle status
    if (body.status) {
      const validStatuses = ['pending', 'completed', 'cancelled'];
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json(
          {
            error: 'Invalid status. Must be: pending, completed, or cancelled',
          },
          { status: 400 }
        );
      }
      updateData.status = body.status;
    }

    // Handle outcome
    if (body.outcome !== undefined) {
      const validOutcomes = [
        'interested',
        'not_interested',
        'will_think',
        'enrolled',
        'no_answer',
        '',
      ];
      if (body.outcome && !validOutcomes.includes(body.outcome)) {
        return NextResponse.json({ error: 'Invalid outcome' }, { status: 400 });
      }
      updateData.outcome = body.outcome || null;
    }

    const followUp = await prisma.followUp.update({
      where: { id: followUpId },
      data: updateData,
      include: {
        preadmission: { select: { id: true, studentName: true, phone: true } },
        counselor: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ success: true, followUp });
  } catch (error) {
    console.error('Error updating follow-up:', error);

    // Handle Prisma errors
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Follow-up not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update follow-up', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Delete a follow-up
export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const followUpId = parseInt(id);

    console.log('Deleting follow-up ID:', followUpId); // Debug log

    if (isNaN(followUpId)) {
      return NextResponse.json(
        { error: 'Invalid follow-up ID' },
        { status: 400 }
      );
    }

    // Check if follow-up exists before deleting
    const existing = await prisma.followUp.findUnique({
      where: { id: followUpId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Follow-up not found' },
        { status: 404 }
      );
    }

    // Delete the follow-up
    await prisma.followUp.delete({
      where: { id: followUpId },
    });

    console.log('Follow-up deleted successfully:', followUpId); // Debug log

    return NextResponse.json({
      success: true,
      message: 'Follow-up deleted successfully',
      deletedId: followUpId,
    });
  } catch (error) {
    console.error('Error deleting follow-up:', error);

    // Handle Prisma errors
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Follow-up not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to delete follow-up', details: error.message },
      { status: 500 }
    );
  }
}
