// app/api/batches/[id]/students/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Helper function to check permissions
async function hasPermission(session, resource, action) {
  if (!session || !session.user) return false;

  const hasAdminRole = session.user.roles?.some((r) => {
    const roleName = typeof r === 'string' ? r : r.name;
    return ['SYSTEM_ADMIN', 'ADMIN', 'SUPER_ADMIN'].includes(roleName);
  });

  if (hasAdminRole) return true;

  let permissions = session.user.permissions || [];

  if (permissions.length > 0 && typeof permissions[0] === 'object') {
    return permissions.some(
      (p) => p.resource === resource && p.action === action
    );
  }

  const permissionString = `${resource}:${action}`;
  return permissions.includes(permissionString);
}

// GET /api/batches/[id]/students
export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canRead = await hasPermission(session, 'students', 'read');
    if (!canRead) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: idParam } = await params;
    const batchId = parseInt(idParam);

    if (isNaN(batchId)) {
      return NextResponse.json({ error: 'Invalid batch ID' }, { status: 400 });
    }

    // Check if batch exists
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
    });

    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    // Get active students for this batch
    const students = await prisma.student.findMany({
      where: {
        batchId: batchId,
        status: 'active', // Only active students
      },
      select: {
        id: true,
        name: true,
        email: true,
        rollNo: true,
        enrollmentNo: true,
        phone: true,
        status: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Format the response
    const formattedStudents = students.map((student) => ({
      id: Number(student.id),
      name: student.name || 'Unknown Student',
      email: student.email || '',
      rollNo: student.rollNo || '-',
      enrollmentNo: student.enrollmentNo || null,
      phone: student.phone || '',
      status: student.status,
    }));

    return NextResponse.json({
      students: formattedStudents,
      total: formattedStudents.length,
      batchId: batchId,
      batchName: batch.name,
    });
  } catch (error) {
    console.error('Error fetching batch students:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}
