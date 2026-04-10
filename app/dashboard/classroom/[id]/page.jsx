// app/classrooms/[id]/page.jsx
import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import ClassroomDetailsClient from '@/components/classroom/ClassroomDetailsClient';
import * as Icons from 'lucide-react';

// Roles that have full access
const FULL_ACCESS_ROLES = ['SYSTEM_ADMIN', 'ADMIN', 'COORDINATOR'];

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

    if (!user || !user.role) {
      console.log('User or role not found');
      return false;
    }

    // Full access roles get all permissions
    if (FULL_ACCESS_ROLES.includes(user.role.name)) {
      console.log(`User has full access role: ${user.role.name}`);
      return true;
    }

    // Try both singular and plural forms of the resource
    const singularResource = resource.endsWith('s')
      ? resource.slice(0, -1)
      : resource;
    const pluralResource = resource.endsWith('s') ? resource : resource + 's';

    // Check for specific permission
    const hasRequiredPermission = user.role.permissions.some(
      (rp) =>
        (rp.permission.resource === resource ||
          rp.permission.resource === singularResource ||
          rp.permission.resource === pluralResource) &&
        rp.permission.action === action
    );

    // Check for manage permission on the resource
    const hasManagePermission = user.role.permissions.some(
      (rp) =>
        (rp.permission.resource === resource ||
          rp.permission.resource === singularResource ||
          rp.permission.resource === pluralResource) &&
        rp.permission.action === 'manage'
    );

    // Check for global manage permission
    const hasGlobalManage = user.role.permissions.some(
      (rp) =>
        rp.permission.resource === 'system' && rp.permission.action === 'manage'
    );

    const result =
      hasRequiredPermission || hasManagePermission || hasGlobalManage;

    console.log(`Permission check for ${resource}:${action}:`, {
      hasRequiredPermission,
      hasManagePermission,
      hasGlobalManage,
      result,
      userRole: user.role.name,
      permissions: user.role.permissions.map(
        (p) => `${p.permission.resource}:${p.permission.action}`
      ),
    });

    return result;
  } catch (error) {
    console.error('Error checking permission:', error);
    return false;
  }
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const classroom = await prisma.classroom.findUnique({
    where: { id: parseInt(id) },
    include: { course: true },
  });

  return {
    title: classroom
      ? `${classroom.name} | Classroom Details`
      : 'Classroom Not Found',
    description: classroom?.course?.name
      ? `View details and attendance for ${classroom.name} - ${classroom.course.name}`
      : 'Classroom details and attendance management',
  };
}

function LoadingState() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="animate-pulse space-y-6">
          <div className="h-10 bg-gray-200 rounded w-1/3"></div>
          <div className="h-40 bg-gray-200 rounded-xl"></div>
          <div className="h-96 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    </div>
  );
}

function AccessDenied({
  message = "You don't have permission to view this classroom",
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center max-w-md">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Icons.Lock size={32} className="text-red-600" />
        </div>
        <h2 className="text-2xl font-bold text-red-800 mb-2">Access Denied</h2>
        <p className="text-red-600">{message}</p>
        <Link
          href="/dashboard/classroom"
          className="mt-6 inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700"
        >
          <Icons.ArrowLeft size={18} />
          Back to Classrooms
        </Link>
      </div>
    </div>
  );
}

function NotEnrolled() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center bg-white rounded-2xl shadow-lg p-8 max-w-md">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Icons.AlertCircle size={32} className="text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h2>
        <p className="text-gray-600">You are not enrolled in this classroom.</p>
        <Link
          href="/dashboard/classroom"
          className="mt-6 inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700"
        >
          <Icons.ArrowLeft size={18} />
          Back to Classrooms
        </Link>
      </div>
    </div>
  );
}

