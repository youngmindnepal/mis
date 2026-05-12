import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// PUT - Update agent
export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();

    const updateData = {};
    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.phone !== undefined) updateData.phone = body.phone?.trim() || null;
    if (body.email !== undefined) updateData.email = body.email?.trim() || null;
    if (body.address !== undefined)
      updateData.address = body.address?.trim() || null;
    if (body.company !== undefined)
      updateData.company = body.company?.trim() || null;
    if (body.commission !== undefined)
      updateData.commission = body.commission
        ? parseFloat(body.commission)
        : null;
    if (body.notes !== undefined) updateData.notes = body.notes?.trim() || null;
    if (body.status !== undefined) updateData.status = body.status;

    const agent = await prisma.agent.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      message: 'Agent updated successfully',
      agent,
    });
  } catch (error) {
    console.error('Error updating agent:', error);
    return NextResponse.json(
      { error: 'Failed to update agent', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Remove agent
export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    // Check if agent has preadmissions
    const agent = await prisma.agent.findUnique({
      where: { id: parseInt(id) },
      include: { _count: { select: { preadmissions: true } } },
    });

    if (agent?._count.preadmissions > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete agent with ${agent._count.preadmissions} preadmission(s). Remove associations first.`,
        },
        { status: 400 }
      );
    }

    await prisma.agent.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({
      success: true,
      message: 'Agent deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting agent:', error);
    return NextResponse.json(
      { error: 'Failed to delete agent', details: error.message },
      { status: 500 }
    );
  }
}
