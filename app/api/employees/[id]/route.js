import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(request, context) {
  try {
    const session = await getServerSession(authOptions);
    if (!session)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Get ID from URL - compatible with Next.js 14+
    const id = context.params?.id || request.url.split('/').pop();

    const body = await request.json();
    console.log('Updating employee', id, 'with:', body);

    const updateData = {};

    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.email !== undefined) updateData.email = body.email?.trim() || null;
    if (body.phone !== undefined) updateData.phone = body.phone?.trim() || null;
    if (body.department !== undefined)
      updateData.department = body.department?.trim() || null;
    if (body.designation !== undefined)
      updateData.designation = body.designation?.trim() || null;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.faceDescriptor !== undefined)
      updateData.faceDescriptor = body.faceDescriptor;
    if (body.faceImage !== undefined) updateData.faceImage = body.faceImage;

    // Ensure employee exists
    const existing = await prisma.employee.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    const employee = await prisma.employee.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    console.log('Employee updated:', employee.id);
    return NextResponse.json({ success: true, message: 'Updated', employee });
  } catch (error) {
    console.error('Error updating employee:', error);
    return NextResponse.json(
      { error: 'Failed to update', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request, context) {
  try {
    const session = await getServerSession(authOptions);
    if (!session)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const id = context.params?.id || request.url.split('/').pop();

    await prisma.employee.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ success: true, message: 'Deleted' });
  } catch (error) {
    console.error('Error deleting:', error);
    return NextResponse.json(
      { error: 'Failed to delete', details: error.message },
      { status: 500 }
    );
  }
}
