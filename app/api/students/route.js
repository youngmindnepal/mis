import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { existsSync } from 'fs';

// GET - Fetch all students with pagination and filters
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const batchId = searchParams.get('batchId') || '';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const skip = (page - 1) * limit;

    // Build where clause
    const where = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { rollNo: { contains: search, mode: 'insensitive' } },
        { enrollmentNo: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status && status !== 'all') {
      where.status = status;
    }

    if (batchId && batchId !== 'all') {
      where.batchId = parseInt(batchId);
    }

    // Fetch students
    const students = await prisma.student.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        [sortBy]: sortOrder,
      },
      include: {
        batch: {
          include: {
            department: true,
          },
        },
      },
    });

    // Get total count for pagination
    const total = await prisma.student.count({ where });

    // Transform students for frontend compatibility
    const transformedStudents = students.map((student) => ({
      ...student,
      user: {
        name: student.name,
        email: student.email,
      },
      rollNumber: student.rollNo,
      registrationNumber: student.enrollmentNo,
      photo: student.profilePicture,
    }));

    return NextResponse.json({
      students: transformedStudents,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching students:', error);
    return NextResponse.json(
      { error: 'Failed to fetch students', details: error.message },
      { status: 500 }
    );
  }
}

// POST - Create a new student
export async function POST(request) {
  try {
    const formData = await request.formData();

    // Extract form data with proper null handling
    const name = formData.get('name')?.toString().trim();
    const email = formData.get('email')?.toString().trim().toLowerCase();
    const phone = formData.get('phone')?.toString().trim();
    const address = formData.get('address')?.toString().trim() || null;
    const rollNo =
      formData.get('rollNo')?.toString().trim() ||
      formData.get('rollNumber')?.toString().trim() ||
      null;
    const enrollmentNo =
      formData.get('enrollmentNo')?.toString().trim() ||
      formData.get('registrationNumber')?.toString().trim() ||
      null;
    const examRollNumber =
      formData.get('examRollNumber')?.toString().trim() || null;
    const enrollmentDate = formData.get('enrollmentDate')?.toString();
    const dateOfBirth = formData.get('dateOfBirth')?.toString() || null;
    const bloodGroup = formData.get('bloodGroup')?.toString() || null;
    const guardianName =
      formData.get('guardianName')?.toString().trim() || null;
    const guardianContact =
      formData.get('guardianContact')?.toString().trim() || null;
    const guardianEmail =
      formData.get('guardianEmail')?.toString().trim() || null;
    const emergencyContact =
      formData.get('emergencyContact')?.toString().trim() || null;
    const batchIdRaw = formData.get('batchId')?.toString();
    const batchId =
      batchIdRaw && batchIdRaw !== '' ? parseInt(batchIdRaw) : null;
    const status = formData.get('status')?.toString() || 'active';
    const inactiveDate = formData.get('inactiveDate')?.toString() || null;
    const profilePicture =
      formData.get('profilePicture') || formData.get('photo');

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'Student name is required' },
        { status: 400 }
      );
    }

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    if (!phone) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate phone format (10 digits)
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(phone.replace(/\D/g, ''))) {
      return NextResponse.json(
        { error: 'Phone number must be 10 digits' },
        { status: 400 }
      );
    }

    // Check if student with email already exists
    const existingStudent = await prisma.student.findUnique({
      where: { email },
    });

    if (existingStudent) {
      return NextResponse.json(
        { error: 'A student with this email already exists' },
        { status: 400 }
      );
    }

    // Check if enrollment number already exists (if provided)
    if (enrollmentNo) {
      const existingEnrollment = await prisma.student.findUnique({
        where: { enrollmentNo },
      });

      if (existingEnrollment) {
        return NextResponse.json(
          { error: 'A student with this enrollment number already exists' },
          { status: 400 }
        );
      }
    }

    // Check if exam roll number already exists (if provided)
    if (examRollNumber) {
      const existingExamRoll = await prisma.student.findUnique({
        where: { examRollNumber },
      });

      if (existingExamRoll) {
        return NextResponse.json(
          { error: 'A student with this exam roll number already exists' },
          { status: 400 }
        );
      }
    }

    // If batchId is provided, verify it exists
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
    let photoPath = null;
    if (
      profilePicture &&
      profilePicture instanceof File &&
      profilePicture.size > 0
    ) {
      try {
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

        const bytes = await profilePicture.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Generate unique filename
        const fileExt = profilePicture.name.split('.').pop();
        const filename = `${uuidv4()}.${fileExt}`;
        const uploadDir = path.join(
          process.cwd(),
          'public',
          'uploads',
          'students'
        );

        // Create directory if it doesn't exist
        if (!existsSync(uploadDir)) {
          await mkdir(uploadDir, { recursive: true });
        }

        const filePath = path.join(uploadDir, filename);
        await writeFile(filePath, buffer);
        photoPath = `/uploads/students/${filename}`;
      } catch (uploadError) {
        console.error('Error uploading photo:', uploadError);
        return NextResponse.json(
          { error: 'Failed to upload profile picture' },
          { status: 500 }
        );
      }
    }

    // Prepare student data for creation
    const studentData = {
      name,
      email,
      phone,
      address,
      rollNo,
      enrollmentNo,
      examRollNumber,
      enrollmentDate: enrollmentDate ? new Date(enrollmentDate) : new Date(),
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      bloodGroup,
      guardianName,
      guardianContact,
      guardianEmail,
      emergencyContact,
      profilePicture: photoPath,
      status,
      inactiveDate: inactiveDate ? new Date(inactiveDate) : null,
    };

    // Add batch relation if batchId is provided
    if (batchId) {
      studentData.batch = {
        connect: {
          id: batchId,
        },
      };
    }

    // Create student
    const student = await prisma.student.create({
      data: studentData,
      include: {
        batch: {
          include: {
            department: true,
          },
        },
      },
    });

    // Transform student for frontend compatibility
    const transformedStudent = {
      ...student,
      user: {
        name: student.name,
        email: student.email,
      },
      rollNumber: student.rollNo,
      registrationNumber: student.enrollmentNo,
      photo: student.profilePicture,
    };

    return NextResponse.json(
      {
        message: 'Student created successfully',
        student: transformedStudent,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating student:', error);

    // Check for specific Prisma errors
    if (error.code === 'P2002') {
      const field = error.meta?.target?.[0];
      let errorMessage = 'A student with this ';
      if (field === 'email') errorMessage += 'email already exists';
      else if (field === 'enrollmentNo')
        errorMessage += 'enrollment number already exists';
      else if (field === 'examRollNumber')
        errorMessage += 'exam roll number already exists';
      else errorMessage += 'information already exists';

      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    if (error.code === 'P2003') {
      return NextResponse.json(
        { error: 'Invalid batch selected' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create student', details: error.message },
      { status: 500 }
    );
  }
}
