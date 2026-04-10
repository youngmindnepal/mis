// app/api/students/[id]/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { writeFile, mkdir, unlink } from 'fs/promises';
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

function formatStudentResponse(student) {
  return {
    id: student.id,
    name: student.name,
    email: student.email,
    phone: student.phone,
    address: student.address,
    rollNo: student.rollNo,
    rollNumber: student.rollNo, // Frontend compatibility
    enrollmentNo: student.enrollmentNo,
    registrationNumber: student.enrollmentNo, // Frontend compatibility
    examRollNumber: student.examRollNumber,
    dateOfBirth: student.dateOfBirth,
    gender: student.gender,
    profilePicture: student.profilePicture,
    status: student.status,
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

// app/api/students/[id]/route.js - Updated PUT method

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

    const existingStudent = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        classroomEnrollments: true, // Include current enrollments
      },
    });

    if (!existingStudent) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const formData = await request.formData();

    const name = formData.get('name');
    const email = formData.get('email');
    const phone = formData.get('phone');
    const address = formData.get('address');
    const rollNo = formData.get('rollNo') || formData.get('rollNumber');
    const enrollmentNo =
      formData.get('enrollmentNo') || formData.get('enrollmentNumber');
    const examRollNumber = formData.get('examRollNumber');
    const enrollmentDate = formData.get('enrollmentDate');
    const dateOfBirth = formData.get('dateOfBirth');
    const bloodGroup = formData.get('bloodGroup');
    const guardianName = formData.get('guardianName');
    const guardianContact = formData.get('guardianContact');
    const guardianEmail = formData.get('guardianEmail');
    const emergencyContact = formData.get('emergencyContact');
    const batchId = formData.get('batchId');
    const status = formData.get('status');
    const profilePicture = formData.get('profilePicture');

    // Check if status is being changed
    const isStatusChanging = status && status !== existingStudent.status;
    const oldStatus = existingStudent.status;
    const newStatus = status;

    // Check email uniqueness if changed
    if (email && email !== existingStudent.email) {
      const emailExists = await prisma.student.findFirst({
        where: { email, id: { not: studentId } },
      });
      if (emailExists) {
        return NextResponse.json(
          { error: 'Email already in use' },
          { status: 409 }
        );
      }
    }

    // Check phone uniqueness if changed
    if (phone && phone !== existingStudent.phone) {
      const phoneExists = await prisma.student.findFirst({
        where: { phone, id: { not: studentId } },
      });
      if (phoneExists) {
        return NextResponse.json(
          { error: 'Phone number already exists' },
          { status: 409 }
        );
      }
    }

    // Check roll number uniqueness if changed
    if (rollNo && rollNo !== existingStudent.rollNo) {
      const rollExists = await prisma.student.findFirst({
        where: { rollNo, id: { not: studentId } },
      });
      if (rollExists) {
        return NextResponse.json(
          { error: 'Roll number already exists' },
          { status: 409 }
        );
      }
    }

    // Handle photo upload
    let photoPath = existingStudent.profilePicture;
    if (
      profilePicture &&
      profilePicture instanceof File &&
      profilePicture.size > 0
    ) {
      if (!profilePicture.type.startsWith('image/')) {
        return NextResponse.json(
          { error: 'File must be an image' },
          { status: 400 }
        );
      }

      if (profilePicture.size > 5 * 1024 * 1024) {
        return NextResponse.json(
          { error: 'File size must be less than 5MB' },
          { status: 400 }
        );
      }

      if (existingStudent.profilePicture) {
        const oldPhotoPath = path.join(
          process.cwd(),
          'public',
          existingStudent.profilePicture
        );
        try {
          await unlink(oldPhotoPath);
        } catch (err) {
          console.error('Error deleting old photo:', err);
        }
      }

      const bytes = await profilePicture.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 8);
      const sanitizedName = profilePicture.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filename = `student-${timestamp}-${randomString}-${sanitizedName}`;
      const uploadDir = path.join(process.cwd(), 'public/uploads/students');

      await mkdir(uploadDir, { recursive: true });

      const filepath = path.join(uploadDir, filename);
      await writeFile(filepath, buffer);

      photoPath = `/uploads/students/${filename}`;
    }

    // Prepare update data using correct schema field names
    const updateData = {};

    if (name !== undefined && name !== null) updateData.name = name.trim();
    if (email !== undefined && email !== null)
      updateData.email = email.trim().toLowerCase();
    if (phone !== undefined && phone !== null) updateData.phone = phone.trim();
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
    if (photoPath !== existingStudent.profilePicture)
      updateData.profilePicture = photoPath;
    if (batchId !== undefined && batchId !== null)
      updateData.batchId = batchId ? parseInt(batchId) : null;
    if (status !== undefined && status !== null) updateData.status = status;

    // Update student
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
        },
        data: {
          status: enrollmentStatus,
        },
      });

      console.log(
        `Updated ${existingStudent.classroomEnrollments.length} classroom enrollments to ${enrollmentStatus} for student ${updatedStudent.name}`
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
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

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

    const student = await prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    if (student.profilePicture) {
      const photoPath = path.join(
        process.cwd(),
        'public',
        student.profilePicture
      );
      try {
        await unlink(photoPath);
      } catch (err) {
        console.error('Error deleting photo:', err);
      }
    }

    await prisma.student.delete({
      where: { id: studentId },
    });

    return NextResponse.json({ message: 'Student deleted successfully' });
  } catch (error) {
    console.error('Error deleting student:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
