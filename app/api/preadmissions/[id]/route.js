// app/api/preadmissions/[id]/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const preadmissionId = parseInt(id);

    if (isNaN(preadmissionId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const preadmission = await prisma.preadmission.findUnique({
      where: { id: preadmissionId },
      include: {
        departments: { include: { department: true } },
        agent: true,
        counselor: { select: { id: true, name: true } },
        followUps: {
          include: { counselor: { select: { id: true, name: true } } },
          orderBy: { followUpDate: 'desc' },
        },
      },
    });

    if (!preadmission) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ preadmission });
  } catch (error) {
    console.error('Error fetching preadmission:', error);
    return NextResponse.json(
      { error: 'Failed to fetch', details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const preadmissionId = parseInt(id);

    if (isNaN(preadmissionId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const body = await request.json();

    // ✅ Allow status-only updates (from follow-up modal)
    const updateData = {};

    if (body.status !== undefined) {
      const validStatuses = [
        'pending',
        'contacted',
        'follow_up',
        'enrolled',
        'rejected',
      ];
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      updateData.status = body.status;
    }

    if (body.studentName !== undefined)
      updateData.studentName = body.studentName?.trim();
    if (body.phone !== undefined) updateData.phone = body.phone?.trim();
    if (body.address !== undefined)
      updateData.address = body.address?.trim() || null;
    if (body.email !== undefined) updateData.email = body.email?.trim() || null;
    if (body.date !== undefined) updateData.date = new Date(body.date);
    if (body.referralSource !== undefined)
      updateData.referralSource = body.referralSource || null;
    if (body.referralName !== undefined)
      updateData.referralName = body.referralName?.trim() || null;
    if (body.previousCollege !== undefined)
      updateData.previousCollege = body.previousCollege?.trim() || null;
    if (body.gpa !== undefined)
      updateData.gpa = body.gpa ? parseFloat(body.gpa) : null;
    if (body.notes !== undefined) updateData.notes = body.notes?.trim() || null;
    if (body.agentId !== undefined)
      updateData.agentId = body.agentId ? parseInt(body.agentId) : null;

    // Handle department relations
    if (body.departmentIds !== undefined) {
      // Delete existing department relations
      await prisma.preadmissionDepartment.deleteMany({
        where: { preadmissionId },
      });

      // Create new ones
      if (body.departmentIds.length > 0) {
        await prisma.preadmissionDepartment.createMany({
          data: body.departmentIds.map((deptId) => ({
            preadmissionId,
            departmentId: parseInt(deptId),
          })),
        });
      }
    }

    // Update counselor if not set
    if (!updateData.counselorId) {
      updateData.counselorId = parseInt(session.user.id);
    }

    const preadmission = await prisma.preadmission.update({
      where: { id: preadmissionId },
      data: updateData,
      include: {
        departments: { include: { department: true } },
        agent: true,
        counselor: { select: { id: true, name: true } },
        followUps: {
          include: { counselor: { select: { id: true, name: true } } },
          orderBy: { followUpDate: 'desc' },
        },
      },
    });

    return NextResponse.json({ success: true, preadmission });
  } catch (error) {
    console.error('Error updating preadmission:', error);
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }
    return NextResponse.json(
      { error: 'Failed to update', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const preadmissionId = parseInt(id);

    if (isNaN(preadmissionId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    console.log('Deleting preadmission:', preadmissionId);

    // Check if exists
    const existing = await prisma.preadmission.findUnique({
      where: { id: preadmissionId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    // ✅ Delete related records first (cascade might handle this, but explicit is safer)
    // Delete follow-ups
    await prisma.followUp.deleteMany({
      where: { preadmissionId },
    });

    // Delete department relations
    await prisma.preadmissionDepartment.deleteMany({
      where: { preadmissionId },
    });

    // Delete the preadmission
    await prisma.preadmission.delete({
      where: { id: preadmissionId },
    });

    console.log('Preadmission deleted successfully:', preadmissionId);

    return NextResponse.json({
      success: true,
      message: 'Deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting preadmission:', error);
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }
    return NextResponse.json(
      { error: 'Failed to delete', details: error.message },
      { status: 500 }
    );
  }
}
