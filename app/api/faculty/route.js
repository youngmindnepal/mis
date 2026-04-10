import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import bcrypt from 'bcryptjs';

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

    // SYSTEM_ADMIN has all permissions
    if (user.role?.name === 'SYSTEM_ADMIN') {
      return true;
    }

    // Check specific permission
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

// Helper function to format faculty response
function formatFacultyResponse(faculty) {
  return {
    id: faculty.id,
    name: faculty.name,
    email: faculty.email,
    phone: faculty.phone,
    address: faculty.address,
    joinedDate: faculty.joinedDate,
    cv: faculty.cv,
    designation: faculty.designation,
    qualification: faculty.qualification,
    specialization: faculty.specialization,
    status: faculty.status,
    userId: faculty.userId,
    createdAt: faculty.createdAt,
    updatedAt: faculty.updatedAt,
    user: faculty.user
      ? {
          id: faculty.user.id,
          name: faculty.user.name,
          email: faculty.user.email,
        }
      : null,
  };
}

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission
    const canReadFaculty = await hasPermission(
      session.user.id,
      'faculty',
      'read'
    );
    if (!canReadFaculty) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to view faculty' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status');
    const sortBy = searchParams.get('sortBy') || 'id';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const skip = (page - 1) * limit;

    const where = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { designation: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status && status !== 'all') {
      where.status = status;
    }

    // Determine sort field
    let orderBy = {};
    if (sortBy === 'name') {
      orderBy = { name: sortOrder };
    } else if (sortBy === 'email') {
      orderBy = { email: sortOrder };
    } else if (sortBy === 'joinedDate') {
      orderBy = { joinedDate: sortOrder };
    } else if (sortBy === 'status') {
      orderBy = { status: sortOrder };
    } else if (sortBy === 'id') {
      orderBy = { id: sortOrder };
    } else {
      orderBy = { id: 'desc' };
    }

    const total = await prisma.faculty.count({ where });

    const faculty = await prisma.faculty.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    const formattedFaculty = faculty.map(formatFacultyResponse);

    return NextResponse.json({
      faculty: formattedFaculty,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching faculty:', error);
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

    // Check permission using hasPermission function
    const canCreateFaculty = await hasPermission(
      session.user.id,
      'faculty',
      'create'
    );
    if (!canCreateFaculty) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to create faculty' },
        { status: 403 }
      );
    }

    const contentType = request.headers.get('content-type') || '';

    let name,
      email,
      phone,
      address,
      joinedDate,
      designation,
      qualification,
      specialization,
      status,
      cv;

    if (contentType.includes('application/json')) {
      const jsonData = await request.json();
      name = jsonData.name;
      email = jsonData.email;
      phone = jsonData.phone;
      address = jsonData.address;
      joinedDate = jsonData.joinedDate;
      designation = jsonData.designation;
      qualification = jsonData.qualification;
      specialization = jsonData.specialization;
      status = jsonData.status;
      cv = null;
    } else {
      const formData = await request.formData();
      name = formData.get('name');
      email = formData.get('email');
      phone = formData.get('phone');
      address = formData.get('address');
      joinedDate = formData.get('joinedDate');
      designation = formData.get('designation');
      qualification = formData.get('qualification');
      specialization = formData.get('specialization');
      status = formData.get('status');
      cv = formData.get('cv');
    }

    // Validate required fields
    const missingFields = [];
    if (!name) missingFields.push('name');
    if (!email) missingFields.push('email');
    if (!phone) missingFields.push('phone');

    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }

    // Check for duplicate email in User table (for login)
    const existingUser = await prisma.user.findFirst({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Check for duplicate email in Faculty table
    const existingFacultyEmail = await prisma.faculty.findFirst({
      where: { email: email.toLowerCase() },
    });

    if (existingFacultyEmail) {
      return NextResponse.json(
        { error: 'Faculty with this email already exists' },
        { status: 409 }
      );
    }

    // Check for duplicate phone in Faculty table
    const existingPhone = await prisma.faculty.findFirst({
      where: { phone },
    });

    if (existingPhone) {
      return NextResponse.json(
        { error: 'Faculty with this phone number already exists' },
        { status: 409 }
      );
    }

    // Get FACULTY role ID
    const facultyRole = await prisma.role.findUnique({
      where: { name: 'FACULTY' },
    });

    if (!facultyRole) {
      return NextResponse.json(
        {
          error: 'Faculty role not found. Please run the database seed first.',
        },
        { status: 500 }
      );
    }

    // Handle CV upload
    let cvPath = null;
    if (cv && cv instanceof File && cv.size > 0) {
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ];
      if (!allowedTypes.includes(cv.type)) {
        return NextResponse.json(
          { error: 'File must be PDF, DOC, or DOCX' },
          { status: 400 }
        );
      }

      if (cv.size > 5 * 1024 * 1024) {
        return NextResponse.json(
          { error: 'File size must be less than 5MB' },
          { status: 400 }
        );
      }

      const bytes = await cv.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 8);
      const sanitizedName = cv.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filename = `faculty-${timestamp}-${randomString}-${sanitizedName}`;
      const uploadDir = path.join(process.cwd(), 'public/uploads/faculty');

      try {
        await mkdir(uploadDir, { recursive: true });
        const filepath = path.join(uploadDir, filename);
        await writeFile(filepath, buffer);
        cvPath = `/uploads/faculty/${filename}`;
      } catch (uploadError) {
        console.error('Error uploading CV:', uploadError);
        return NextResponse.json(
          { error: 'Failed to upload CV file' },
          { status: 500 }
        );
      }
    }

    // Hash the phone number to use as password
    const hashedPassword = await bcrypt.hash(phone, 10);

    // Create faculty and user in transaction
    const result = await prisma.$transaction(async (tx) => {
      // First create the user WITH roleId
      const user = await tx.user.create({
        data: {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password: hashedPassword,
          status: 'active',
          address: address || null,
          phone: phone.trim(),
          roleId: facultyRole.id, // FIXED: Added roleId
        },
      });

      // Then create the faculty
      const faculty = await tx.faculty.create({
        data: {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          address: address || null,
          joinedDate: joinedDate ? new Date(joinedDate) : new Date(),
          designation: designation || null,
          qualification: qualification || null,
          specialization: specialization || null,
          status: status || 'active',
          cv: cvPath,
          userId: user.id,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return { user, faculty };
    });

    return NextResponse.json(
      {
        faculty: formatFacultyResponse(result.faculty),
        message: 'Faculty created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating faculty:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
