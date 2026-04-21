// app/api/students/[id]/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { writeFile, mkdir, unlink } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

// Permission check function
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

// Format student response for frontend compatibility
function formatStudentResponse(student) {
  return {
    id: student.id,
    name: student.name,
    email: student.email,
    phone: student.phone,
    address: student.address,
    rollNo: student.rollNo,
    rollNumber: student.rollNo,
    enrollmentNo: student.enrollmentNo,
    registrationNumber: student.enrollmentNo,
    examRollNumber: student.examRollNumber,
    enrollmentDate: student.enrollmentDate,
    dateOfBirth: student.dateOfBirth,
    bloodGroup: student.bloodGroup,
    guardianName: student.guardianName,
    guardianContact: student.guardianContact,
    guardianEmail: student.guardianEmail,
    emergencyContact: student.emergencyContact,
    gender: student.gender,
    profilePicture: student.profilePicture,
    photo: student.profilePicture,
    status: student.status,
    inactiveDate: student.inactiveDate,
    batchId: student.batchId,
    createdAt: student.createdAt,
    updatedAt: student.updatedAt,
    batch: student.batch
      ? {
          id: student.batch.id,
          name: student.batch.name,
          academicYear: student.batch.academicYear,
          department: student.batch.department
            ? {
                id: student.batch.department.id,
                name: student.batch.department.name,
                code: student.batch.department.code,
              }
            : null,
        }
      : null,
    user: {
      name: student.name,
      email: student.email,
    },
  };
}

