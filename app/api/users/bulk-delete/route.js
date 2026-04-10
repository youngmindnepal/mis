import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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

async function deleteProfilePicture(imageUrl) {
  try {
    if (!imageUrl || imageUrl === '/default-avatar.png') {
      return;
    }

    const fs = require('fs');
    const path = require('path');

    const cleanPath = imageUrl.startsWith('/') ? imageUrl.slice(1) : imageUrl;
    const filePath = path.join(process.cwd(), 'public', cleanPath);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error('Error deleting profile picture:', error);
  }
}

export async function POST(request) {
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

    const { userIds } = await request.json();

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: 'Invalid user IDs provided' },
        { status: 400 }
      );
    }

    const filteredUserIds = userIds.filter((id) => id !== session.user.id);

    if (filteredUserIds.length === 0) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    const usersToDelete = await prisma.user.findMany({
      where: {
        id: { in: filteredUserIds },
      },
      select: {
        id: true,
        profilePicture: true,
      },
    });

    for (const user of usersToDelete) {
      if (user.profilePicture) {
        await deleteProfilePicture(user.profilePicture);
      }
    }

    const deletedUsers = await prisma.user.deleteMany({
      where: {
        id: { in: filteredUserIds },
      },
    });

    return NextResponse.json({
      message: `${deletedUsers.count} user(s) deleted successfully`,
      deletedCount: deletedUsers.count,
    });
  } catch (error) {
    console.error('Error bulk deleting users:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
