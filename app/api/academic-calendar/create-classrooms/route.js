// app/api/academic-calendar/create-classrooms/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { batchId, semester, startDate } = body;

    if (!batchId || !semester) {
      return NextResponse.json(
        { error: 'Batch ID and semester are required' },
        { status: 400 }
      );
    }

    // Get batch details
    const batch = await prisma.batch.findUnique({
      where: { id: parseInt(batchId) },
      include: { department: true },
    });

    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    // Get course assignments for this batch and semester
    const courseLists = await prisma.courseList.findMany({
      where: {
        batchId: parseInt(batchId),
        semester: semester,
      },
      include: { course: true },
    });

    if (courseLists.length === 0) {
      return NextResponse.json(
        { error: 'No courses found for this batch and semester' },
        { status: 400 }
      );
    }

    // Get existing classrooms to avoid duplicates
    const existingClassrooms = await prisma.classroom.findMany({
      where: {
        batchId: parseInt(batchId),
        courseId: { in: courseLists.map((cl) => cl.courseId) },
      },
    });

    const existingCourseIds = new Set(
      existingClassrooms.map((c) => c.courseId)
    );

    // Create classrooms
    const created = [];
    const skipped = [];

    for (const cl of courseLists) {
      if (existingCourseIds.has(cl.courseId)) {
        skipped.push(cl.course.code);
        continue;
      }

      const classroomName = `${batch.name}-${cl.course.code}-${semester.replace(
        'semester',
        'Sem'
      )}`;

      try {
        const classroom = await prisma.classroom.create({
          data: {
            name: classroomName,
            courseId: cl.courseId,
            batchId: parseInt(batchId),
            departmentId: batch.departmentId,
            startDate: startDate ? new Date(startDate) : new Date(),
            capacity: 50,
          },
        });
        created.push(classroom);
      } catch (error) {
        console.error(`Error creating classroom for ${cl.course.code}:`, error);
        skipped.push(cl.course.code);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Created ${created.length} classrooms`,
      classroomCount: created.length,
      skippedCount: skipped.length,
      classrooms: created,
    });
  } catch (error) {
    console.error('Error creating classrooms:', error);
    return NextResponse.json(
      { error: 'Failed to create classrooms', details: error.message },
      { status: 500 }
    );
  }
}
