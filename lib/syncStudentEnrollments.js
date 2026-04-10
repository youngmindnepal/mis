// lib/syncStudentEnrollments.js
import { prisma } from '@/lib/prisma';

/**
 * Sync classroom enrollments based on student status
 * @param {number} studentId - The student ID
 * @returns {Promise<{updated: number, message: string}>}
 */
export async function syncStudentEnrollments(studentId) {
  try {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        batch: true,
        classroomEnrollments: true,
      },
    });

    if (!student) {
      throw new Error('Student not found');
    }

    const newEnrollmentStatus =
      student.status === 'active' ? 'active' : 'dropped';

    // Update existing enrollments
    const updateResult = await prisma.classroomEnrollment.updateMany({
      where: {
        studentId: studentId,
        status: { not: newEnrollmentStatus }, // Only update if status is different
      },
      data: {
        status: newEnrollmentStatus,
      },
    });

    // If student is active and has a batch, ensure they are enrolled in all batch classrooms
    if (student.status === 'active' && student.batchId) {
      const batchClassrooms = await prisma.classroom.findMany({
        where: {
          batchId: student.batchId,
        },
        select: { id: true },
      });

      const existingClassroomIds = student.classroomEnrollments.map(
        (e) => e.classroomId
      );
      const newClassrooms = batchClassrooms.filter(
        (c) => !existingClassroomIds.includes(c.id)
      );

      if (newClassrooms.length > 0) {
        await prisma.classroomEnrollment.createMany({
          data: newClassrooms.map((classroom) => ({
            studentId: studentId,
            classroomId: classroom.id,
            enrolledAt: new Date(),
            status: 'active',
          })),
          skipDuplicates: true,
        });
      }
    }

    return {
      updated: updateResult.count,
      message: `Synced enrollments for student ${student.name}. Status: ${newEnrollmentStatus}`,
    };
  } catch (error) {
    console.error('Error syncing student enrollments:', error);
    throw error;
  }
}

/**
 * Bulk sync all students' enrollments
 * @returns {Promise<{synced: number, errors: Array}>}
 */
export async function bulkSyncAllStudentEnrollments() {
  const students = await prisma.student.findMany({
    include: {
      classroomEnrollments: true,
    },
  });

  const results = [];
  const errors = [];

  for (const student of students) {
    try {
      const result = await syncStudentEnrollments(student.id);
      results.push(result);
    } catch (error) {
      errors.push({
        studentId: student.id,
        studentName: student.name,
        error: error.message,
      });
    }
  }

  return {
    synced: results.length,
    errors,
    details: results,
  };
}
