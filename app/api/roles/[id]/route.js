import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Helper function to check if user has a specific permission
async function hasPermission(userId, resource, action) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: true,
      },
    });

    if (!user) return false;

    if (user.role?.name === 'SYSTEM_ADMIN') {
      return true;
    }

    const roleWithPermissions = await prisma.role.findUnique({
      where: { id: user.roleId },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!roleWithPermissions) return false;

    return roleWithPermissions.permissions.some(
      (rp) =>
        rp.permission.resource === resource && rp.permission.action === action
    );
  } catch (error) {
    console.error('Error checking permission:', error);
    return false;
  }
}

export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const roleId = parseInt(id);

    if (isNaN(roleId)) {
      return NextResponse.json({ error: 'Invalid role ID' }, { status: 400 });
    }

    const role = await prisma.role.findUnique({
      where: { id: roleId },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        users: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    const transformedRole = {
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
      menus: [],
      _count: {
        users: role.users.length,
      },
    };

    return NextResponse.json(transformedRole);
  } catch (error) {
    console.error('Error fetching role:', error);
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

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { role: true },
    });

    const isSystemAdmin = user?.role?.name === 'SYSTEM_ADMIN';

    if (!isSystemAdmin) {
      const canUpdateRoles = await hasPermission(
        session.user.id,
        'roles',
        'update'
      );
      if (!canUpdateRoles) {
        return NextResponse.json(
          { error: 'Forbidden: You do not have permission to update roles' },
          { status: 403 }
        );
      }
    }

    const { id } = await params;
    const roleId = parseInt(id);

    if (isNaN(roleId)) {
      return NextResponse.json({ error: 'Invalid role ID' }, { status: 400 });
    }

    const { name, description } = await request.json();

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Role name is required' },
        { status: 400 }
      );
    }

    const existingRole = await prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!existingRole) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    if (name.toUpperCase() !== existingRole.name) {
      const nameConflict = await prisma.role.findUnique({
        where: { name: name.toUpperCase() },
      });

      if (nameConflict) {
        return NextResponse.json(
          { error: 'Role with this name already exists' },
          { status: 400 }
        );
      }
    }

    const role = await prisma.role.update({
      where: { id: roleId },
      data: {
        name: name.toUpperCase(),
        description: description || null,
      },
    });

    return NextResponse.json(role);
  } catch (error) {
    console.error('Error updating role:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
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

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { role: true },
    });

    const isSystemAdmin = user?.role?.name === 'SYSTEM_ADMIN';

    if (!isSystemAdmin) {
      const canDeleteRoles = await hasPermission(
        session.user.id,
        'roles',
        'delete'
      );
      if (!canDeleteRoles) {
        return NextResponse.json(
          { error: 'Forbidden: You do not have permission to delete roles' },
          { status: 403 }
        );
      }
    }

    const { id } = await params;
    const roleId = parseInt(id);

    if (isNaN(roleId)) {
      return NextResponse.json({ error: 'Invalid role ID' }, { status: 400 });
    }

    const role = await prisma.role.findUnique({
      where: { id: roleId },
      include: {
        users: true,
      },
    });

    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    if (role.name === 'SYSTEM_ADMIN') {
      return NextResponse.json(
        { error: 'Cannot delete SYSTEM_ADMIN role' },
        { status: 400 }
      );
    }

    if (role.users.length > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete role with ${role.users.length} assigned user(s). Reassign users first.`,
        },
        { status: 400 }
      );
    }

    await prisma.role.delete({
      where: { id: roleId },
    });

    return NextResponse.json({ message: 'Role deleted successfully' });
  } catch (error) {
    console.error('Error deleting role:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}
