// app/api/exams/[id]/route.js
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Fetch single exam
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const examId = parseInt(id);

    if (isNaN(examId)) {
      return NextResponse.json({ error: 'Invalid exam ID' }, { status: 400 });
    }

    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: {
        examType: true,
        department: true,
        batch: true,
        classroom: true,
      },
    });

    if (!exam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
    }

    return NextResponse.json(exam);
  } catch (error) {
    console.error('Error fetching exam:', error);
    return NextResponse.json(
      { error: 'Failed to fetch exam' },
      { status: 500 }
    );
  }
}

// PUT - Update exam
export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const examId = parseInt(id);

    console.log('Updating exam with ID:', examId);

    if (isNaN(examId)) {
      return NextResponse.json({ error: 'Invalid exam ID' }, { status: 400 });
    }

    const data = await request.json();
    console.log('Update data received:', data);

    const {
      name,
      examTypeId,
      academicYear,
      semester,
      date,
      startTime,
      endTime,
      departmentId,
      batchId,
      classroomId,
      description,
    } = data;

    // Check if exam exists
    const existingExam = await prisma.exam.findUnique({
      where: { id: examId },
    });

    if (!existingExam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
    }

    // Build update data object - ONLY include fields that exist in schema
    const updateData = {};

    if (name !== undefined) updateData.name = name.trim();

    // Handle examTypeId correctly
    if (examTypeId !== undefined && examTypeId !== null) {
      updateData.examTypeId = parseInt(examTypeId);
    }

    if (academicYear !== undefined)
      updateData.academicYear = academicYear || null;
    if (semester !== undefined) updateData.semester = semester || null;

    if (date !== undefined) {
      updateData.date = date ? new Date(date) : null;
    }

    if (departmentId !== undefined) {
      updateData.departmentId = departmentId ? parseInt(departmentId) : null;
    }
    if (batchId !== undefined) {
      updateData.batchId = batchId ? parseInt(batchId) : null;
    }
    if (classroomId !== undefined) {
      updateData.classroomId = classroomId ? parseInt(classroomId) : null;
    }

    // Handle time fields
    if (startTime !== undefined && date) {
      const [hours, minutes] = startTime.split(':');
      const startDateTime = new Date(date);
      startDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      updateData.startTime = startDateTime;
    }

    if (endTime !== undefined && date) {
      const [hours, minutes] = endTime.split(':');
      const endDateTime = new Date(date);
      endDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      updateData.endTime = endDateTime;
    }

    console.log('Update data to apply:', JSON.stringify(updateData, null, 2));

    // Update exam
    const exam = await prisma.exam.update({
      where: { id: examId },
      data: updateData,
      include: {
        examType: true,
        department: true,
        batch: true,
        classroom: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Exam updated successfully',
      exam,
    });
  } catch (error) {
    console.error('Error updating exam - full details:', error);

    let errorMessage = 'Failed to update exam';
    let statusCode = 500;

    if (error.code === 'P2025') {
      errorMessage = 'Exam not found';
      statusCode = 404;
    } else if (error.code === 'P2002') {
      errorMessage = 'An exam with this name already exists';
      statusCode = 409;
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details:
          process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: statusCode }
    );
  }
}

// DELETE - Delete exam
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const examId = parseInt(id);

    if (isNaN(examId)) {
      return NextResponse.json({ error: 'Invalid exam ID' }, { status: 400 });
    }

    const exam = await prisma.exam.findUnique({
      where: { id: examId },
    });

    if (!exam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
    }

    await prisma.exam.delete({
      where: { id: examId },
    });

    return NextResponse.json({
      success: true,
      message: 'Exam deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting exam:', error);
    return NextResponse.json(
      { error: 'Failed to delete exam' },
      { status: 500 }
    );
  }
}
