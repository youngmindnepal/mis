import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // FETCH ALL CLASSROOMS
    const classrooms = await prisma.classroom.findMany({
      orderBy: { name: 'asc' },
      include: {
        course: { select: { id: true, name: true, code: true } },
        faculty: {
          select: { id: true, name: true, email: true, designation: true },
        },
        batch: {
          select: { id: true, name: true, academicYear: true, status: true },
        },
        department: { select: { id: true, name: true, code: true } },
        _count: { select: { enrollments: true, sessions: true } },
      },
    });

    return NextResponse.json({ classrooms, total: classrooms.length });
  } catch (error) {
    console.error('[GET] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();

    const name = formData.get('name')?.toString().trim();
    const startDate = formData.get('startDate');
    const endDate = formData.get('endDate');
    const capacity = formData.get('capacity');
    const courseId = formData.get('courseId');
    const facultyId = formData.get('facultyId');
    const batchId = formData.get('batchId');
    const departmentId = formData.get('departmentId');

    if (!name)
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    if (!courseId)
      return NextResponse.json(
        { error: 'Course is required' },
        { status: 400 }
      );

    // Check duplicate
    const existing = await prisma.classroom.findUnique({ where: { name } });
    if (existing) {
      return NextResponse.json(
        { error: 'Classroom name already exists' },
        { status: 409 }
      );
    }

    // Create classroom
    const classroom = await prisma.classroom.create({
      data: {
        name,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        capacity: capacity ? parseInt(capacity) : null,
        courseId: parseInt(courseId),
        facultyId: facultyId ? parseInt(facultyId) : null,
        batchId: batchId ? parseInt(batchId) : null,
        departmentId: departmentId ? parseInt(departmentId) : null,
        status: 'active',
      },
      include: {
        course: { select: { id: true, name: true, code: true } },
        faculty: {
          select: { id: true, name: true, email: true, designation: true },
        },
        batch: {
          select: { id: true, name: true, academicYear: true, status: true },
        },
        department: { select: { id: true, name: true, code: true } },
        _count: { select: { enrollments: true, sessions: true } },
      },
    });

    // Auto-enroll batch students
    let enrolledCount = 0;
    if (batchId) {
      try {
        const students = await prisma.student.findMany({
          where: { batchId: parseInt(batchId), status: 'active' },
        });
        if (students.length > 0) {
          await prisma.classroomEnrollment.createMany({
            data: students.map((s) => ({
              studentId: s.id,
              classroomId: classroom.id,
              status: 'active',
            })),
            skipDuplicates: true,
          });
          enrolledCount = students.length;
        }
      } catch (e) {
        console.error('Enrollment error:', e);
      }
    }

    return NextResponse.json(
      {
        classroom,
        enrolledStudents: enrolledCount,
        message: `Classroom "${classroom.name}" created successfully`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[POST] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
