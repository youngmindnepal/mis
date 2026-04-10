import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { unlink } from 'fs/promises';
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

export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    const resolvedParams = await params;
    const { id } = resolvedParams;

    const facultyId = parseInt(id);
    if (isNaN(facultyId)) {
      return NextResponse.json(
        { error: 'Invalid faculty ID' },
        { status: 400 }
      );
    }

    const faculty = await prisma.faculty.findUnique({
      where: { id: facultyId },
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

    if (!faculty) {
      return NextResponse.json({ error: 'Faculty not found' }, { status: 404 });
    }

    return NextResponse.json({ faculty: formatFacultyResponse(faculty) });
  } catch (error) {
    console.error('Error fetching faculty:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canUpdateFaculty = await hasPermission(
      session.user.id,
      'faculty',
      'update'
    );
    if (!canUpdateFaculty) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to update faculty' },
        { status: 403 }
      );
    }

    const resolvedParams = await params;
    const { id } = resolvedParams;

    const facultyId = parseInt(id);
    if (isNaN(facultyId)) {
      return NextResponse.json(
        { error: 'Invalid faculty ID' },
        { status: 400 }
      );
    }

    // Get existing faculty
    const existingFaculty = await prisma.faculty.findUnique({
      where: { id: facultyId },
      include: { user: true },
    });

    if (!existingFaculty) {
      return NextResponse.json({ error: 'Faculty not found' }, { status: 404 });
    }

    const formData = await request.formData();

    const name = formData.get('name');
    const email = formData.get('email');
    const phone = formData.get('phone');
    const address = formData.get('address');
    const joinedDate = formData.get('joinedDate');
    const designation = formData.get('designation');
    const qualification = formData.get('qualification');
    const specialization = formData.get('specialization');
    const status = formData.get('status');
    const cv = formData.get('cv');

    // Check email uniqueness if changed
    if (email && email !== existingFaculty.email) {
      const emailExists = await prisma.faculty.findFirst({
        where: {
          email: email.toLowerCase(),
          id: { not: facultyId },
        },
      });
      if (emailExists) {
        return NextResponse.json(
          { error: 'Email already in use' },
          { status: 409 }
        );
      }

      // Also check in User table
      const userEmailExists = await prisma.user.findFirst({
        where: {
          email: email.toLowerCase(),
          id: { not: existingFaculty.userId },
        },
      });
      if (userEmailExists) {
        return NextResponse.json(
          { error: 'Email already in use' },
          { status: 409 }
        );
      }
    }

    // Check phone uniqueness if changed
    if (phone && phone !== existingFaculty.phone) {
      const phoneExists = await prisma.faculty.findFirst({
        where: {
          phone,
          id: { not: facultyId },
        },
      });
      if (phoneExists) {
        return NextResponse.json(
          { error: 'Phone number already in use' },
          { status: 409 }
        );
      }
    }

    // Handle CV upload
    let cvPath = existingFaculty.cv;
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

      // Delete old CV if exists
      if (existingFaculty.cv) {
        const oldCvPath = path.join(
          process.cwd(),
          'public',
          existingFaculty.cv
        );
        try {
          await unlink(oldCvPath);
        } catch (err) {
          console.error('Error deleting old CV:', err);
        }
      }

      const bytes = await cv.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 8);
      const sanitizedName = cv.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filename = `faculty-${timestamp}-${randomString}-${sanitizedName}`;
      const uploadDir = path.join(process.cwd(), 'public/uploads/faculty');

      const filepath = path.join(uploadDir, filename);
      await writeFile(filepath, buffer);
      cvPath = `/uploads/faculty/${filename}`;
    }

    // Update faculty and user in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update user if email changed
      if (email && email !== existingFaculty.email) {
        await tx.user.update({
          where: { id: existingFaculty.userId },
          data: {
            name: name?.trim() || existingFaculty.name,
            email: email.trim().toLowerCase(),
            phone: phone?.trim() || existingFaculty.phone,
            address: address || null,
          },
        });
      } else if (name || phone !== undefined || address !== undefined) {
        const userUpdateData = {};
        if (name) userUpdateData.name = name.trim();
        if (phone !== undefined) userUpdateData.phone = phone?.trim() || null;
        if (address !== undefined) userUpdateData.address = address || null;

        if (Object.keys(userUpdateData).length > 0) {
          await tx.user.update({
            where: { id: existingFaculty.userId },
            data: userUpdateData,
          });
        }
      }

      // Update faculty
      const facultyUpdateData = {};
      if (name) facultyUpdateData.name = name.trim();
      if (email) facultyUpdateData.email = email.trim().toLowerCase();
      if (phone !== undefined) facultyUpdateData.phone = phone?.trim() || null;
      if (address !== undefined) facultyUpdateData.address = address || null;
      if (joinedDate) facultyUpdateData.joinedDate = new Date(joinedDate);
      if (designation !== undefined)
        facultyUpdateData.designation = designation || null;
      if (qualification !== undefined)
        facultyUpdateData.qualification = qualification || null;
      if (specialization !== undefined)
        facultyUpdateData.specialization = specialization || null;
      if (status) facultyUpdateData.status = status;
      if (cvPath !== existingFaculty.cv) facultyUpdateData.cv = cvPath;

      const updatedFaculty = await tx.faculty.update({
        where: { id: facultyId },
        data: facultyUpdateData,
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

      return updatedFaculty;
    });

    return NextResponse.json({
      faculty: formatFacultyResponse(result),
      message: 'Faculty updated successfully',
    });
  } catch (error) {
    console.error('Error updating faculty:', error);
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

    const canDeleteFaculty = await hasPermission(
      session.user.id,
      'faculty',
      'delete'
    );
    if (!canDeleteFaculty) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to delete faculty' },
        { status: 403 }
      );
    }

    const resolvedParams = await params;
    const { id } = resolvedParams;

    const facultyId = parseInt(id);
    if (isNaN(facultyId)) {
      return NextResponse.json(
        { error: 'Invalid faculty ID' },
        { status: 400 }
      );
    }

    const faculty = await prisma.faculty.findUnique({
      where: { id: facultyId },
      include: { user: true },
    });

    if (!faculty) {
      return NextResponse.json({ error: 'Faculty not found' }, { status: 404 });
    }

    // Delete CV if exists
    if (faculty.cv) {
      const cvPath = path.join(process.cwd(), 'public', faculty.cv);
      try {
        await unlink(cvPath);
      } catch (err) {
        console.error('Error deleting CV:', err);
      }
    }

    // Delete faculty and user in transaction
    await prisma.$transaction(async (tx) => {
      await tx.faculty.delete({
        where: { id: facultyId },
      });

      await tx.user.delete({
        where: { id: faculty.userId },
      });
    });

    return NextResponse.json({
      message: 'Faculty deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting faculty:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
