// app/api/students/sync-enrollments/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  bulkSyncAllStudentEnrollments,
  syncStudentEnrollments,
} from '@/lib/syncStudentEnrollments';

async function hasPermission(userId, resource, action) {
  // ... (same permission checking function)
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canUpdateStudents = await hasPermission(
      session.user.id,
      'students',
      'update'
    );
    if (!canUpdateStudents) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { studentId } = await request.json();

    if (studentId) {
      // Sync single student
      const result = await syncStudentEnrollments(parseInt(studentId));
      return NextResponse.json(result);
    } else {
      // Bulk sync all students
      const result = await bulkSyncAllStudentEnrollments();
      return NextResponse.json(result);
    }
  } catch (error) {
    console.error('Error syncing enrollments:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
