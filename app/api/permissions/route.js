import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET - Fetch all permissions
export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
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

    const permissions = await prisma.permission.findMany({
      include: {
        roles: {
          select: {
            roleId: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    const permissionsWithCount = permissions.map((permission) => ({
      ...permission,
      _count: {
        roles: permission.roles.length,
      },
    }));

    return NextResponse.json(permissionsWithCount);
  } catch (error) {
    console.error('Error fetching permissions:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// POST - Create a new permission
export async function POST(req) {
  try {
    console.log('=== POST /api/permissions called ===');

    const session = await getServerSession(authOptions);
    console.log('Session:', session?.user?.email);

    if (!session) {
      console.log('No session found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the request body
    const body = await req.json();
    console.log('Received body:', JSON.stringify(body, null, 2));

    const { name, description, resource, action, category } = body;

    // Validate required fields
    if (!name) {
      console.log('Missing name field');
      return NextResponse.json(
        { error: 'Missing required field: name' },
        { status: 400 }
      );
    }

    if (!resource) {
      console.log('Missing resource field');
      return NextResponse.json(
        { error: 'Missing required field: resource' },
        { status: 400 }
      );
    }

    if (!action) {
      console.log('Missing action field');
      return NextResponse.json(
        { error: 'Missing required field: action' },
        { status: 400 }
      );
    }

    console.log(
      `Creating permission: ${name}, resource: ${resource}, action: ${action}`
    );

    // Check if permission already exists
    const existingPermission = await prisma.permission.findUnique({
      where: { name: name.toLowerCase() },
    });

    if (existingPermission) {
      console.log('Permission already exists:', name);
      return NextResponse.json(
        { error: 'Permission with this name already exists' },
        { status: 409 }
      );
    }

    // Create permission
    const permission = await prisma.permission.create({
      data: {
        name: name.toLowerCase(),
        description: description || null,
        resource: resource.toLowerCase(),
        action: action.toLowerCase(),
        category: category || 'General',
      },
    });

    console.log('Permission created successfully:', permission);
    return NextResponse.json(permission, { status: 201 });
  } catch (error) {
    console.error('=== ERROR in POST /api/permissions ===');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error.message,
        code: error.code,
      },
      { status: 500 }
    );
  }
}
