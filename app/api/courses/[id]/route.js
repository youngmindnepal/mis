// app/api/courses/[id]/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { writeFile, mkdir, unlink } from 'fs/promises';
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
    courseType: course.courseType,
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

export async function GET(request, { params }) {
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

    const resolvedParams = await params;
    const { id } = resolvedParams;

    const courseId = parseInt(id);
    if (isNaN(courseId)) {
      return NextResponse.json({ error: 'Invalid course ID' }, { status: 400 });
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
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

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    return NextResponse.json({ course: formatCourseResponse(course) });
  } catch (error) {
    console.error('Error fetching course:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canUpdateCourses = await hasPermission(
      session.user.id,
      'courses',
      'update'
    );
    if (!canUpdateCourses) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to update courses' },
        { status: 403 }
      );
    }

    const resolvedParams = await params;
    const { id } = resolvedParams;

    const courseId = parseInt(id);
    if (isNaN(courseId)) {
      return NextResponse.json({ error: 'Invalid course ID' }, { status: 400 });
    }

    const existingCourse = await prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!existingCourse) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    const formData = await request.formData();

    const name = formData.get('name');
    const code = formData.get('code');
    const credits = formData.get('credits');
    const description = formData.get('description');
    const lecture = formData.get('lecture');
    const tutorial = formData.get('tutorial');
    const practical = formData.get('practical');
    const noncredit = formData.get('noncredit') === 'true';
    const courseType =
      formData.get('courseType') || formData.get('couresetype'); // Support both
    const semester = formData.get('semester');
    const departmentId = formData.get('departmentId');
    const syllabus = formData.get('syllabus');

    // Validate numeric fields if provided
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

    // Check for duplicate course code (excluding current)
    if (code && code.toUpperCase() !== existingCourse.code) {
      const existingCode = await prisma.course.findFirst({
        where: { code: code.toUpperCase(), id: { not: courseId } },
      });
      if (existingCode) {
        return NextResponse.json(
          { error: 'Course with this code already exists' },
          { status: 409 }
        );
      }
    }

    // Check for duplicate course name (excluding current)
    if (name && name.trim() !== existingCourse.name) {
      const existingName = await prisma.course.findFirst({
        where: { name: name.trim(), id: { not: courseId } },
      });
      if (existingName) {
        return NextResponse.json(
          { error: 'Course with this name already exists' },
          { status: 409 }
        );
      }
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
    let syllabusPath = existingCourse.syllabus;
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

      // Delete old syllabus if exists
      if (existingCourse.syllabus) {
        const oldSyllabusPath = path.join(
          process.cwd(),
          'public',
          existingCourse.syllabus
        );
        try {
          await unlink(oldSyllabusPath);
        } catch (err) {
          console.error('Error deleting old syllabus:', err);
        }
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

    // Update course - using correct field name 'courseType'
    const course = await prisma.course.update({
      where: { id: courseId },
      data: {
        name: name ? name.trim() : undefined,
        code: code ? code.toUpperCase() : undefined,
        credits:
          credits !== undefined
            ? credits
              ? parseInt(credits)
              : null
            : undefined,
        description:
          description !== undefined ? description || null : undefined,
        lecture:
          lecture !== undefined
            ? lecture
              ? parseInt(lecture)
              : null
            : undefined,
        tutorial:
          tutorial !== undefined
            ? tutorial
              ? parseInt(tutorial)
              : null
            : undefined,
        practical:
          practical !== undefined
            ? practical
              ? parseInt(practical)
              : null
            : undefined,
        noncredit: noncredit !== undefined ? noncredit : undefined,
        courseType: courseType || undefined, // FIXED: Use 'courseType' not 'couresetype'
        semester: semester || undefined,
        syllabus: syllabusPath,
        departmentId:
          departmentId !== undefined
            ? departmentId
              ? parseInt(departmentId)
              : null
            : undefined,
      },
      include: {
        department: true,
      },
    });

    return NextResponse.json({
      course: formatCourseResponse(course),
      message: 'Course updated successfully',
    });
  } catch (error) {
    console.error('Error updating course:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canDeleteCourses = await hasPermission(
      session.user.id,
      'courses',
      'delete'
    );
    if (!canDeleteCourses) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to delete courses' },
        { status: 403 }
      );
    }

    const resolvedParams = await params;
    const { id } = resolvedParams;

    const courseId = parseInt(id);
    if (isNaN(courseId)) {
      return NextResponse.json({ error: 'Invalid course ID' }, { status: 400 });
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        classrooms: true,
      },
    });

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    // Check if course is being used in classrooms
    if (course.classrooms && course.classrooms.length > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete course "${course.name}" because it is being used in ${course.classrooms.length} classroom(s). Please remove the course from classrooms first.`,
        },
        { status: 409 }
      );
    }

    // Delete syllabus file if exists
    if (course.syllabus) {
      const syllabusPath = path.join(process.cwd(), 'public', course.syllabus);
      try {
        await unlink(syllabusPath);
      } catch (err) {
        console.error('Error deleting syllabus:', err);
      }
    }

    await prisma.course.delete({
      where: { id: courseId },
    });

    return NextResponse.json({
      success: true,
      message: `Course "${course.name}" deleted successfully`,
    });
  } catch (error) {
    console.error('Error deleting course:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
