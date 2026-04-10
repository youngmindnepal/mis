// app/api/classrooms/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Permission checking function
async function hasPermission(userId, resource, action) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    if (!user) return false;

    if (user.role?.name === 'SYSTEM_ADMIN') {
      return true;
    }

    const hasRequiredPermission = user.role?.permissions?.some(
      (rp) =>
        rp.permission.resource === resource && rp.permission.action === action
    );

    return hasRequiredPermission || false;
  } catch (error) {
    console.error('Error checking permission:', error);
    return false;
  }
}

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canReadClassrooms = await hasPermission(
      session.user.id,
      'classroom',
      'read'
    );
    if (!canReadClassrooms) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to view classrooms' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const batchId = searchParams.get('batchId');
    const courseId = searchParams.get('courseId');
    const facultyId = searchParams.get('facultyId');

    const skip = (page - 1) * limit;
    const where = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { course: { name: { contains: search, mode: 'insensitive' } } },
        { batch: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (batchId && batchId !== 'all' && batchId !== '') {
      where.batchId = parseInt(batchId);
    }
    if (courseId && courseId !== 'all' && courseId !== '') {
      where.courseId = parseInt(courseId);
    }
    if (facultyId && facultyId !== 'all' && facultyId !== '') {
      where.facultyId = parseInt(facultyId);
    }

    const total = await prisma.classroom.count({ where });

    const classrooms = await prisma.classroom.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        course: {
          select: { id: true, name: true, code: true },
        },
        faculty: {
          select: { id: true, name: true, email: true, designation: true },
        },
        batch: {
          select: { id: true, name: true, academicYear: true },
        },
        department: {
          select: { id: true, name: true, code: true },
        },
        _count: {
          select: {
            enrollments: true,
            sessions: true,
          },
        },
      },
    });

    return NextResponse.json({
      classrooms,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching classrooms:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canCreateClassrooms = await hasPermission(
      session.user.id,
      'classroom',
      'create'
    );
    if (!canCreateClassrooms) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to create classrooms' },
        { status: 403 }
      );
    }

    // Get form data
    let name,
      startDate,
      endDate,
      capacity,
      courseId,
      facultyId,
      batchId,
      departmentId;

    try {
      const formData = await request.formData();
      name = formData.get('name');
      startDate = formData.get('startDate');
      endDate = formData.get('endDate');
      capacity = formData.get('capacity');
      courseId = formData.get('courseId');
      facultyId = formData.get('facultyId');
      batchId = formData.get('batchId');
      departmentId = formData.get('departmentId');
    } catch (err) {
      console.error('Error parsing form data:', err);
      return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
    }

    // Validate required fields
    const missingFields = [];
    if (!name) missingFields.push('name');
    if (!courseId) missingFields.push('courseId');

    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }

    // Check for duplicate classroom name
    const existing = await prisma.classroom.findUnique({
      where: { name: name.trim() },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Classroom name already exists' },
        { status: 409 }
      );
    }

    // Validate course exists
    const course = await prisma.course.findUnique({
      where: { id: parseInt(courseId) },
    });

    if (!course) {
      return NextResponse.json(
        { error: 'Selected course does not exist' },
        { status: 404 }
      );
    }

    let batch = null;
    let enrolledCount = 0;

    // Validate batch and get students if provided
    if (batchId && batchId !== '') {
      batch = await prisma.batch.findUnique({
        where: { id: parseInt(batchId) },
        include: {
          students: {
            where: { status: 'active' },
          },
        },
      });

      if (!batch) {
        return NextResponse.json(
          { error: 'Selected batch does not exist' },
          { status: 404 }
        );
      }
    }

    // Create classroom
    const classroom = await prisma.classroom.create({
      data: {
        name: name.trim(),
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        capacity: capacity ? parseInt(capacity) : null,
        courseId: parseInt(courseId),
        facultyId: facultyId ? parseInt(facultyId) : null,
        batchId: batchId ? parseInt(batchId) : null,
        departmentId: departmentId ? parseInt(departmentId) : null,
      },
      include: {
        course: true,
        faculty: true,
        batch: true,
        department: true,
      },
    });

    // Auto-enroll students from batch if provided
    if (batch && batch.students.length > 0) {
      const enrollments = batch.students.map((student) => ({
        studentId: student.id,
        classroomId: classroom.id,
        enrolledAt: new Date(),
        status: 'active',
      }));

      const result = await prisma.classroomEnrollment.createMany({
        data: enrollments,
        skipDuplicates: true,
      });
      enrolledCount = result.count;

      // Create attendance summaries for all enrolled students
      for (const student of batch.students) {
        await prisma.attendanceSummary.upsert({
          where: {
            studentId_classroomId: {
              studentId: student.id,
              classroomId: classroom.id,
            },
          },
          update: {},
          create: {
            studentId: student.id,
            classroomId: classroom.id,
            totalSessions: 0,
            presentCount: 0,
            absentCount: 0,
            lateCount: 0,
            excusedCount: 0,
            percentage: 0,
            lastUpdated: new Date(),
          },
        });
      }
    }

    return NextResponse.json(
      {
        classroom,
        enrolledStudents: enrolledCount,
        message: `Classroom created successfully${
          enrolledCount > 0
            ? ` with ${enrolledCount} students enrolled from batch ${
                batch?.name || 'N/A'
              }`
            : ''
        }`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating classroom:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
