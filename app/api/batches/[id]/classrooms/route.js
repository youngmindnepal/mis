// app/api/batches/[id]/classrooms/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const batchId = parseInt(id);
    const { searchParams } = new URL(request.url);
    const semester = searchParams.get('semester');

    if (isNaN(batchId)) {
      return NextResponse.json({ error: 'Invalid batch ID' }, { status: 400 });
    }

    console.log(
      `Fetching classrooms for batch ${batchId}, semester: ${semester}`
    );

    // Build where clause
    const where = {
      batchId: batchId,
    };

    // Add semester filter on course if provided
    if (semester) {
      where.course = {
        semester: semester,
      };
    }

    const classrooms = await prisma.classroom.findMany({
      where,
      include: {
        course: {
          select: {
            id: true,
            name: true,
            code: true,
            credits: true,
            semester: true,
          },
        },
        faculty: {
          select: {
            id: true,
            name: true,
          },
        },
        batch: {
          select: {
            id: true,
            name: true,
            academicYear: true,
          },
        },
        _count: {
          select: {
            enrollments: {
              where: { status: 'active' },
            },
          },
        },
      },
      orderBy: {
        course: {
          name: 'asc',
        },
      },
    });

    console.log(`Found ${classrooms.length} classrooms`);

    // Format the response
    const formattedClassrooms = classrooms.map((classroom) => ({
      id: Number(classroom.id),
      name: classroom.name,
      capacity: classroom.capacity,
      course: classroom.course
        ? {
            id: Number(classroom.course.id),
            name: classroom.course.name,
            code: classroom.course.code,
            credits: classroom.course.credits || 3,
            semester: classroom.course.semester,
          }
        : null,
      faculty: classroom.faculty
        ? {
            id: Number(classroom.faculty.id),
            name: classroom.faculty.name,
          }
        : null,
      batch: classroom.batch
        ? {
            id: Number(classroom.batch.id),
            name: classroom.batch.name,
            academicYear: classroom.batch.academicYear,
          }
        : null,
      enrolledCount: classroom._count.enrollments,
    }));

    return NextResponse.json({
      classrooms: formattedClassrooms,
      total: formattedClassrooms.length,
      batchId,
      semester: semester || null,
    });
  } catch (error) {
    console.error('Error fetching batch classrooms:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}