export default async function ClassroomDetailsPage({ params }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    const classroomId = parseInt(id);

    if (!session) {
      redirect('/auth/signin');
    }

    // Check permission - use singular 'classroom'
    const canRead = await hasPermission(session.user.id, 'classroom', 'read');

    console.log(`User ${session.user.email} can read classroom: ${canRead}`);

    if (!canRead) {
      return <AccessDenied />;
    }

    const classroom = await prisma.classroom.findUnique({
      where: { id: classroomId },
      include: {
        course: true,
        faculty: true,
        batch: true,
        department: true,
        _count: {
          select: {
            enrollments: {
              where: { status: 'active' },
            },
            sessions: true,
          },
        },
      },
    });

    if (!classroom) {
      notFound();
    }

    const userWithRole = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { role: true },
    });

    const userRole = userWithRole?.role?.name;

    // Include COORDINATOR as teacher-equivalent role
    const isTeacher =
      userRole === 'TEACHER' ||
      userRole === 'ADMIN' ||
      userRole === 'SYSTEM_ADMIN' ||
      userRole === 'COORDINATOR';
    const isStudent = userRole === 'STUDENT';

    let studentId = null;

    if (isStudent) {
      const student = await prisma.student.findUnique({
        where: { userId: session.user.id },
      });

      if (student) {
        studentId = student.id;
        const isEnrolled = await prisma.classroomEnrollment.findUnique({
          where: {
            studentId_classroomId: {
              studentId: student.id,
              classroomId,
            },
          },
        });

        if (!isEnrolled) {
          return <NotEnrolled />;
        }
      }
    }

    // Fetch ONLY active enrollments
    const enrollments = await prisma.classroomEnrollment.findMany({
      where: {
        classroomId,
        status: 'active',
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            rollNo: true,
            status: true,
            profilePicture: true,
            enrollmentNo: true,
            dateOfBirth: true,
          },
        },
      },
      orderBy: {
        student: {
          rollNo: 'asc',
        },
      },
    });

    // Format enrolled students
    const enrolledStudents = enrollments.map((enrollment) => ({
      id: enrollment.student.id,
      name: enrollment.student.name || 'Unknown Student',
      email: enrollment.student.email || 'No email',
      phone: enrollment.student.phone || '',
      rollNumber: enrollment.student.rollNo || '-',
      rollNo: enrollment.student.rollNo || '-',
      status: enrollment.student.status,
      enrollmentStatus: enrollment.status,
      enrolledAt: enrollment.enrolledAt,
      profilePicture: enrollment.student.profilePicture,
    }));

    // Fetch attendance summaries for active enrollments only
    const attendanceSummaries = await prisma.attendanceSummary.findMany({
      where: {
        classroomId,
        studentId: { in: enrollments.map((e) => e.studentId) },
      },
      include: {
        student: {
          include: { user: true },
        },
      },
    });

    // Fetch sessions
    const sessions = await prisma.classSession.findMany({
      where: { classroomId },
      orderBy: { date: 'desc' },
      include: { attendances: true },
    });

    // Format attendance summaries
    const safeAttendanceSummaries = attendanceSummaries.map((s) => ({
      studentId: s.studentId,
      studentName: s.student.user?.name || s.student.name || 'Unknown Student',
      rollNumber: s.student.rollNo || '-',
      totalSessions: s.totalSessions || 0,
      presentCount: s.presentCount || 0,
      absentCount: s.absentCount || 0,
      lateCount: s.lateCount || 0,
      excusedCount: s.excusedCount || 0,
      percentage: s.percentage || 0,
    }));

    // Format sessions
    const safeSessions = sessions.map((s) => ({
      id: s.id,
      date: s.date,
      title: s.title || `Session on ${new Date(s.date).toLocaleDateString()}`,
      syllabusCovered: s.syllabusCovered || '',
      totalStudents: enrolledStudents.length,
      presentCount:
        s.attendances?.filter((a) => a?.status === 'present').length || 0,
      absentCount:
        s.attendances?.filter((a) => a?.status === 'absent').length || 0,
    }));

    const formattedClassroom = {
      ...classroom,
      id: classroom.id,
      enrolledStudents: enrolledStudents,
      attendanceSummaries: safeAttendanceSummaries,
      sessions: safeSessions,
    };

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Suspense fallback={<LoadingState />}>
            <ClassroomDetailsClient
              classroom={formattedClassroom}
              studentId={studentId}
              isTeacher={isTeacher}
            />
          </Suspense>
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error in ClassroomDetailsPage:', error);
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center max-w-2xl">
          <Icons.AlertTriangle
            size={48}
            className="text-red-600 mx-auto mb-4"
          />
          <h2 className="text-2xl font-bold text-red-800 mb-2">
            Something Went Wrong
          </h2>
          <p className="text-red-600 mb-4">
            {error.message || 'An unexpected error occurred'}
          </p>
          <Link
            href="/dashboard/classroom"
            className="mt-4 inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700"
          >
            <Icons.ArrowLeft size={18} />
            Back to Classrooms
          </Link>
        </div>
      </div>
    );
  }
}
