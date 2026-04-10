import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Helper function to check if user has permission
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

export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission
    const canManagePermissions = await hasPermission(
      session.user.id,
      'permissions',
      'manage'
    );
    if (!canManagePermissions) {
      return NextResponse.json(
        {
          error: 'Forbidden: You do not have permission to manage permissions',
        },
        { status: 403 }
      );
    }

    const { id } = await params;
    const roleId = parseInt(id);

    if (isNaN(roleId)) {
      return NextResponse.json({ error: 'Invalid role ID' }, { status: 400 });
    }

    const body = await request.json();
    const { permissionIds } = body;

    if (!permissionIds || !Array.isArray(permissionIds)) {
      return NextResponse.json(
        { error: 'Invalid permission IDs' },
        { status: 400 }
      );
    }

    // Check if role exists
    const role = await prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    // Delete all existing role-permission associations
    await prisma.rolePermission.deleteMany({
      where: { roleId: roleId },
    });

    // Create new associations
    if (permissionIds.length > 0) {
      const rolePermissions = permissionIds.map((permissionId) => ({
        roleId: roleId,
        permissionId: permissionId,
      }));

      await prisma.rolePermission.createMany({
        data: rolePermissions,
      });
    }

    // Fetch the updated role with permissions
    const updatedRole = await prisma.role.findUnique({
      where: { id: roleId },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    return NextResponse.json({
      id: updatedRole.id,
      name: updatedRole.name,
      description: updatedRole.description,
      permissions: updatedRole.permissions.map((rp) => ({
        id: rp.permission.id,
        name: rp.permission.name,
        description: rp.permission.description,
        resource: rp.permission.resource,
        action: rp.permission.action,
      })),
    });
  } catch (error) {
    console.error('Error updating role permissions:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
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
      },
    });

    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    const permissions = role.permissions.map((rp) => ({
      id: rp.permission.id,
      name: rp.permission.name,
      description: rp.permission.description,
      resource: rp.permission.resource,
      action: rp.permission.action,
    }));

    return NextResponse.json({ permissions });
  } catch (error) {
    console.error('Error fetching role permissions:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}
