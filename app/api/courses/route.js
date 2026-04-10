// app/api/courses/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
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

// Helper function to format course response
function formatCourseResponse(course) {
  return {
    id: course.id,
    name: course.name,
    code: course.code,
    credits: course.credits,
    description: course.description,
    lecture: course.lecture,
    tutorial: course.tutorial,
    practical: course.practical,
    noncredit: course.noncredit,
    courseType: course.courseType, // Fixed: use correct field name
    semester: course.semester,
    syllabus: course.syllabus,
    departmentId: course.departmentId,
    createdAt: course.createdAt,
    updatedAt: course.updatedAt,
    department: course.department
      ? {
          id: course.department.id,
          name: course.department.name,
          code: course.department.code,
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

    const canReadCourses = await hasPermission(
      session.user.id,
      'courses',
      'read'
    );
    if (!canReadCourses) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to view courses' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const departmentId = searchParams.get('departmentId');
    const type = searchParams.get('type');
    const semester = searchParams.get('semester');
    const sortBy = searchParams.get('sortBy') || 'id';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const skip = (page - 1) * limit;

    const where = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (departmentId && departmentId !== 'all') {
      where.departmentId = parseInt(departmentId);
    }

    if (type && type !== 'all') {
      where.courseType = type; // Fixed: use correct field name
    }

    if (semester && semester !== 'all') {
      where.semester = semester;
    }

    let orderBy = {};
    if (sortBy === 'name') {
      orderBy = { name: sortOrder };
    } else if (sortBy === 'code') {
      orderBy = { code: sortOrder };
    } else if (sortBy === 'credits') {
      orderBy = { credits: sortOrder };
    } else if (sortBy === 'lecture') {
      orderBy = { lecture: sortOrder };
    } else if (sortBy === 'createdAt') {
      orderBy = { createdAt: sortOrder };
    } else if (sortBy === 'id') {
      orderBy = { id: sortOrder };
    } else {
      orderBy = { id: 'desc' };
    }

    const total = await prisma.course.count({ where });

    const courses = await prisma.course.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        department: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    const formattedCourses = courses.map(formatCourseResponse);

    return NextResponse.json({
      courses: formattedCourses,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching courses:', error);
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

    const canCreateCourses = await hasPermission(
      session.user.id,
      'courses',
      'create'
    );
    if (!canCreateCourses) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to create courses' },
        { status: 403 }
      );
    }

    const contentType = request.headers.get('content-type') || '';

    let name,
      code,
      credits,
      description,
      lecture,
      tutorial,
      practical,
      noncredit,
      courseType, // Fixed: use correct variable name
      semester,
      departmentId,
      syllabus;

    if (contentType.includes('application/json')) {
      const jsonData = await request.json();
      name = jsonData.name;
      code = jsonData.code;
      credits = jsonData.credits;
      description = jsonData.description;
      lecture = jsonData.lecture;
      tutorial = jsonData.tutorial;
      practical = jsonData.practical;
      noncredit = jsonData.noncredit;
      courseType = jsonData.courseType || jsonData.couresetype; // Support both for compatibility
      semester = jsonData.semester;
      departmentId = jsonData.departmentId;
      syllabus = null;
    } else {
      const formData = await request.formData();
      name = formData.get('name');
      code = formData.get('code');
      credits = formData.get('credits');
      description = formData.get('description');
      lecture = formData.get('lecture');
      tutorial = formData.get('tutorial');
      practical = formData.get('practical');
      noncredit = formData.get('noncredit') === 'true';
      courseType = formData.get('courseType') || formData.get('couresetype'); // Support both
      semester = formData.get('semester');
      departmentId = formData.get('departmentId');
      syllabus = formData.get('syllabus');
    }

    const missingFields = [];
    if (!name) missingFields.push('name');
    if (!code) missingFields.push('code');

    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }

    // Check for duplicate course code
    const existingCourse = await prisma.course.findFirst({
      where: { code: code.toUpperCase() },
    });

    if (existingCourse) {
      return NextResponse.json(
        { error: 'Course with this code already exists' },
        { status: 409 }
      );
    }

    // Check for duplicate course name
    const existingName = await prisma.course.findFirst({
      where: { name: name.trim() },
    });

    if (existingName) {
      return NextResponse.json(
        { error: 'Course with this name already exists' },
        { status: 409 }
      );
    }

    // Validate department if provided
    if (departmentId) {
      const departmentExists = await prisma.department.findUnique({
        where: { id: parseInt(departmentId) },
      });
      if (!departmentExists) {
        return NextResponse.json(
          { error: 'Department not found' },
          { status: 404 }
        );
      }
    }

    // Validate numeric fields
    if (credits && (parseInt(credits) < 0 || parseInt(credits) > 12)) {
      return NextResponse.json(
        { error: 'Credits must be between 0 and 12' },
        { status: 400 }
      );
    }

    if (lecture && (parseInt(lecture) < 0 || parseInt(lecture) > 40)) {
      return NextResponse.json(
        { error: 'Lecture hours must be between 0 and 40' },
        { status: 400 }
      );
    }

    if (tutorial && (parseInt(tutorial) < 0 || parseInt(tutorial) > 20)) {
      return NextResponse.json(
        { error: 'Tutorial hours must be between 0 and 20' },
        { status: 400 }
      );
    }

    if (practical && (parseInt(practical) < 0 || parseInt(practical) > 30)) {
      return NextResponse.json(
        { error: 'Practical hours must be between 0 and 30' },
        { status: 400 }
      );
    }

    // Validate course type
    const validCourseTypes = ['core', 'elective'];
    if (courseType && !validCourseTypes.includes(courseType)) {
      return NextResponse.json(
        { error: 'Course type must be either "core" or "elective"' },
        { status: 400 }
      );
    }

    // Validate semester
    const validSemesters = [
      'semester1',
      'semester2',
      'semester3',
      'semester4',
      'semester5',
      'semester6',
      'semester7',
      'semester8',
    ];
    if (semester && !validSemesters.includes(semester)) {
      return NextResponse.json(
        { error: 'Invalid semester value' },
        { status: 400 }
      );
    }

    // Handle syllabus upload
    let syllabusPath = null;
    if (syllabus && syllabus instanceof File && syllabus.size > 0) {
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ];
      if (!allowedTypes.includes(syllabus.type)) {
        return NextResponse.json(
          { error: 'File must be PDF, DOC, or DOCX' },
          { status: 400 }
        );
      }

      if (syllabus.size > 10 * 1024 * 1024) {
        return NextResponse.json(
          { error: 'File size must be less than 10MB' },
          { status: 400 }
        );
      }

      const bytes = await syllabus.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 8);
      const sanitizedName = syllabus.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filename = `course-${timestamp}-${randomString}-${sanitizedName}`;
      const uploadDir = path.join(process.cwd(), 'public/uploads/courses');

      try {
        await mkdir(uploadDir, { recursive: true });
        const filepath = path.join(uploadDir, filename);
        await writeFile(filepath, buffer);
        syllabusPath = `/uploads/courses/${filename}`;
      } catch (uploadError) {
        console.error('Error uploading syllabus:', uploadError);
        return NextResponse.json(
          { error: 'Failed to upload syllabus file' },
          { status: 500 }
        );
      }
    }

    // Create course - using correct field name 'courseType'
    const course = await prisma.course.create({
      data: {
        name: name.trim(),
        code: code.toUpperCase(),
        credits: credits ? parseInt(credits) : null,
        description: description || null,
        lecture: lecture ? parseInt(lecture) : null,
        tutorial: tutorial ? parseInt(tutorial) : null,
        practical: practical ? parseInt(practical) : null,
        noncredit: noncredit || false,
        courseType: courseType || 'core', // Fixed: use 'courseType' not 'couresetype'
        semester: semester || 'semester1',
        syllabus: syllabusPath,
        departmentId: departmentId ? parseInt(departmentId) : null,
      },
      include: {
        department: true,
      },
    });

    return NextResponse.json(
      {
        course: formatCourseResponse(course),
        message: 'Course created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating course:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
