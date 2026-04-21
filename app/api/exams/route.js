// app/api/exams/route.js
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const departmentId = searchParams.get('departmentId');
    const batchId = searchParams.get('batchId');

    const where = {};
    if (status) where.status = { in: status.split(',') };
    if (departmentId) where.departmentId = parseInt(departmentId);
    if (batchId) where.batchId = parseInt(batchId);

    const exams = await prisma.exam.findMany({
      where,
      include: {
        examType: true,
        department: { select: { id: true, name: true, code: true } },
        batch: { select: { id: true, name: true, academicYear: true } },
        classroom: { select: { id: true, name: true, capacity: true } },
        _count: { select: { results: true } },
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json(exams);
  } catch (error) {
    console.error('Error fetching exams:', error);
    return NextResponse.json(
      { error: 'Failed to fetch exams' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    console.log('Creating exam with data:', JSON.stringify(data, null, 2));

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

    // Validate required fields
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { error: 'Exam name is required' },
        { status: 400 }
      );
    }

    if (!examTypeId) {
      return NextResponse.json(
        { error: 'Exam type is required' },
        { status: 400 }
      );
    }

    // Parse examTypeId
    const parsedExamTypeId = parseInt(examTypeId);
    if (isNaN(parsedExamTypeId)) {
      return NextResponse.json(
        { error: 'Invalid exam type ID' },
        { status: 400 }
      );
    }

    // Verify exam type exists
    const examType = await prisma.examType.findUnique({
      where: { id: parsedExamTypeId },
    });

    if (!examType) {
      return NextResponse.json(
        { error: `Exam type with ID ${parsedExamTypeId} not found` },
        { status: 400 }
      );
    }

    // Parse date and time
    let parsedDate = null;
    let parsedStartTime = null;
    let parsedEndTime = null;

    if (date) {
      parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid date format' },
          { status: 400 }
        );
      }
      // Reset time to midnight for date-only comparison
      parsedDate.setUTCHours(0, 0, 0, 0);
    }

    // Handle time fields - they come as "HH:MM" strings
    if (startTime && date) {
      const [hours, minutes] = startTime.split(':').map(Number);
      if (!isNaN(hours) && !isNaN(minutes)) {
        parsedStartTime = new Date(date);
        parsedStartTime.setUTCHours(hours, minutes, 0, 0);
      }
    }

    if (endTime && date) {
      const [hours, minutes] = endTime.split(':').map(Number);
      if (!isNaN(hours) && !isNaN(minutes)) {
        parsedEndTime = new Date(date);
        parsedEndTime.setUTCHours(hours, minutes, 0, 0);
      }
    }

    // Build create data object
    const createData = {
      name: name.trim(),
      examTypeId: parsedExamTypeId,
      status: 'scheduled',
    };

    // Add optional fields only if they have values
    if (academicYear) createData.academicYear = academicYear;
    if (semester) createData.semester = semester;
    if (parsedDate) createData.date = parsedDate;
    if (parsedStartTime) createData.startTime = parsedStartTime;
    if (parsedEndTime) createData.endTime = parsedEndTime;
    if (description) createData.description = description;

    // Handle department
    if (departmentId) {
      const parsedDeptId = parseInt(departmentId);
      if (!isNaN(parsedDeptId)) {
        // Verify department exists
        const department = await prisma.department.findUnique({
          where: { id: parsedDeptId },
        });
        if (department) {
          createData.departmentId = parsedDeptId;
        } else {
          console.warn(`Department ${parsedDeptId} not found`);
        }
      }
    }

    // Handle batch
    if (batchId) {
      const parsedBatchId = parseInt(batchId);
      if (!isNaN(parsedBatchId)) {
        // Verify batch exists
        const batch = await prisma.batch.findUnique({
          where: { id: parsedBatchId },
        });
        if (batch) {
          createData.batchId = parsedBatchId;
          // If no department set but batch has department, use it
          if (!createData.departmentId && batch.departmentId) {
            createData.departmentId = batch.departmentId;
          }
        } else {
          console.warn(`Batch ${parsedBatchId} not found`);
        }
      }
    }

    // Handle classroom
    if (classroomId) {
      const parsedClassroomId = parseInt(classroomId);
      if (!isNaN(parsedClassroomId)) {
        // Verify classroom exists
        const classroom = await prisma.classroom.findUnique({
          where: { id: parsedClassroomId },
        });
        if (classroom) {
          createData.classroomId = parsedClassroomId;
        } else {
          console.warn(`Classroom ${parsedClassroomId} not found`);
        }
      }
    }

    console.log('Final create data:', JSON.stringify(createData, null, 2));

    // Create exam
    const exam = await prisma.exam.create({
      data: createData,
      include: {
        examType: true,
        department: true,
        batch: true,
        classroom: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Exam scheduled successfully',
        exam,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating exam - full details:', error);

    // Check for Prisma-specific errors
    let errorMessage = 'Failed to create exam';
    let statusCode = 500;

    if (error.code === 'P2002') {
      errorMessage = 'An exam with this name already exists';
      statusCode = 409;
    } else if (error.code === 'P2003') {
      errorMessage =
        'Invalid reference: ' + (error.meta?.field_name || 'unknown field');
      statusCode = 400;
    } else if (error.message) {
      errorMessage = error.message;
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details:
          process.env.NODE_ENV === 'development' ? error.message : undefined,
        code: error.code,
      },
      { status: statusCode }
    );
  }
}
