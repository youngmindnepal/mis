import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { unlink } from 'fs/promises';
import path from 'path';

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

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canDeleteStudents = await hasPermission(
      session.user.id,
      'students',
      'delete'
    );
    if (!canDeleteStudents) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to delete students' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { studentIds } = body;

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json(
        { error: 'No student IDs provided' },
        { status: 400 }
      );
    }

    // Validate all IDs are numbers
    const validIds = studentIds
      .map((id) => parseInt(id))
      .filter((id) => !isNaN(id));

    if (validIds.length === 0) {
      return NextResponse.json(
        { error: 'Invalid student IDs provided' },
        { status: 400 }
      );
    }

    // Get all students to delete (for photo cleanup and audit)
    const studentsToDelete = await prisma.student.findMany({
      where: {
        id: { in: validIds },
      },
    });

    if (studentsToDelete.length === 0) {
      return NextResponse.json(
        { error: 'No students found to delete' },
        { status: 404 }
      );
    }

    // Delete student photos if they exist
    for (const student of studentsToDelete) {
      if (student.profilePicture) {
        const photoPath = path.join(
          process.cwd(),
          'public',
          student.profilePicture
        );
        try {
          await unlink(photoPath);
        } catch (err) {
          console.error(`Error deleting photo for student ${student.id}:`, err);
        }
      }
    }

    // Delete all students in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Delete students
      const deletedStudents = await tx.student.deleteMany({
        where: {
          id: { in: validIds },
        },
      });

      // If you have a User model linked to students, delete users too
      // const userIds = studentsToDelete.map(s => s.userId).filter(id => id);
      // if (userIds.length > 0) {
      //   await tx.user.deleteMany({
      //     where: {
      //       id: { in: userIds },
      //     },
      //   });
      // }

      return deletedStudents;
    });

    // Create audit log (optional - uncomment if you have AuditLog model)
    /*
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'STUDENTS_BULK_DELETED',
        entity: 'student',
        entityId: null,
        newValues: {
          deletedCount: result.count,
          studentIds: validIds,
          deletedBy: session.user.email,
        },
      },
    });
    */

    return NextResponse.json({
      success: true,
      deletedCount: result.count,
      message: `Successfully deleted ${result.count} student(s)`,
    });
  } catch (error) {
    console.error('Error bulk deleting students:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
