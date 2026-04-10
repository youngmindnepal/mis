import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET - Fetch all permissions (for default permissions)
export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all permissions from database
    const permissions = await prisma.permission.findMany({
      select: {
        resource: true,
        action: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Format permissions as strings
    const formattedPermissions = permissions.map(
      (p) => `${p.resource}:${p.action}`
    );

    return NextResponse.json({
      permissions: formattedPermissions,
      count: formattedPermissions.length,
    });
  } catch (error) {
    console.error('Error fetching all permissions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
