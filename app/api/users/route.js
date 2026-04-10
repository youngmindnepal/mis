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

export async function GET(request) {
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

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status');
    const role = searchParams.get('role');

    const skip = (page - 1) * limit;
    const where = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status && status !== 'all') {
      where.status = status;
    }

    if (role && role !== 'all') {
      where.role = {
        name: role,
      };
    }

    const users = await prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
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

    const total = await prisma.user.count({ where });

    // Format all users consistently
    const formattedUsers = users.map(formatUserResponse);

    return NextResponse.json({
      users: formattedUsers,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit,
      },
    });
  } catch (error) {
    console.error('Error fetching users:', error);
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

    const canCreateUsers = await hasPermission(
      session.user.id,
      'users',
      'create'
    );
    if (!canCreateUsers) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to create users' },
        { status: 403 }
      );
    }

    const formData = await request.formData();

    const name = formData.get('name');
    const email = formData.get('email');
    const password = formData.get('password');
    const phone = formData.get('phone');
    const address = formData.get('address');
    const status = formData.get('status') || 'active';
    const roleId = formData.get('roleId');
    const profilePicture = formData.get('profilePicture');

    const missingFields = [];
    if (!name) missingFields.push('name');
    if (!email) missingFields.push('email');
    if (!password) missingFields.push('password');
    if (!roleId) missingFields.push('roleId');

    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    let profilePictureUrl = null;
    if (profilePicture && profilePicture.size > 0) {
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 8);
      const extension = path.extname(profilePicture.name);
      const fileName = `user-${timestamp}-${randomString}${extension}`;

      const uploadDir = path.join(process.cwd(), 'public/uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const uploadPath = path.join(uploadDir, fileName);
      const bytes = await profilePicture.arrayBuffer();
      const buffer = Buffer.from(bytes);
      fs.writeFileSync(uploadPath, buffer);

      profilePictureUrl = `/uploads/${fileName}`;
    }

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phone: phone || null,
        address: address || null,
        status,
        profilePicture: profilePictureUrl,
        roleId: parseInt(roleId),
      },
      include: {
        role: true,
      },
    });

    // Return formatted user
    return NextResponse.json(formatUserResponse(user), { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
