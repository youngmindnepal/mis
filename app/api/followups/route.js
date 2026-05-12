// app/api/followups/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const preadmissionId = searchParams.get('preadmissionId');

    const where = {};
    if (preadmissionId) where.preadmissionId = parseInt(preadmissionId);

    console.log('Fetching follow-ups with where:', where);

    const followUps = await prisma.followUp.findMany({
      where,
      include: {
        preadmission: { select: { id: true, studentName: true, phone: true } },
        counselor: { select: { id: true, name: true } },
      },
      orderBy: { followUpDate: 'asc' },
    });

    return NextResponse.json({ success: true, followUps });
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
    if (!session)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    console.log('POST body:', body);

    const { preadmissionId, followUpDate, notes, outcome } = body;

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

    // Verify preadmission exists
    const preadmission = await prisma.preadmission.findUnique({
      where: { id: parseInt(preadmissionId) },
    });

    if (!preadmission) {
      return NextResponse.json(
        { error: 'Student record not found' },
        { status: 404 }
      );
    }

    // Create follow-up using raw query if model method fails
    let followUp;
    try {
      followUp = await prisma.followUp.create({
        data: {
          preadmissionId: parseInt(preadmissionId),
          followUpDate: new Date(followUpDate),
          notes: notes?.trim() || null,
          status: 'pending',
          outcome: outcome || null,
          counselorId: session.user?.id ? parseInt(session.user.id) : null,
        },
      });
    } catch (createError) {
      console.error('Prisma create error:', createError);

      // Fallback: Try using raw SQL
      try {
        const result = await prisma.$executeRawUnsafe(
          `INSERT INTO "FollowUp" ("preadmissionId", "followUpDate", "notes", "status", "outcome", "counselorId", "createdAt", "updatedAt") 
           VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) RETURNING *`,
          parseInt(preadmissionId),
          new Date(followUpDate),
          notes?.trim() || null,
          'pending',
          outcome || null,
          session.user?.id ? parseInt(session.user.id) : null
        );
        followUp = result;
      } catch (rawError) {
        console.error('Raw SQL error:', rawError);
        throw rawError;
      }
    }

    // Update preadmission status
    try {
      await prisma.preadmission.update({
        where: { id: parseInt(preadmissionId) },
        data: { status: 'follow_up' },
      });
    } catch (e) {
      console.warn('Could not update status:', e.message);
    }

    return NextResponse.json({ success: true, followUp }, { status: 201 });
  } catch (error) {
    console.error('Error creating follow-up:', error);
    return NextResponse.json(
      { error: 'Failed to create follow-up', details: error.message },
      { status: 500 }
    );
  }
}
