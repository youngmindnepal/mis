// app/api/exams/send-schedule/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import nodemailer from 'nodemailer';

// Configure email transporter (update with your email service)
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Allowed roles
const ALLOWED_ROLES = [
  'TEACHER',
  'COORDINATOR',
  'ADMIN',
  'SYSTEM_ADMIN',
  'SUPER_ADMIN',
];

// POST /api/exams/send-schedule
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user with role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { role: true },
    });

    if (!user || !user.role || !ALLOWED_ROLES.includes(user.role.name)) {
      return NextResponse.json(
        { error: 'Forbidden - You do not have permission to send emails' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { groupName, recipients } = body;

    if (!groupName) {
      return NextResponse.json(
        { error: 'Group name is required' },
        { status: 400 }
      );
    }

    // Fetch all exams with the given name
    const exams = await prisma.exam.findMany({
      where: { name: groupName },
      include: {
        examType: true,
        batch: true,
        classroom: true,
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });

    if (exams.length === 0) {
      return NextResponse.json(
        { error: 'No exams found for this group' },
        { status: 404 }
      );
    }

    const batchId = exams[0]?.batchId;
    const classroomIds = [
      ...new Set(exams.map((e) => e.classroomId).filter(Boolean)),
    ];

    // Collect email addresses based on recipient type
    let emailAddresses = [];

    if (recipients === 'students' || recipients === 'both') {
      const students = await prisma.student.findMany({
        where: {
          batchId: batchId,
          status: 'active',
          email: { not: null },
        },
        select: { email: true, name: true },
      });
      emailAddresses.push(
        ...students.map((s) => ({ email: s.email, name: s.name }))
      );
    }

    if (recipients === 'faculty' || recipients === 'both') {
      const faculty = await prisma.faculty.findMany({
        where: {
          classrooms: { some: { id: { in: classroomIds } } },
          email: { not: null },
        },
        select: { email: true, name: true },
      });
      emailAddresses.push(
        ...faculty.map((f) => ({ email: f.email, name: f.name }))
      );
    }

    if (
      recipients !== 'students' &&
      recipients !== 'faculty' &&
      recipients !== 'both'
    ) {
      // Custom email(s) - split by comma
      const customEmails = recipients
        .split(',')
        .map((e) => e.trim())
        .filter((e) => e);
      emailAddresses = customEmails.map((email) => ({ email, name: '' }));
    }

    // Remove duplicates
    const uniqueEmails = [
      ...new Map(emailAddresses.map((item) => [item.email, item])).values(),
    ];

    if (uniqueEmails.length === 0) {
      return NextResponse.json(
        { error: 'No valid email addresses found' },
        { status: 400 }
      );
    }

    // Generate HTML table for the schedule
    const scheduleHtml = generateScheduleHtml(exams, groupName);

    // Send emails
    const emailPromises = uniqueEmails.map(({ email, name }) => {
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@mis.edu',
        to: email,
        subject: `Exam Schedule: ${groupName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
            <h2 style="color: #1a56db;">Exam Schedule: ${groupName}</h2>
            <p>Dear ${name || 'Recipient'},</p>
            <p>Please find the exam schedule for <strong>${groupName}</strong> below:</p>
            ${scheduleHtml}
            <p style="margin-top: 20px;">Best regards,<br>Examination Department</p>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 12px;">This is an automated message. Please do not reply to this email.</p>
          </div>
        `,
      };
      return transporter.sendMail(mailOptions);
    });

    await Promise.all(emailPromises);

    return NextResponse.json({
      message: `Schedule sent successfully to ${uniqueEmails.length} recipient(s)`,
      recipientCount: uniqueEmails.length,
    });
  } catch (error) {
    console.error('Error sending schedule email:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}

// Helper function to generate HTML table from exams
function generateScheduleHtml(exams, groupName) {
  // Group exams by date
  const examsByDate = {};
  exams.forEach((exam) => {
    const dateKey = exam.date
      ? new Date(exam.date).toISOString().split('T')[0]
      : 'No Date';
    if (!examsByDate[dateKey]) {
      examsByDate[dateKey] = [];
    }
    examsByDate[dateKey].push(exam);
  });

  const formatDate = (date) => {
    if (!date) return 'No Date';
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (time) => {
    if (!time) return '--:--';
    return new Date(time).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  let html = `
    <div style="margin: 20px 0;">
      <p><strong>Batch:</strong> ${exams[0]?.batch?.name || 'N/A'}</p>
      <p><strong>Exam Type:</strong> ${exams[0]?.examType?.name || 'N/A'}</p>
      <p><strong>Total Classrooms:</strong> ${
        new Set(exams.map((e) => e.classroomId)).size
      }</p>
    </div>
    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
      <thead>
        <tr style="background-color: #f3f4f6;">
          <th style="padding: 10px; border: 1px solid #d1d5db; text-align: left;">Date</th>
          <th style="padding: 10px; border: 1px solid #d1d5db; text-align: left;">Time</th>
          <th style="padding: 10px; border: 1px solid #d1d5db; text-align: left;">Classroom</th>
          <th style="padding: 10px; border: 1px solid #d1d5db; text-align: left;">Capacity</th>
          <th style="padding: 10px; border: 1px solid #d1d5db; text-align: left;">Status</th>
        </tr>
      </thead>
      <tbody>
  `;

  const sortedDates = Object.keys(examsByDate).sort();

  sortedDates.forEach((dateKey) => {
    const dateExams = examsByDate[dateKey];
    dateExams.sort((a, b) => {
      if (!a.startTime || !b.startTime) return 0;
      return new Date(a.startTime) - new Date(b.startTime);
    });

    dateExams.forEach((exam, index) => {
      const displayStatus =
        exam.status === 'result_published'
          ? 'Published'
          : exam.status.charAt(0).toUpperCase() + exam.status.slice(1);
      const rowStyle =
        index % 2 === 0
          ? 'background-color: #ffffff;'
          : 'background-color: #f9fafb;';

      html += `
        <tr style="${rowStyle}">
          <td style="padding: 8px; border: 1px solid #d1d5db;">${formatDate(
            exam.date
          )}</td>
          <td style="padding: 8px; border: 1px solid #d1d5db;">${formatTime(
            exam.startTime
          )} - ${formatTime(exam.endTime)}</td>
          <td style="padding: 8px; border: 1px solid #d1d5db;">${
            exam.classroom?.name || 'N/A'
          }</td>
          <td style="padding: 8px; border: 1px solid #d1d5db;">${
            exam.classroom?.capacity || 'N/A'
          }</td>
          <td style="padding: 8px; border: 1px solid #d1d5db;">${displayStatus}</td>
        </tr>
      `;
    });
  });

  html += `
      </tbody>
    </table>
  `;

  return html;
}
