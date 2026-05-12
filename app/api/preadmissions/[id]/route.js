// app/api/preadmissions/[id]/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = params;
    const body = await request.json();

    if (body.departmentIds) {
      await prisma.preadmissionDepartment.deleteMany({
        where: { preadmissionId: parseInt(id) },
      });
    }

    const updateData = {};
    if (body.studentName !== undefined)
      updateData.studentName = body.studentName.trim();
    if (body.phone !== undefined) updateData.phone = body.phone.trim();
    if (body.address !== undefined)
      updateData.address = body.address?.trim() || null;
    if (body.email !== undefined) updateData.email = body.email?.trim() || null;
    if (body.date) updateData.date = new Date(body.date);
    if (body.referralSource !== undefined)
      updateData.referralSource = body.referralSource || null;
    if (body.referralName !== undefined)
      updateData.referralName = body.referralName?.trim() || null;
    if (body.previousCollege !== undefined)
      updateData.previousCollege = body.previousCollege?.trim() || null;
    if (body.gpa !== undefined)
      updateData.gpa = body.gpa ? parseFloat(body.gpa) : null;
    if (body.notes !== undefined) updateData.notes = body.notes?.trim() || null;
    if (body.status) updateData.status = body.status;
    if (body.agentId !== undefined) {
      updateData.agentId = body.agentId ? parseInt(body.agentId) : null;
    }

    if (body.departmentIds) {
      updateData.departments = {
        create: body.departmentIds.map((did) => ({
          departmentId: parseInt(did),
        })),
      };
    }

    const preadmission = await prisma.preadmission.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        departments: { include: { department: true } },
        counselor: { select: { id: true, name: true, email: true } },
        agent: { select: { id: true, name: true, company: true, phone: true } },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Updated',
      preadmission,
    });
  } catch (error) {
    console.error('Error updating:', error);
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

    await prisma.preadmission.delete({ where: { id: parseInt(params.id) } });
    return NextResponse.json({ success: true, message: 'Deleted' });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete', details: error.message },
      { status: 500 }
    );
  }
}
