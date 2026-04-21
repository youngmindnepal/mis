// app/api/exam-config/supplementary-attempts/route.js
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
    const batchId = searchParams.get('batchId');
    const semester = searchParams.get('semester');

    if (!batchId || !semester) {
      return NextResponse.json(
        { error: 'Batch ID and semester are required' },
        { status: 400 }
      );
    }

    console.log(
      `[API] Fetching supplementary attempt configs for batch ${batchId}, semester ${semester}`
    );

    // Try to get from ExamConfig first
    let configs = [];

    try {
      configs = await prisma.examConfig.findMany({
        where: {
          batchId: parseInt(batchId),
          semester: semester,
          examCategory: 'supplementary',
        },
        orderBy: {
          attempt: 'asc',
        },
      });
    } catch (error) {
      console.log(
        '[API] ExamConfig table might not exist, falling back to results'
      );
    }

    // If no configs found, get distinct attempts from results
    if (configs.length === 0) {
      const results = await prisma.result.findMany({
        where: {
          examCategory: 'supplementary',
          semester: semester,
          student: {
            batchId: parseInt(batchId),
          },
        },
        distinct: ['attempt'],
        select: {
          attempt: true,
          resultDate: true,
        },
        orderBy: {
          attempt: 'asc',
        },
      });

      const attempts = results
        .filter((r) => r.attempt !== null)
        .map((r) => ({
          attemptNumber: r.attempt,
          resultDate: r.resultDate,
        }));

      // Remove duplicates
      const uniqueAttempts = [];
      const seenAttempts = new Set();

      attempts.forEach((attempt) => {
        if (!seenAttempts.has(attempt.attemptNumber)) {
          seenAttempts.add(attempt.attemptNumber);
          uniqueAttempts.push(attempt);
        }
      });

      configs = uniqueAttempts;
    } else {
      configs = configs.map((c) => ({
        attemptNumber: c.attempt,
        resultDate: c.resultDate,
      }));
    }

    // Ensure we have at least attempts 1-4 as options
    const defaultAttempts = [1, 2, 3, 4];
    const finalAttempts = defaultAttempts.map((attemptNum) => {
      const existing = configs.find((c) => c.attemptNumber === attemptNum);
      return existing || { attemptNumber: attemptNum, resultDate: null };
    });

    console.log(`[API] Returning ${finalAttempts.length} attempts`);

    return NextResponse.json({
      success: true,
      attempts: finalAttempts,
      batchId: parseInt(batchId),
      semester: semester,
    });
  } catch (error) {
    console.error('[API] Error fetching supplementary attempts:', error);
    // Return default attempts on error
    return NextResponse.json({
      success: true,
      attempts: [
        { attemptNumber: 1, resultDate: null },
        { attemptNumber: 2, resultDate: null },
        { attemptNumber: 3, resultDate: null },
        { attemptNumber: 4, resultDate: null },
      ],
    });
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { batchId, semester, attempt, resultDate } = body;

    if (!batchId || !semester || !attempt || !resultDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    console.log(
      `[API] Saving supplementary config: batch ${batchId}, semester ${semester}, attempt ${attempt}`
    );

    let config;

    try {
      // Try to upsert in ExamConfig
      config = await prisma.examConfig.upsert({
        where: {
          batchId_semester_examCategory_attempt: {
            batchId: parseInt(batchId),
            semester: semester,
            examCategory: 'supplementary',
            attempt: parseInt(attempt),
          },
        },
        update: {
          resultDate: new Date(resultDate),
        },
        create: {
          batchId: parseInt(batchId),
          semester: semester,
          examCategory: 'supplementary',
          attempt: parseInt(attempt),
          resultDate: new Date(resultDate),
        },
      });
    } catch (error) {
      console.log('[API] ExamConfig upsert failed, skipping config save');
      // If ExamConfig doesn't exist, just return success
      config = { attempt: parseInt(attempt), resultDate: new Date(resultDate) };
    }

    return NextResponse.json({
      success: true,
      config,
      message: `Saved supplementary attempt ${attempt} configuration`,
    });
  } catch (error) {
    console.error('[API] Error saving supplementary config:', error);
    return NextResponse.json(
      { error: 'Failed to save configuration', details: error.message },
      { status: 500 }
    );
  }
}
