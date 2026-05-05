// app/api/batches/[id]/events/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const batchId = parseInt(id);

    if (isNaN(batchId)) {
      return NextResponse.json({ error: 'Invalid batch ID' }, { status: 400 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const eventType = searchParams.get('type'); // Optional: filter by event type
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Check if batch exists
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
    });

    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    // Build query filters
    const whereClause = {
      batchId: batchId,
    };

    // Filter by event type if provided
    if (eventType) {
      whereClause.type = eventType;
    }

    // Filter by date range if provided
    if (startDate || endDate) {
      whereClause.date = {};
      if (startDate) {
        whereClause.date.gte = new Date(startDate);
      }
      if (endDate) {
        whereClause.date.lte = new Date(endDate);
      }
    }

    // Fetch calendar events for the batch
    const events = await prisma.calendarEvent.findMany({
      where: whereClause,
      orderBy: {
        date: 'asc',
      },
      include: {
        classroom: {
          select: {
            id: true,
            name: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // If no events found, try to get semester dates from batch dates
    let semesterStart = null;
    let semesterEnd = null;

    if (eventType === 'semester' || !eventType) {
      // Look for semester-specific events
      const semesterEvents = events.filter(
        (e) =>
          e.type === 'semester_start' ||
          e.type === 'semester_end' ||
          e.title?.toLowerCase().includes('semester start') ||
          e.title?.toLowerCase().includes('semester end') ||
          e.title?.toLowerCase().includes('semester begin') ||
          e.title?.toLowerCase().includes('semester finish') ||
          e.title?.toLowerCase().includes('term start') ||
          e.title?.toLowerCase().includes('term end')
      );

      semesterStart = semesterEvents.find(
        (e) =>
          e.type === 'semester_start' ||
          e.title?.toLowerCase().includes('start') ||
          e.title?.toLowerCase().includes('begin')
      );

      semesterEnd = semesterEvents.find(
        (e) =>
          e.type === 'semester_end' ||
          e.title?.toLowerCase().includes('end') ||
          e.title?.toLowerCase().includes('finish')
      );
    }

    // Format the response
    const formattedEvents = events.map((event) => ({
      id: event.id,
      title: event.title,
      description: event.description,
      date: event.date,
      endDate: event.endDate,
      type: event.type,
      color: event.color,
      allDay: event.allDay,
      classroom: event.classroom
        ? {
            id: event.classroom.id,
            name: event.classroom.name,
          }
        : null,
      createdBy: event.createdBy
        ? {
            id: event.createdBy.id,
            name: event.createdBy.name,
          }
        : null,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    }));

    return NextResponse.json({
      success: true,
      batch: {
        id: batch.id,
        name: batch.name,
        academicYear: batch.academicYear,
        startDate: batch.startDate,
        endDate: batch.endDate,
      },
      events: formattedEvents,
      totalEvents: formattedEvents.length,
      semesterDates: {
        start: semesterStart
          ? {
              id: semesterStart.id,
              date: semesterStart.date,
              title: semesterStart.title,
            }
          : null,
        end: semesterEnd
          ? {
              id: semesterEnd.id,
              date: semesterEnd.date || semesterEnd.endDate,
              title: semesterEnd.title,
            }
          : null,
      },
      // Fallback: use batch dates if no semester events found
      effectiveSemesterDates: {
        startDate: semesterStart?.date || batch.startDate,
        endDate: semesterEnd?.date || semesterEnd?.endDate || batch.endDate,
      },
    });
  } catch (error) {
    console.error('Error fetching batch events:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch batch events',
        details:
          process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

// POST - Create a new calendar event for a batch
export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const batchId = parseInt(id);

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

    const body = await request.json();
    const {
      title,
      description,
      date,
      endDate,
      type,
      color,
      allDay,
      classroomId,
    } = body;

    if (!title || !date) {
      return NextResponse.json(
        { error: 'Title and date are required' },
        { status: 400 }
      );
    }

    const event = await prisma.calendarEvent.create({
      data: {
        title,
        description: description || '',
        date: new Date(date),
        endDate: endDate ? new Date(endDate) : null,
        type: type || 'general',
        color: color || '#4F46E5',
        allDay: allDay || false,
        batchId: batchId,
        classroomId: classroomId || null,
        createdById: session.user.id,
      },
      include: {
        classroom: {
          select: {
            id: true,
            name: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Event created successfully',
        event: {
          id: event.id,
          title: event.title,
          description: event.description,
          date: event.date,
          endDate: event.endDate,
          type: event.type,
          color: event.color,
          allDay: event.allDay,
          classroom: event.classroom,
          createdBy: event.createdBy,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating batch event:', error);
    return NextResponse.json(
      {
        error: 'Failed to create batch event',
        details:
          process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
