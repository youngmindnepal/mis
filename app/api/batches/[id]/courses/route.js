// app/api/batches/[id]/courses/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - Fetch courses assigned to a batch (optionally filtered by semester)
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

    // Build where clause
    const where = {
      batchId,
      isActive: true,
    };
    if (semester) {
      where.semester = semester;
    }

    const courseList = await prisma.courseList.findMany({
      where,
      include: {
        course: {
          select: {
            id: true,
            name: true,
            code: true,
            credits: true,
            description: true,
            semester: true,
          },
        },
      },
      orderBy: {
        course: {
          code: 'asc',
        },
      },
    });

    // Format response
    const courses = courseList.map((item) => ({
      id: item.id,
      courseId: item.courseId,
      batchId: item.batchId,
      semester: item.semester,
      isActive: item.isActive,
      course: item.course,
      assignedAt: item.createdAt,
    }));

    // Group by semester for easier consumption
    const coursesBySemester = {};
    courses.forEach((course) => {
      if (!coursesBySemester[course.semester]) {
        coursesBySemester[course.semester] = [];
      }
      coursesBySemester[course.semester].push(course);
    });

    return NextResponse.json({
      courses,
      coursesBySemester,
      total: courses.length,
      batchId,
      semester: semester || null,
    });
  } catch (error) {
    console.error('Error fetching batch courses:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}

// POST - Assign courses to a batch for a specific semester
export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const batchId = parseInt(id);
    const body = await request.json();
    const { courseIds, semester } = body;

    if (isNaN(batchId)) {
      return NextResponse.json({ error: 'Invalid batch ID' }, { status: 400 });
    }

    if (!courseIds || !Array.isArray(courseIds) || courseIds.length === 0) {
      return NextResponse.json(
        { error: 'Course IDs are required' },
        { status: 400 }
      );
    }

    if (!semester) {
      return NextResponse.json(
        { error: 'Semester is required' },
        { status: 400 }
      );
    }

    // Verify batch exists
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: { department: true },
    });

    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    // Verify all courses exist and belong to the same department (optional validation)
    const courses = await prisma.course.findMany({
      where: {
        id: { in: courseIds.map((id) => parseInt(id)) },
      },
    });

    if (courses.length !== courseIds.length) {
      return NextResponse.json(
        { error: 'One or more courses not found' },
        { status: 400 }
      );
    }

    // Create course list entries (upsert to avoid duplicates)
    const courseListEntries = await prisma.$transaction(
      courseIds.map((courseId) =>
        prisma.courseList.upsert({
          where: {
            batchId_courseId_semester: {
              batchId,
              courseId: parseInt(courseId),
              semester,
            },
          },
          update: {
            isActive: true,
          },
          create: {
            batchId,
            courseId: parseInt(courseId),
            semester,
            departmentId: batch.departmentId,
            isActive: true,
          },
          include: {
            course: {
              select: {
                id: true,
                name: true,
                code: true,
                credits: true,
              },
            },
          },
        })
      )
    );

    return NextResponse.json({
      success: true,
      message: `Successfully assigned ${
        courseListEntries.length
      } course(s) to ${semester.replace('semester', 'Semester ')}`,
      courses: courseListEntries,
    });
  } catch (error) {
    console.error('Error assigning courses:', error);

    // Handle unique constraint violation
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'One or more courses are already assigned to this semester' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}

// DELETE - Remove courses from batch
export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const batchId = parseInt(id);
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');
    const semester = searchParams.get('semester');

    if (isNaN(batchId)) {
      return NextResponse.json({ error: 'Invalid batch ID' }, { status: 400 });
    }

    if (courseId && semester) {
      // Delete specific course from semester
      const parsedCourseId = parseInt(courseId);
      if (isNaN(parsedCourseId)) {
        return NextResponse.json(
          { error: 'Invalid course ID' },
          { status: 400 }
        );
      }

      await prisma.courseList.delete({
        where: {
          batchId_courseId_semester: {
            batchId,
            courseId: parsedCourseId,
            semester,
          },
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Course removed from semester',
      });
    } else if (semester) {
      // Delete all courses for a semester
      const deleted = await prisma.courseList.deleteMany({
        where: {
          batchId,
          semester,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Removed ${deleted.count} course(s) from ${semester.replace(
          'semester',
          'Semester '
        )}`,
      });
    } else {
      return NextResponse.json(
        { error: 'Semester or courseId is required' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error removing courses:', error);

    // Handle record not found
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Course assignment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}

// PATCH - Update course assignment status (activate/deactivate)
export async function PATCH(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const batchId = parseInt(id);
    const body = await request.json();
    const { courseId, semester, isActive } = body;

    if (isNaN(batchId)) {
      return NextResponse.json({ error: 'Invalid batch ID' }, { status: 400 });
    }

    if (!courseId || !semester) {
      return NextResponse.json(
        { error: 'Course ID and semester are required' },
        { status: 400 }
      );
    }

    const parsedCourseId = parseInt(courseId);
    if (isNaN(parsedCourseId)) {
      return NextResponse.json({ error: 'Invalid course ID' }, { status: 400 });
    }

    const updated = await prisma.courseList.update({
      where: {
        batchId_courseId_semester: {
          batchId,
          courseId: parsedCourseId,
          semester,
        },
      },
      data: {
        isActive: isActive === true,
      },
      include: {
        course: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Course ${isActive ? 'activated' : 'deactivated'} successfully`,
      course: updated,
    });
  } catch (error) {
    console.error('Error updating course assignment:', error);

    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Course assignment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}
