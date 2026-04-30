// app/api/routines/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - Fetch routines with all relations
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const classroomId = searchParams.get('classroomId');
    const batchId = searchParams.get('batchId');
    const facultyId = searchParams.get('facultyId');

    const where = {};
    if (classroomId) where.classroomId = parseInt(classroomId);
    if (batchId) where.batchId = parseInt(batchId);
    if (facultyId) where.facultyId = parseInt(facultyId);

    const routines = await prisma.routine.findMany({
      where,
      include: {
        faculty: {
          select: { id: true, name: true, email: true },
        },
        course: {
          select: { id: true, name: true, code: true, semester: true },
        },
        classroom: {
          select: {
            id: true,
            name: true,
            course: { select: { semester: true } },
          },
        },
        batch: {
          select: {
            id: true,
            name: true,
            department: { select: { name: true } },
          },
        },
      },
      orderBy: [{ day: 'asc' }, { timeSlot: 'asc' }],
    });

    return NextResponse.json({ success: true, routines });
  } catch (error) {
    console.error('Error fetching routines:', error);
    return NextResponse.json(
      { error: 'Failed to fetch routines', details: error.message },
      { status: 500 }
    );
  }
}

// POST - Create routine
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      classroomId,
      batchId,
      facultyId,
      courseId,
      roomNumber,
      day,
      timeSlot,
      timeSlotEnd,
      subject,
      status,
      notes,
    } = body;

    // Validate required fields - faculty is NOT required for breaks
    const missingFields = [];
    if (!facultyId && status !== 'break') missingFields.push('faculty');
    if (!batchId) missingFields.push('batch');
    if (day === undefined || day === null) missingFields.push('day');
    if (timeSlot === undefined || timeSlot === null)
      missingFields.push('time slot');

    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Required fields missing: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }

    if (day < 0 || day > 5)
      return NextResponse.json(
        { error: 'Day must be between 0 (Sunday) and 5 (Friday)' },
        { status: 400 }
      );
    if (timeSlot < 0 || timeSlot > 13)
      return NextResponse.json(
        { error: 'Time slot must be between 0 and 13' },
        { status: 400 }
      );

    const routine = await prisma.routine.create({
      data: {
        classroomId: classroomId ? parseInt(classroomId) : null,
        batchId: batchId ? parseInt(batchId) : null,
        facultyId: facultyId ? parseInt(facultyId) : null,
        courseId: courseId ? parseInt(courseId) : null,
        roomNumber: roomNumber || null,
        day: parseInt(day),
        timeSlot: parseInt(timeSlot),
        timeSlotEnd: timeSlotEnd ? parseInt(timeSlotEnd) : null,
        subject: subject || null,
        status: status || 'active',
        notes: notes || null,
      },
      include: {
        faculty: { select: { id: true, name: true, email: true } },
        course: {
          select: { id: true, name: true, code: true, semester: true },
        },
        classroom: {
          select: {
            id: true,
            name: true,
            course: { select: { semester: true } },
          },
        },
        batch: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Routine created successfully',
      routine,
    });
  } catch (error) {
    console.error('Error creating routine:', error);
    if (error.code === 'P2002')
      return NextResponse.json(
        { error: 'A routine already exists for this slot' },
        { status: 409 }
      );
    return NextResponse.json(
      { error: 'Failed to create routine', details: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update routine
export async function PUT(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { id, ...updateData } = body;
    if (!id)
      return NextResponse.json(
        { error: 'Routine ID is required' },
        { status: 400 }
      );

    const data = {};
    if (updateData.classroomId !== undefined)
      data.classroomId = updateData.classroomId
        ? parseInt(updateData.classroomId)
        : null;
    if (updateData.batchId !== undefined)
      data.batchId = updateData.batchId ? parseInt(updateData.batchId) : null;
    if (updateData.facultyId !== undefined)
      data.facultyId = updateData.facultyId
        ? parseInt(updateData.facultyId)
        : null;
    if (updateData.courseId !== undefined)
      data.courseId = updateData.courseId
        ? parseInt(updateData.courseId)
        : null;
    if (updateData.roomNumber !== undefined)
      data.roomNumber = updateData.roomNumber || null;
    if (updateData.day !== undefined) {
      const day = parseInt(updateData.day);
      if (day < 0 || day > 5)
        return NextResponse.json({ error: 'Day must be 0-5' }, { status: 400 });
      data.day = day;
    }
    if (updateData.timeSlot !== undefined) {
      const ts = parseInt(updateData.timeSlot);
      if (ts < 0 || ts > 13)
        return NextResponse.json(
          { error: 'Time slot must be 0-13' },
          { status: 400 }
        );
      data.timeSlot = ts;
    }
    if (updateData.timeSlotEnd !== undefined)
      data.timeSlotEnd = updateData.timeSlotEnd
        ? parseInt(updateData.timeSlotEnd)
        : null;
    if (updateData.subject !== undefined)
      data.subject = updateData.subject || null;
    if (updateData.status !== undefined) data.status = updateData.status;
    if (updateData.notes !== undefined) data.notes = updateData.notes || null;

    const routine = await prisma.routine.update({
      where: { id: parseInt(id) },
      data,
      include: {
        faculty: { select: { id: true, name: true } },
        course: {
          select: { id: true, name: true, code: true, semester: true },
        },
        classroom: {
          select: {
            id: true,
            name: true,
            course: { select: { semester: true } },
          },
        },
        batch: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Routine updated successfully',
      routine,
    });
  } catch (error) {
    console.error('Error updating routine:', error);
    return NextResponse.json(
      { error: 'Failed to update routine', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Remove routine
export async function DELETE(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id)
      return NextResponse.json(
        { error: 'Routine ID is required' },
        { status: 400 }
      );

    const routine = await prisma.routine.findUnique({
      where: { id: parseInt(id) },
    });
    if (!routine)
      return NextResponse.json({ error: 'Routine not found' }, { status: 404 });

    await prisma.routine.delete({ where: { id: parseInt(id) } });
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
