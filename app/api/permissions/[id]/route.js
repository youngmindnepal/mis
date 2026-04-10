import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET - Fetch a single permission by ID
export async function GET(req, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const permission = await prisma.permission.findUnique({
      where: { id: parseInt(id) },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!permission) {
      return NextResponse.json(
        { error: 'Permission not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(permission);
  } catch (error) {
    console.error('Error fetching permission:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update a permission
export async function PUT(req, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to update permissions
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

    const hasPermission = user.role.permissions.some(
      (rp) =>
        rp.permission.resource === 'permissions' &&
        rp.permission.action === 'update'
    );

    if (!hasPermission && user.role.name !== 'SYSTEM_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { name, description, resource, action, category } = body;

    // Validate required fields
    if (!name || !resource || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: name, resource, action' },
        { status: 400 }
      );
    }

    // Check if permission exists
    const existingPermission = await prisma.permission.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingPermission) {
      return NextResponse.json(
        { error: 'Permission not found' },
        { status: 404 }
      );
    }

    // Check if new name conflicts with another permission
    if (name !== existingPermission.name) {
      const nameConflict = await prisma.permission.findUnique({
        where: { name },
      });
      if (nameConflict) {
        return NextResponse.json(
          { error: 'Permission with this name already exists' },
          { status: 409 }
        );
      }
    }

    // Update permission
    const permission = await prisma.permission.update({
      where: { id: parseInt(id) },
      data: {
        name,
        description,
        resource,
        action,
        category,
      },
    });

    return NextResponse.json(permission);
  } catch (error) {
    console.error('Error updating permission:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a permission
export async function DELETE(req, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to delete permissions
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

    const hasPermission = user.role.permissions.some(
      (rp) =>
        rp.permission.resource === 'permissions' &&
        rp.permission.action === 'delete'
    );

    if (!hasPermission && user.role.name !== 'SYSTEM_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    // Check if permission exists
    const permission = await prisma.permission.findUnique({
      where: { id: parseInt(id) },
      include: {
        roles: true,
      },
    });

    if (!permission) {
      return NextResponse.json(
        { error: 'Permission not found' },
        { status: 404 }
      );
    }

    // Delete permission (RolePermission records will be cascade deleted)
    await prisma.permission.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({ message: 'Permission deleted successfully' });
  } catch (error) {
    console.error('Error deleting permission:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
