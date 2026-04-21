// app/api/exams/bulk/route.js
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request) {
  try {
    const data = await request.json();
    const { exams } = data;

    if (!exams || !Array.isArray(exams) || exams.length === 0) {
      return NextResponse.json({ error: 'No exams provided' }, { status: 400 });
    }

    // Validate each exam
    for (const exam of exams) {
      if (!exam.name?.trim()) {
        return NextResponse.json(
          { error: 'All exams must have a name' },
          { status: 400 }
        );
      }
      if (!exam.examTypeId) {
        return NextResponse.json(
          { error: 'All exams must have an exam type' },
          { status: 400 }
        );
      }
    }

    console.log(
      'Creating bulk exams with data:',
      JSON.stringify(exams, null, 2)
    );

    // Create all exams in a transaction
    const createdExams = await prisma.$transaction(
      exams.map((exam) => {
        // Build create data with all fields from schema
        const createData = {
          name: exam.name.trim(),
          examTypeId: parseInt(exam.examTypeId),
          status: 'scheduled',
        };

        // Add optional fields - EXACTLY as they appear in schema
        if (exam.academicYear) createData.academicYear = exam.academicYear;

        // Handle semester - convert string to enum if needed
        if (exam.semester) {
          // Map semester values to enum format
          const semesterMap = {
            semester1: 'semester1',
            semester2: 'semester2',
            semester3: 'semester3',
            semester4: 'semester4',
            semester5: 'semester5',
            semester6: 'semester6',
            semester7: 'semester7',
            semester8: 'semester8',
          };
          createData.semester = semesterMap[exam.semester] || exam.semester;
        }

        if (exam.date) createData.date = new Date(exam.date);
        if (exam.batchId) createData.batchId = parseInt(exam.batchId);
        if (exam.classroomId)
          createData.classroomId = parseInt(exam.classroomId);

        // CRITICAL: Add departmentId if provided
        if (exam.departmentId) {
          createData.departmentId = parseInt(exam.departmentId);
        }

        // Handle time fields - combine date and time
        if (exam.startTime && exam.date) {
          const [hours, minutes] = exam.startTime.split(':');
          const startDateTime = new Date(exam.date);
          startDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
          createData.startTime = startDateTime;
        }

        if (exam.endTime && exam.date) {
          const [hours, minutes] = exam.endTime.split(':');
          const endDateTime = new Date(exam.date);
          endDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
          createData.endTime = endDateTime;
        }

        console.log('Creating exam with data:', createData);

        return prisma.exam.create({
          data: createData,
          include: {
            examType: true,
            batch: true,
            classroom: true,
            department: true,
          },
        });
      })
    );

    return NextResponse.json(
      {
        success: true,
        message: `${createdExams.length} exams scheduled successfully`,
        exams: createdExams,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating bulk exams:', error);

    let errorMessage = 'Failed to schedule exams';

    if (error.code === 'P2002') {
      errorMessage = 'An exam with this name already exists';
    } else if (error.code === 'P2003') {
      errorMessage =
        'Invalid reference: ' + (error.meta?.field_name || 'unknown field');
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details:
          process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
