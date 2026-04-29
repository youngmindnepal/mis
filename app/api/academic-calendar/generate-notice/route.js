// app/api/academic-calendar/generate-notice/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { calendarId, noticeType, examType } = body;

    if (!calendarId || !noticeType) {
      return NextResponse.json(
        { error: 'Calendar ID and notice type are required' },
        { status: 400 }
      );
    }

    // Get the calendar event
    const event = await prisma.academicCalendar.findUnique({
      where: { id: parseInt(calendarId) },
      include: {
        batch: { include: { department: true } },
        notices: true,
      },
    });

    if (!event) {
      return NextResponse.json(
        { error: 'Calendar event not found' },
        { status: 404 }
      );
    }

    // Check for existing notice
    const existingNotice = await prisma.calendarNotice.findFirst({
      where: {
        calendarId: parseInt(calendarId),
        noticeType: noticeType,
      },
    });

    if (existingNotice) {
      return NextResponse.json({
        success: true,
        message: 'Notice already exists',
        notice: existingNotice,
      });
    }

    // Format date
    const eventDate = event.date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const collegeName = 'AdmissionGuru College';
    const semesterDisplay = event.semester
      ? event.semester.replace('semester', 'Semester ')
      : '';
    const batchName = event.batch?.name || '';

    // Generate notice content
    let title = '';
    let content = '';

    switch (noticeType) {
      case 'holiday_notice':
        title = `Holiday Notice - ${eventDate}`;
        content = generateHolidayNotice(
          eventDate,
          event.description,
          collegeName
        );
        break;
      case 'exam_notice':
        const examName = examType || 'Examination';
        title = `${examName} Notice - ${eventDate}`;
        content = generateExamNotice(
          eventDate,
          examName,
          semesterDisplay,
          batchName,
          collegeName
        );
        break;
      case 'result_notice':
        title = `Result Publication Notice - ${eventDate}`;
        content = generateResultNotice(
          eventDate,
          semesterDisplay,
          batchName,
          collegeName
        );
        break;
      case 'class_start_notice':
        title = `Class Commencement Notice - ${eventDate}`;
        content = generateClassStartNotice(
          eventDate,
          semesterDisplay,
          batchName,
          collegeName
        );
        break;
      default:
        title = `Notice - ${eventDate}`;
        content = generateGeneralNotice(
          eventDate,
          event.description,
          collegeName
        );
    }

    // Save notice
    const notice = await prisma.calendarNotice.create({
      data: {
        calendarId: parseInt(calendarId),
        noticeType,
        title,
        content,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Notice generated successfully',
      notice,
    });
  } catch (error) {
    console.error('Error generating notice:', error);
    return NextResponse.json(
      { error: 'Failed to generate notice', details: error.message },
      { status: 500 }
    );
  }
}

// Notice generators
function generateHolidayNotice(date, description, collegeName) {
  return `HOLIDAY NOTICE\n\nDate: ${date}\n\nThis is to inform all students, faculty members, and staff that the college will remain closed on ${date} on account of "${description}".\n\nAll academic and administrative activities will remain suspended on this day.\n\nThe college will resume its normal schedule on the next working day.\n\nIssued by:\nThe Principal\n${collegeName}`;
}

function generateExamNotice(date, examName, semester, batch, collegeName) {
  return `EXAMINATION NOTICE\n\nDate: ${date}\nExam: ${examName}\n${
    semester ? `Semester: ${semester}\n` : ''
  }${
    batch ? `Batch: ${batch}\n` : ''
  }\nThis is to inform all concerned students that the ${examName} will commence from ${date}.\n\nAll students are instructed to:\n1. Collect Admit Cards from the Examination Department\n2. Be present at the examination hall 30 minutes before scheduled time\n3. Carry Admit Card and College ID Card\n4. Follow all examination rules strictly\n\nFor detailed schedule, contact the Examination Department.\n\nIssued by:\nExamination Controller\n${collegeName}`;
}

function generateResultNotice(date, semester, batch, collegeName) {
  return `RESULT PUBLICATION NOTICE\n\nDate: ${date}\n${
    semester ? `Semester: ${semester}\n` : ''
  }${
    batch ? `Batch: ${batch}\n` : ''
  }\nThis is to inform all students that results for the ${
    semester || 'recent'
  } examination will be published on ${date}.\n\nStudents can check results on the college website or notice board.\n\nFor queries, contact the Examination Department within 7 days.\n\nIssued by:\nExamination Controller\n${collegeName}`;
}

function generateClassStartNotice(date, semester, batch, collegeName) {
  return `CLASS COMMENCEMENT NOTICE\n\nDate: ${date}\n${
    semester ? `Semester: ${semester}\n` : ''
  }${
    batch ? `Batch: ${batch}\n` : ''
  }\nThis is to inform all students that regular classes for ${
    semester || 'the new semester'
  } will commence from ${date}.\n\nAll students are required to complete registration before the start date.\n\nWe wish all students a successful semester!\n\nIssued by:\nAcademic Dean\n${collegeName}`;
}

function generateGeneralNotice(date, description, collegeName) {
  return `NOTICE\n\nDate: ${date}\n\n${description}\n\nFor any queries, contact the Administration Office.\n\nIssued by:\nAdministration\n${collegeName}`;
}
