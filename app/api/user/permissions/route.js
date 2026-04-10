import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
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

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // For SYSTEM_ADMIN, return all permissions
    let permissions = [];

    if (user.role.name === 'SYSTEM_ADMIN') {
      // Get all permissions from the database
      const allPermissions = await prisma.permission.findMany();
      permissions = allPermissions.map((p) => `${p.resource}:${p.action}`);
    } else {
      // Get user's specific permissions
      permissions = user.role.permissions.map(
        (rp) => `${rp.permission.resource}:${rp.permission.action}`
      );
    }

    console.log(
      `Returning ${permissions.length} permissions for user ${user.email}`
    );

    return NextResponse.json({
      permissions,
      role: user.role.name,
    });
  } catch (error) {
    console.error('Error fetching user permissions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