// GET - Fetch single student by ID
export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canReadStudents = await hasPermission(
      session.user.id,
      'students',
      'read'
    );
    if (!canReadStudents) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to view students' },
        { status: 403 }
      );
    }

    const resolvedParams = await params;
    const { id } = resolvedParams;

    const studentId = parseInt(id);
    if (isNaN(studentId)) {
      return NextResponse.json(
        { error: 'Invalid student ID' },
        { status: 400 }
      );
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        batch: {
          include: {
            department: true,
          },
        },
      },
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    return NextResponse.json({ student: formatStudentResponse(student) });
  } catch (error) {
    console.error('Error fetching student:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}

// PUT - Update student
export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canUpdateStudents = await hasPermission(
      session.user.id,
      'students',
      'update'
    );
    if (!canUpdateStudents) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to update students' },
        { status: 403 }
      );
    }

    const resolvedParams = await params;
    const { id } = resolvedParams;

    const studentId = parseInt(id);
    if (isNaN(studentId)) {
      return NextResponse.json(
        { error: 'Invalid student ID' },
        { status: 400 }
      );
    }

    // Check if student exists
    const existingStudent = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        classroomEnrollments: true,
        batch: true,
      },
    });

    if (!existingStudent) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const formData = await request.formData();

    // Extract form data with proper null handling
    const name = formData.get('name')?.toString().trim();
    const email = formData.get('email')?.toString().trim().toLowerCase();
    const phone = formData.get('phone')?.toString().trim();
    const address = formData.get('address')?.toString().trim();
    const rollNo =
      formData.get('rollNo')?.toString().trim() ||
      formData.get('rollNumber')?.toString().trim();
    const enrollmentNo =
      formData.get('enrollmentNo')?.toString().trim() ||
      formData.get('enrollmentNumber')?.toString().trim();
    const examRollNumber = formData.get('examRollNumber')?.toString().trim();
    const enrollmentDate = formData.get('enrollmentDate')?.toString();
    const dateOfBirth = formData.get('dateOfBirth')?.toString();
    const bloodGroup = formData.get('bloodGroup')?.toString();
    const guardianName = formData.get('guardianName')?.toString().trim();
    const guardianContact = formData.get('guardianContact')?.toString().trim();
    const guardianEmail = formData.get('guardianEmail')?.toString().trim();
    const emergencyContact = formData
      .get('emergencyContact')
      ?.toString()
      .trim();
    const batchIdRaw = formData.get('batchId')?.toString();
    const batchId =
      batchIdRaw && batchIdRaw !== '' ? parseInt(batchIdRaw) : null;
    const status = formData.get('status')?.toString();
    const inactiveDate = formData.get('inactiveDate')?.toString();
    const profilePicture =
      formData.get('profilePicture') || formData.get('photo');

    // Check if status is being changed
    const isStatusChanging = status && status !== existingStudent.status;
    const oldStatus = existingStudent.status;
    const newStatus = status;

    // Validate email format if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { error: 'Invalid email format' },
          { status: 400 }
        );
      }
    }

    // Validate phone format if provided
    if (phone) {
      const phoneRegex = /^\d{10}$/;
      if (!phoneRegex.test(phone.replace(/\D/g, ''))) {
        return NextResponse.json(
          { error: 'Phone number must be 10 digits' },
          { status: 400 }
        );
      }
    }

    // Check email uniqueness if changed
    if (email && email !== existingStudent.email) {
      const emailExists = await prisma.student.findFirst({
        where: {
          email,
          id: { not: studentId },
        },
      });
      if (emailExists) {
        return NextResponse.json(
          { error: 'Email already in use by another student' },
          { status: 409 }
        );
      }
    }

    // Check phone uniqueness if changed
    if (phone && phone !== existingStudent.phone) {
      const phoneExists = await prisma.student.findFirst({
        where: {
          phone,
          id: { not: studentId },
        },
      });
      if (phoneExists) {
        return NextResponse.json(
          { error: 'Phone number already in use by another student' },
          { status: 409 }
        );
      }
    }

    // Check enrollment number uniqueness if changed
    if (enrollmentNo && enrollmentNo !== existingStudent.enrollmentNo) {
      const enrollmentExists = await prisma.student.findFirst({
        where: {
          enrollmentNo,
          id: { not: studentId },
        },
      });
      if (enrollmentExists) {
        return NextResponse.json(
          { error: 'Enrollment number already in use' },
          { status: 409 }
        );
      }
    }

    // Check exam roll number uniqueness if changed
    if (examRollNumber && examRollNumber !== existingStudent.examRollNumber) {
      const examRollExists = await prisma.student.findFirst({
        where: {
          examRollNumber,
          id: { not: studentId },
        },
      });
      if (examRollExists) {
        return NextResponse.json(
          { error: 'Exam roll number already in use' },
          { status: 409 }
        );
      }
    }

    // Check roll number uniqueness if changed
    if (rollNo && rollNo !== existingStudent.rollNo) {
      const rollExists = await prisma.student.findFirst({
        where: {
          rollNo,
          id: { not: studentId },
        },
      });
      if (rollExists) {
        return NextResponse.json(
          { error: 'Roll number already in use' },
          { status: 409 }
        );
      }
    }

    // Verify batch exists if batchId is provided
    if (batchId) {
      const batchExists = await prisma.batch.findUnique({
        where: { id: batchId },
      });
      if (!batchExists) {
        return NextResponse.json(
          { error: 'Selected batch does not exist' },
          { status: 400 }
        );
      }
    }

    // Handle profile picture upload
    let photoPath = existingStudent.profilePicture;
    if (
      profilePicture &&
      profilePicture instanceof File &&
      profilePicture.size > 0
    ) {
      // Validate file type
      if (!profilePicture.type.startsWith('image/')) {
        return NextResponse.json(
          { error: 'Profile picture must be an image file' },
          { status: 400 }
        );
      }

      // Validate file size (max 5MB)
      if (profilePicture.size > 5 * 1024 * 1024) {
        return NextResponse.json(
          { error: 'Profile picture must be less than 5MB' },
          { status: 400 }
        );
      }

      // Delete old photo if exists
      if (existingStudent.profilePicture) {
        const oldPhotoPath = path.join(
          process.cwd(),
          'public',
          existingStudent.profilePicture
        );
        try {
          if (existsSync(oldPhotoPath)) {
            await unlink(oldPhotoPath);
          }
        } catch (err) {
          console.error('Error deleting old photo:', err);
        }
      }

      // Upload new photo
      const bytes = await profilePicture.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const fileExt = profilePicture.name.split('.').pop();
      const filename = `student-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 8)}.${fileExt}`;
      const uploadDir = path.join(
        process.cwd(),
        'public',
        'uploads',
        'students'
      );

      if (!existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true });
      }

      const filepath = path.join(uploadDir, filename);
      await writeFile(filepath, buffer);

      photoPath = `/uploads/students/${filename}`;
    }

    // Prepare update data object
    const updateData = {};

    // Only add fields that are provided and different from existing
    if (name !== undefined && name !== null && name !== '')
      updateData.name = name;
    if (email !== undefined && email !== null && email !== '')
      updateData.email = email;
    if (phone !== undefined && phone !== null && phone !== '')
      updateData.phone = phone;
    if (address !== undefined) updateData.address = address || null;
    if (rollNo !== undefined) updateData.rollNo = rollNo || null;
    if (enrollmentNo !== undefined)
      updateData.enrollmentNo = enrollmentNo || null;
    if (examRollNumber !== undefined)
      updateData.examRollNumber = examRollNumber || null;
    if (enrollmentDate) updateData.enrollmentDate = new Date(enrollmentDate);
    if (dateOfBirth) updateData.dateOfBirth = new Date(dateOfBirth);
    if (bloodGroup !== undefined) updateData.bloodGroup = bloodGroup || null;
    if (guardianName !== undefined)
      updateData.guardianName = guardianName || null;
    if (guardianContact !== undefined)
      updateData.guardianContact = guardianContact || null;
    if (guardianEmail !== undefined)
      updateData.guardianEmail = guardianEmail || null;
    if (emergencyContact !== undefined)
      updateData.emergencyContact = emergencyContact || null;
    if (status !== undefined && status !== null) updateData.status = status;
    if (inactiveDate !== undefined)
      updateData.inactiveDate = inactiveDate ? new Date(inactiveDate) : null;
    if (photoPath !== existingStudent.profilePicture)
      updateData.profilePicture = photoPath;

    // Handle batch relation update
    if (batchId !== undefined) {
      if (batchId) {
        updateData.batch = {
          connect: { id: batchId },
        };
      } else {
        updateData.batch = {
          disconnect: true,
        };
      }
    }

    // Update student in database
    const updatedStudent = await prisma.student.update({
      where: { id: studentId },
      data: updateData,
      include: {
        batch: {
          include: {
            department: true,
          },
        },
      },
    });

    // If student status changed, update all classroom enrollments
    if (isStatusChanging) {
      const enrollmentStatus = newStatus === 'active' ? 'active' : 'dropped';

      await prisma.classroomEnrollment.updateMany({
        where: {
          studentId: studentId,
          status: { not: 'completed' }, // Don't update completed enrollments
        },
        data: {
          status: enrollmentStatus,
        },
      });

      console.log(
        `Updated classroom enrollments to ${enrollmentStatus} for student ${updatedStudent.name}`
      );
    }

    return NextResponse.json({
      student: formatStudentResponse(updatedStudent),
      message:
        'Student updated successfully' +
        (isStatusChanging
          ? ` and classroom enrollments ${
              newStatus === 'active' ? 'activated' : 'deactivated'
            }`
          : ''),
    });
  } catch (error) {
    console.error('Error updating student:', error);

    // Handle Prisma errors
    if (error.code === 'P2002') {
      const field = error.meta?.target?.[0];
      let errorMessage = 'A student with this ';
      if (field === 'email') errorMessage += 'email already exists';
      else if (field === 'enrollmentNo')
        errorMessage += 'enrollment number already exists';
      else if (field === 'examRollNumber')
        errorMessage += 'exam roll number already exists';
      else if (field === 'rollNo') errorMessage += 'roll number already exists';
      else if (field === 'phone') errorMessage += 'phone number already exists';
      else errorMessage += 'information already exists';

      return NextResponse.json({ error: errorMessage }, { status: 409 });
    }

    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete student
export async function DELETE(request, { params }) {
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

    const resolvedParams = await params;
    const { id } = resolvedParams;

    const studentId = parseInt(id);
    if (isNaN(studentId)) {
      return NextResponse.json(
        { error: 'Invalid student ID' },
        { status: 400 }
      );
    }

    // Check if student exists with related data
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        attendances: true,
        attendanceSummary: true,
        classroomEnrollments: true,
        results: true,
      },
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Delete profile picture if exists
    if (student.profilePicture) {
      const photoPath = path.join(
        process.cwd(),
        'public',
        student.profilePicture
      );
      try {
        if (existsSync(photoPath)) {
          await unlink(photoPath);
        }
      } catch (err) {
        console.error('Error deleting profile picture:', err);
        // Continue with deletion even if photo deletion fails
      }
    }

    // Use transaction to delete student and all related data
    await prisma.$transaction(async (tx) => {
      // Delete attendance records
      if (student.attendances.length > 0) {
        await tx.attendance.deleteMany({
          where: { studentId: studentId },
        });
      }

      // Delete attendance summary
      if (student.attendanceSummary.length > 0) {
        await tx.attendanceSummary.deleteMany({
          where: { studentId: studentId },
        });
      }

      // Delete classroom enrollments
      if (student.classroomEnrollments.length > 0) {
        await tx.classroomEnrollment.deleteMany({
          where: { studentId: studentId },
        });
      }

      // Delete results
      if (student.results.length > 0) {
        await tx.result.deleteMany({
          where: { studentId: studentId },
        });
      }

      // Finally delete the student
      await tx.student.delete({
        where: { id: studentId },
      });
    });

    return NextResponse.json({
      message: 'Student and all related data deleted successfully',
      deletedCount: {
        attendances: student.attendances.length,
        attendanceSummary: student.attendanceSummary.length,
        enrollments: student.classroomEnrollments.length,
        results: student.results.length,
      },
    });
  } catch (error) {
    console.error('Error deleting student:', error);

    // Handle Prisma errors
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    if (error.code === 'P2003') {
      return NextResponse.json(
        { error: 'Cannot delete student due to existing related records' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Partial update or status toggle
export async function PATCH(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canUpdateStudents = await hasPermission(
      session.user.id,
      'students',
      'update'
    );
    if (!canUpdateStudents) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to update students' },
        { status: 403 }
      );
    }

    const resolvedParams = await params;
    const { id } = resolvedParams;

    const studentId = parseInt(id);
    if (isNaN(studentId)) {
      return NextResponse.json(
        { error: 'Invalid student ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { action, data } = body;

    // Check if student exists
    const existingStudent = await prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!existingStudent) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    let updatedStudent;

    switch (action) {
      case 'toggle-status':
        const newStatus =
          data.status ||
          (existingStudent.status === 'active' ? 'inactive' : 'active');
        updatedStudent = await prisma.student.update({
          where: { id: studentId },
          data: {
            status: newStatus,
            inactiveDate: newStatus === 'inactive' ? new Date() : null,
          },
          include: {
            batch: {
              include: {
                department: true,
              },
            },
          },
        });

        // Update classroom enrollments
        await prisma.classroomEnrollment.updateMany({
          where: {
            studentId: studentId,
            status: { not: 'completed' },
          },
          data: {
            status: newStatus === 'active' ? 'active' : 'dropped',
          },
        });
        break;

      case 'update-batch':
        if (!data.batchId) {
          return NextResponse.json(
            { error: 'Batch ID is required' },
            { status: 400 }
          );
        }

        // Verify batch exists
        const batchExists = await prisma.batch.findUnique({
          where: { id: parseInt(data.batchId) },
        });

        if (!batchExists) {
          return NextResponse.json(
            { error: 'Batch not found' },
            { status: 404 }
          );
        }

        updatedStudent = await prisma.student.update({
          where: { id: studentId },
          data: {
            batch: {
              connect: { id: parseInt(data.batchId) },
            },
          },
          include: {
            batch: {
              include: {
                department: true,
              },
            },
          },
        });
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({
      student: formatStudentResponse(updatedStudent),
      message: `Student ${action} completed successfully`,
    });
  } catch (error) {
    console.error('Error in PATCH operation:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
