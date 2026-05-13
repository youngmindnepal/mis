// app/api/followups/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const preadmissionId = searchParams.get('preadmissionId');
    const followUpDate = searchParams.get('followUpDate');
    const status = searchParams.get('status');

    const where = {};

    if (preadmissionId) {
      where.preadmissionId = parseInt(preadmissionId);
    }

    if (followUpDate) {
      // Filter by exact date (start of day to end of day)
      const dateStart = new Date(followUpDate);
      dateStart.setHours(0, 0, 0, 0);

      const dateEnd = new Date(followUpDate);
      dateEnd.setHours(23, 59, 59, 999);

      where.followUpDate = {
        gte: dateStart,
        lte: dateEnd,
      };
    }

    if (status) {
      where.status = status;
    }

    const followUps = await prisma.followUp.findMany({
      where,
      orderBy: { followUpDate: 'desc' },
      include: {
        preadmission: {
          select: {
            id: true,
            studentName: true,
            phone: true,
          },
        },
        counselor: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({ followUps });
  } catch (error) {
    console.error('Error fetching follow-ups:', error);
    return NextResponse.json(
      { error: 'Failed to fetch follow-ups', details: error.message },
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

    const body = await request.json();
    const { preadmissionId, followUpDate, notes, outcome } = body;

    // Validate required fields
    if (!preadmissionId) {
      return NextResponse.json(
        { error: 'preadmissionId is required' },
        { status: 400 }
      );
    }

    if (!followUpDate) {
      return NextResponse.json(
        { error: 'followUpDate is required' },
        { status: 400 }
      );
    }

    // Parse and validate date
    const parsedDate = new Date(followUpDate);
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid followUpDate' },
        { status: 400 }
      );
    }

    // Check if preadmission exists
    const preadmission = await prisma.preadmission.findUnique({
      where: { id: parseInt(preadmissionId) },
    });

    if (!preadmission) {
      return NextResponse.json(
        { error: 'Preadmission not found' },
        { status: 404 }
      );
    }

    const followUp = await prisma.followUp.create({
      data: {
        preadmissionId: parseInt(preadmissionId),
        followUpDate: parsedDate,
        notes: notes?.trim() || null,
        outcome: outcome || null,
        counselorId: parseInt(session.user.id),
        status: 'pending',
      },
      include: {
        preadmission: {
          select: {
            id: true,
            studentName: true,
            phone: true,
          },
        },
        counselor: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, followUp }, { status: 201 });
  } catch (error) {
    console.error('Error creating follow-up:', error);
    return NextResponse.json(
      { error: 'Failed to create follow-up', details: error.message },
      { status: 500 }
    );
  }
}
