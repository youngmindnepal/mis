// app/api/classrooms/[id]/route.js

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function DELETE(request, { params }) {
  console.log('=== API DELETE CLASSROOM STARTED ===');

  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    console.log('Session user ID:', session?.user?.id);

    if (!session?.user?.id) {
      console.log('No authenticated user');
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    // Check permissions
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        role: {
          include: {
            permissions: {
              include: { permission: true },
            },
          },
        },
      },
    });

    console.log('User role:', user?.role?.name);

    const hasDeletePermission =
      user?.role?.name === 'SYSTEM_ADMIN' ||
      user?.role?.permissions?.some(
        (rp) =>
          rp.permission?.resource === 'classroom' &&
          rp.permission?.action === 'delete'
      );

    if (!hasDeletePermission) {
      console.log('No delete permission');
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to delete classrooms' },
        { status: 403 }
      );
    }

    // Get classroom ID
    const { id } = await params;
    const classroomId = parseInt(id);
    console.log('Deleting classroom ID:', classroomId);

    if (isNaN(classroomId)) {
      return NextResponse.json(
        { error: 'Invalid classroom ID' },
        { status: 400 }
      );
    }

    // Check if classroom exists
    const classroom = await prisma.classroom.findUnique({
      where: { id: classroomId },
      include: {
        sessions: { select: { id: true } },
        enrollments: { select: { id: true } },
        routines: { select: { id: true } },
        exams: { select: { id: true } },
        results: { select: { id: true } },
      },
    });

    if (!classroom) {
      console.log('Classroom not found');
      return NextResponse.json(
        { error: 'Classroom not found' },
        { status: 404 }
      );
    }

    console.log('Classroom found:', classroom.name);
    console.log('Related records:', {
      sessions: classroom.sessions.length,
      enrollments: classroom.enrollments.length,
      routines: classroom.routines.length,
      exams: classroom.exams.length,
      results: classroom.results.length,
    });

    // Delete in transaction
    await prisma.$transaction(async (tx) => {
      // 1. Handle sessions and attendance
      if (classroom.sessions.length > 0) {
        const sessionIds = classroom.sessions.map((s) => s.id);
        console.log('Deleting attendance records for sessions:', sessionIds);

        // Delete attendance records
        await tx.attendance.deleteMany({
          where: {
            classSessionId: { in: sessionIds },
          },
        });

        // Delete class sessions
        console.log('Deleting class sessions');
        await tx.classSession.deleteMany({
          where: { id: { in: sessionIds } },
        });
      }

      // 2. Delete attendance summaries
      console.log('Deleting attendance summaries');
      await tx.attendanceSummary.deleteMany({
        where: { classroomId },
      });

      // 3. Delete classroom enrollments
      console.log('Deleting enrollments');
      await tx.classroomEnrollment.deleteMany({
        where: { classroomId },
      });

      // 4. Update routines (set classroomId to null instead of deleting)
      console.log('Updating routines');
      await tx.routine.updateMany({
        where: { classroomId },
        data: { classroomId: null },
      });

      // 5. Update exams (set classroomId to null)
      console.log('Updating exams');
      await tx.exam.updateMany({
        where: { classroomId },
        data: { classroomId: null },
      });

      // 6. Update results (set classroomId to null)
      console.log('Updating results');
      await tx.result.updateMany({
        where: { classroomId },
        data: { classroomId: null },
      });

      // 7. Finally delete the classroom
      console.log('Deleting classroom');
      await tx.classroom.delete({
        where: { id: classroomId },
      });
    });

    console.log('Transaction completed successfully');
    console.log('=== API DELETE CLASSROOM SUCCESS ===');

    return NextResponse.json({
      success: true,
      message: `Classroom "${classroom.name}" deleted successfully`,
    });
  } catch (error) {
    console.error('=== API DELETE CLASSROOM ERROR ===');
    console.error('Error name:', error?.name);
    console.error('Error message:', error?.message);
    console.error('Error code:', error?.code);
    console.error('Error stack:', error?.stack);

    // Handle specific Prisma errors
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Classroom not found or already deleted' },
        { status: 404 }
      );
    }

    if (error.code === 'P2003') {
      return NextResponse.json(
        {
          error:
            'Cannot delete classroom due to foreign key constraints. Some records still reference this classroom.',
        },
        { status: 409 }
      );
    }

    if (error.code === 'P2014') {
      return NextResponse.json(
        {
          error:
            'Cannot delete classroom due to existing relations. Please remove all related data first.',
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        role: {
          include: {
            permissions: {
              include: { permission: true },
            },
          },
        },
      },
    });

    const hasUpdatePermission =
      user?.role?.name === 'SYSTEM_ADMIN' ||
      user?.role?.permissions?.some(
        (rp) =>
          rp.permission?.resource === 'classroom' &&
          rp.permission?.action === 'update'
      );

    if (!hasUpdatePermission) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to update classrooms' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const classroomId = parseInt(id);

    if (isNaN(classroomId)) {
      return NextResponse.json(
        { error: 'Invalid classroom ID' },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const updateData = {};

    if (formData.has('name')) updateData.name = formData.get('name');
    if (formData.has('courseId'))
      updateData.courseId = parseInt(formData.get('courseId'));
    if (formData.has('batchId'))
      updateData.batchId = parseInt(formData.get('batchId'));
    if (formData.has('facultyId'))
      updateData.facultyId = parseInt(formData.get('facultyId'));
    if (formData.has('departmentId'))
      updateData.departmentId = parseInt(formData.get('departmentId'));
    if (formData.has('capacity'))
      updateData.capacity = parseInt(formData.get('capacity'));
    if (formData.has('startDate'))
      updateData.startDate = new Date(formData.get('startDate'));
    if (formData.has('endDate'))
      updateData.endDate = new Date(formData.get('endDate'));
    if (formData.has('status')) updateData.status = formData.get('status');

    const existingClassroom = await prisma.classroom.findUnique({
      where: { id: classroomId },
    });

    if (!existingClassroom) {
      return NextResponse.json(
        { error: 'Classroom not found' },
        { status: 404 }
      );
    }

    const updatedClassroom = await prisma.classroom.update({
      where: { id: classroomId },
      data: updateData,
      include: {
        course: true,
        batch: true,
        faculty: true,
        department: true,
        _count: {
          select: {
            enrollments: true,
            sessions: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Classroom "${updatedClassroom.name}" updated successfully`,
      classroom: updatedClassroom,
    });
  } catch (error) {
    console.error('Error updating classroom:', error);

    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Classroom not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
