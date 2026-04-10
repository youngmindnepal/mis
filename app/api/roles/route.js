import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Helper function to check if user has a specific permission
async function hasPermission(userId, resource, action) {
  try {
    // First, get the user with their role directly
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: true,
      },
    });

    if (!user) return false;

    // Check if user has SYSTEM_ADMIN role directly
    if (user.role?.name === 'SYSTEM_ADMIN') {
      console.log(`User ${user.email} is SYSTEM_ADMIN, granting full access`);
      return true;
    }

    // If not SYSTEM_ADMIN, check for specific permission through role
    const roleWithPermissions = await prisma.role.findUnique({
      where: { id: user.roleId },
      include: {
        permissions: {
          // Changed from rolePermissions to permissions
          include: {
            permission: true,
          },
        },
      },
    });

    if (!roleWithPermissions) return false;

    const hasRequiredPermission = roleWithPermissions.permissions.some(
      (rp) =>
        rp.permission.resource === resource && rp.permission.action === action
    );

    console.log(
      `Permission check for ${resource}:${action}: ${hasRequiredPermission}`
    );
    return hasRequiredPermission;
  } catch (error) {
    console.error('Error checking permission:', error);
    return false;
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    console.log('Session in GET /api/roles:', session?.user?.email);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user with role directly
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        role: true,
      },
    });

    console.log('User found:', user?.email, 'Role:', user?.role?.name);

    // Check if user has SYSTEM_ADMIN role directly (bypass permission check)
    const isSystemAdmin = user?.role?.name === 'SYSTEM_ADMIN';

    if (!isSystemAdmin) {
      // Only check for specific permission if not SYSTEM_ADMIN
      const canReadRoles = await hasPermission(
        session.user.id,
        'roles',
        'read'
      );

      if (!canReadRoles) {
        return NextResponse.json(
          { error: 'Forbidden: You do not have permission to view roles' },
          { status: 403 }
        );
      }
    }

    // Fetch roles with correct include relations
    const roles = await prisma.role.findMany({
      include: {
        permissions: {
          // Changed from rolePermissions to permissions
          include: {
            permission: true,
          },
        },
        users: {
          // Changed from userRoles to users (direct relation)
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const transformedRoles = roles.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
      permissions: role.permissions.map((rp) => ({
        id: rp.permission.id,
        name: rp.permission.name,
        description: rp.permission.description,
        resource: rp.permission.resource,
        action: rp.permission.action,
      })),
      menus: [], // You'll need to add menu relation if you have a Menu model
      _count: {
        users: role.users.length,
      },
    }));

    return NextResponse.json(transformedRoles);
  } catch (error) {
    console.error('Error fetching roles:', error);
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

    // Get user with role directly
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        role: true,
      },
    });

    // Check if user has SYSTEM_ADMIN role directly
    const isSystemAdmin = user?.role?.name === 'SYSTEM_ADMIN';

    if (!isSystemAdmin) {
      const canCreateRoles = await hasPermission(
        session.user.id,
        'roles',
        'create'
      );

      if (!canCreateRoles) {
        return NextResponse.json(
          { error: 'Forbidden: You do not have permission to create roles' },
          { status: 403 }
        );
      }
    }

    const { name, description } = await request.json();

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Role name is required' },
        { status: 400 }
      );
    }

    const existingRole = await prisma.role.findUnique({
      where: { name: name.toUpperCase() },
    });

    if (existingRole) {
      return NextResponse.json(
        { error: 'Role already exists' },
        { status: 400 }
      );
    }

    const role = await prisma.role.create({
      data: {
        name: name.toUpperCase(),
        description: description || null,
      },
    });

    return NextResponse.json(role, { status: 201 });
  } catch (error) {
    console.error('Error creating role:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}
