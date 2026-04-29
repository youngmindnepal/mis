// app/api/academic-calendar/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - Fetch calendar events
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    const month = searchParams.get('month');
    const eventType = searchParams.get('eventType');
    const batchId = searchParams.get('batchId');

    const where = {};

    // Filter by year/month
    if (year) {
      const yearNum = parseInt(year);
      const monthNum = month ? parseInt(month) : null;

      if (monthNum !== null) {
        // Specific month
        const startDate = new Date(yearNum, monthNum, 1);
        const endDate = new Date(yearNum, monthNum + 1, 0, 23, 59, 59, 999);
        where.date = { gte: startDate, lte: endDate };
      } else {
        // Entire year
        const startDate = new Date(yearNum, 0, 1);
        const endDate = new Date(yearNum, 11, 31, 23, 59, 59, 999);
        where.date = { gte: startDate, lte: endDate };
      }
    }

    // Filter by event type
    if (eventType) {
      where.eventType = eventType;
    }

    // Filter by batch
    if (batchId) {
      where.batchId = parseInt(batchId);
    }

    const events = await prisma.academicCalendar.findMany({
      where,
      include: {
        batch: {
          select: { id: true, name: true },
        },
        notices: {
          select: {
            id: true,
            noticeType: true,
            title: true,
            generatedAt: true,
          },
          orderBy: { generatedAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { date: 'asc' },
    });

    return NextResponse.json({
      success: true,
      events,
      count: events.length,
    });
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events', details: error.message },
      { status: 500 }
    );
  }
}

// POST - Create calendar event
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { date, eventType, description, semester, batchId } = body;

    // Validate required fields
    if (!date || !eventType || !description) {
      return NextResponse.json(
        { error: 'Date, event type, and description are required' },
        { status: 400 }
      );
    }

    // Validate event type
    const validEventTypes = [
      'semester_start',
      'semester_end',
      'holiday',
      'first_term_start',
      'first_term_end',
      'second_term_start',
      'second_term_end',
      'exam_preparation',
      'exam_start',
      'exam_end',
      'result_publication',
      'supplementary_exam',
      'college_event',
      'meeting',
      'other',
    ];

    if (!validEventTypes.includes(eventType)) {
      return NextResponse.json(
        { error: `Invalid event type: ${eventType}` },
        { status: 400 }
      );
    }

    // Parse date - handle YYYY-MM-DD format correctly
    const [year, month, day] = date.split('-').map(Number);
    const eventDate = new Date(year, month - 1, day, 12, 0, 0); // Noon to avoid timezone issues

    // Check for duplicate event on same date with same type
    const existingEvent = await prisma.academicCalendar.findFirst({
      where: {
        date: eventDate,
        eventType: eventType,
        ...(batchId ? { batchId: parseInt(batchId) } : {}),
      },
    });

    if (existingEvent) {
      return NextResponse.json(
        {
          error: `An event of type "${eventType}" already exists on this date${
            batchId ? ' for this batch' : ''
          }`,
          existingEvent,
        },
        { status: 409 }
      );
    }

    // Create the event
    const event = await prisma.academicCalendar.create({
      data: {
        date: eventDate,
        eventType,
        description: description.trim(),
        semester: semester || null,
        batchId: batchId ? parseInt(batchId) : null,
      },
      include: {
        batch: {
          select: { id: true, name: true },
        },
      },
    });

    console.log(
      `Created calendar event: ${
        event.eventType
      } on ${event.date.toISOString()}`
    );

    return NextResponse.json({
      success: true,
      message: 'Event created successfully',
      event,
    });
  } catch (error) {
    console.error('Error creating calendar event:', error);

    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'An event already exists on this date' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create event', details: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update calendar event
export async function PUT(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, date, eventType, description, semester, batchId } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      );
    }

    // Check if event exists
    const existingEvent = await prisma.academicCalendar.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingEvent) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Prepare update data
    const updateData = {};

    if (date) {
      const [year, month, day] = date.split('-').map(Number);
      updateData.date = new Date(year, month - 1, day, 12, 0, 0);
    }
    if (eventType) updateData.eventType = eventType;
    if (description) updateData.description = description.trim();
    if (semester !== undefined) updateData.semester = semester || null;
    if (batchId !== undefined)
      updateData.batchId = batchId ? parseInt(batchId) : null;

    const event = await prisma.academicCalendar.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        batch: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Event updated successfully',
      event,
    });
  } catch (error) {
    console.error('Error updating calendar event:', error);
    return NextResponse.json(
      { error: 'Failed to update event', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Remove calendar event
export async function DELETE(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      );
    }

    const event = await prisma.academicCalendar.findUnique({
      where: { id: parseInt(id) },
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Delete associated notices first
    await prisma.calendarNotice.deleteMany({
      where: { calendarId: parseInt(id) },
    });

    // Delete the event
    await prisma.academicCalendar.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({
      success: true,
      message: 'Event deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    return NextResponse.json(
      { error: 'Failed to delete event', details: error.message },
      { status: 500 }
    );
  }
}
