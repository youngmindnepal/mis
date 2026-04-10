import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import fs from 'fs';
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

// Helper function to format user response consistently
function formatUserResponse(user) {
  const { password, ...userWithoutPassword } = user;

  return {
    ...userWithoutPassword,
    roles: user.role
      ? [
          {
            id: user.role.id,
            name: user.role.name,
            description: user.role.description,
          },
        ]
      : [],
  };
}

async function deleteOldProfilePicture(imageUrl) {
  try {
    if (!imageUrl || imageUrl === '/default-avatar.png') {
      return;
    }

    const cleanPath = imageUrl.startsWith('/') ? imageUrl.slice(1) : imageUrl;
    const filePath = path.join(process.cwd(), 'public', cleanPath);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error('Error deleting profile picture:', error);
  }
}

async function uploadImage(file, userId) {
  try {
    if (!file || file.size === 0) {
      return null;
    }

    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const extension = path.extname(file.name);
    const fileName = `user-${userId}-${timestamp}-${randomString}${extension}`;

    const uploadDir = path.join(process.cwd(), 'public/uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const uploadPath = path.join(uploadDir, fileName);
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    fs.writeFileSync(uploadPath, buffer);

    return `/uploads/${fileName}`;
  } catch (error) {
    console.error('Error uploading image:', error);
    return null;
  }
}

export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canReadUsers = await hasPermission(session.user.id, 'users', 'read');
    if (!canReadUsers) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to view users' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const userId = parseInt(id);

    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Return formatted user
    return NextResponse.json(formatUserResponse(user));
  } catch (error) {
    console.error('Error fetching user:', error);
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

    const canUpdateUsers = await hasPermission(
      session.user.id,
      'users',
      'update'
    );
    if (!canUpdateUsers) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to update users' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const userId = parseInt(id);

    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const formData = await request.formData();

    const name = formData.get('name');
    const email = formData.get('email');
    const password = formData.get('password');
    const phone = formData.get('phone');
    const address = formData.get('address');
    const status = formData.get('status');
    const roleId = formData.get('roleId');
    const profilePicture = formData.get('profilePicture');
    const removeImage = formData.get('removeImage') === 'true';

    if (email && email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email },
      });
      if (emailExists) {
        return NextResponse.json(
          { error: 'Email already in use by another user' },
          { status: 400 }
        );
      }
    }

    const updateData = {};

    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone || null;
    if (address !== undefined) updateData.address = address || null;
    if (status) updateData.status = status;
    if (roleId) updateData.roleId = parseInt(roleId);

    if (password && password.trim() !== '') {
      if (password.length < 6) {
        return NextResponse.json(
          { error: 'Password must be at least 6 characters' },
          { status: 400 }
        );
      }
      updateData.password = await bcrypt.hash(password, 10);
    }

    if (removeImage) {
      if (existingUser.profilePicture) {
        await deleteOldProfilePicture(existingUser.profilePicture);
      }
      updateData.profilePicture = null;
    } else if (profilePicture && profilePicture.size > 0) {
      if (existingUser.profilePicture) {
        await deleteOldProfilePicture(existingUser.profilePicture);
      }
      const newProfilePicture = await uploadImage(profilePicture, userId);
      if (newProfilePicture) {
        updateData.profilePicture = newProfilePicture;
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      include: {
        role: true,
      },
    });

    // Return formatted user
    return NextResponse.json(formatUserResponse(updatedUser));
  } catch (error) {
    console.error('Error updating user:', error);
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

    const canDeleteUsers = await hasPermission(
      session.user.id,
      'users',
      'delete'
    );
    if (!canDeleteUsers) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to delete users' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const userId = parseInt(id);

    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    if (userId === session.user.id) {
      return NextResponse.json(
        { error: 'You cannot delete your own account' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.profilePicture) {
      await deleteOldProfilePicture(user.profilePicture);
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
