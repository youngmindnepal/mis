// app/api/students/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

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

// Helper function to format student response
function formatStudentResponse(student) {
  return {
    id: student.id,
    name: student.name,
    email: student.email,
    phone: student.phone,
    address: student.address,
    rollNo: student.rollNo,
    rollNumber: student.rollNo, // For frontend compatibility
    enrollmentNo: student.enrollmentNo,
    registrationNumber: student.enrollmentNo, // For frontend compatibility
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

export async function GET(request) {
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

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status');
    const batchId = searchParams.get('batchId');
    const sortBy = searchParams.get('sortBy') || 'name';
    const sortOrder = searchParams.get('sortOrder') || 'asc';

    const skip = (page - 1) * limit;

    const where = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { enrollmentNo: { contains: search, mode: 'insensitive' } },
        { rollNo: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status && status !== 'all') {
      where.status = status;
    }

    if (batchId && batchId !== 'all') {
      where.batchId = parseInt(batchId);
    }

    let orderBy = {};
    if (sortBy === 'name') {
      orderBy = { name: sortOrder };
    } else if (sortBy === 'rollNumber') {
      orderBy = { rollNo: sortOrder };
    } else if (sortBy === 'status') {
      orderBy = { status: sortOrder };
    } else if (sortBy === 'createdAt') {
      orderBy = { createdAt: sortOrder };
    } else {
      orderBy = { name: 'asc' };
    }

    const total = await prisma.student.count({ where });

    const students = await prisma.student.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        batch: {
          include: {
            department: true,
          },
        },
      },
    });

    const formattedStudents = students.map(formatStudentResponse);

    return NextResponse.json({
      students: formattedStudents,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit,
      },
    });
  } catch (error) {
    console.error('Error fetching students:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canCreateStudents = await hasPermission(
      session.user.id,
      'students',
      'create'
    );
    if (!canCreateStudents) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to create students' },
        { status: 403 }
      );
    }

    const formData = await request.formData();

    const name = formData.get('name');
    const email = formData.get('email');
    const phone = formData.get('phone');
    const address = formData.get('address');
    // IMPORTANT: Get 'rollNo' from formData (not 'rollNumber')
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

    // Validate required fields
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    if (!phone) {
      return NextResponse.json({ error: 'Phone is required' }, { status: 400 });
    }

    // Check for existing student with same email
    const existingEmail = await prisma.student.findFirst({
      where: { email },
    });
    if (existingEmail) {
      return NextResponse.json(
        { error: 'Student with this email already exists' },
        { status: 409 }
      );
    }

    // Check for existing student with same phone
    const existingPhone = await prisma.student.findFirst({
      where: { phone },
    });
    if (existingPhone) {
      return NextResponse.json(
        { error: 'Student with this phone number already exists' },
        { status: 409 }
      );
    }

    // Check roll number uniqueness if provided
    if (rollNo) {
      const existingRollNo = await prisma.student.findFirst({
        where: { rollNo: rollNo },
      });
      if (existingRollNo) {
        return NextResponse.json(
          { error: 'Roll number already exists' },
          { status: 409 }
        );
      }
    }

    // Handle photo upload
    let photoPath = null;
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

    // Create student - using correct schema field names
    const student = await prisma.student.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        address: address || null,
        rollNo: rollNo || null, // Using rollNo (schema field)
        enrollmentNo: enrollmentNo || null,
        examRollNumber: examRollNumber || null,
        enrollmentDate: enrollmentDate ? new Date(enrollmentDate) : new Date(),
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        bloodGroup: bloodGroup || null,
        guardianName: guardianName || null,
        guardianContact: guardianContact || null,
        guardianEmail: guardianEmail || null,
        emergencyContact: emergencyContact || null,
        profilePicture: photoPath,
        batchId: batchId ? parseInt(batchId) : null,
        status: status || 'active',
      },
      include: {
        batch: {
          include: {
            department: true,
          },
        },
      },
    });

    // In the POST method, after creating the student, if batchId is provided,
    // automatically enroll the student in classrooms of that batch

    // After creating the student, add this code:

    // Auto-enroll student in classrooms of the same batch
    if (batchId && status === 'active') {
      const batchClassrooms = await prisma.classroom.findMany({
        where: {
          batchId: parseInt(batchId),
          status: 'active', // If classroom has status field
        },
      });

      if (batchClassrooms.length > 0) {
        const enrollments = batchClassrooms.map((classroom) => ({
          studentId: student.id,
          classroomId: classroom.id,
          enrolledAt: new Date(),
          status: 'active',
        }));

        await prisma.classroomEnrollment.createMany({
          data: enrollments,
          skipDuplicates: true,
        });

        console.log(
          `Auto-enrolled student ${student.name} in ${batchClassrooms.length} classrooms`
        );
      }
    }

    return NextResponse.json(
      {
        student: formatStudentResponse(student),
        message: 'Student created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating student:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
