// app/api/terminal-config/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - Fetch terminal config for a batch
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');

    if (!batchId) {
      return NextResponse.json({ error: 'batchId required' }, { status: 400 });
    }

    const config = await prisma.terminalConfig.findUnique({
      where: { batchId: parseInt(batchId) },
    });

    if (!config) {
      return NextResponse.json({
        config: {
          batchId: parseInt(batchId),
          termCount: 2,
          termWeeks: [7, 12],
          examDays: 5,
          semesterDuration: 16,
          isDefault: true,
        },
      });
    }

    return NextResponse.json({
      config: {
        id: config.id,
        batchId: config.batchId,
        termCount: config.termCount,
        termWeeks:
          typeof config.termWeeks === 'string'
            ? JSON.parse(config.termWeeks)
            : config.termWeeks,
        examDays: config.examDays,
        semesterDuration: config.semesterDuration,
      },
    });
  } catch (error) {
    console.error('GET terminal-config error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create or update terminal config
export async function POST(request) {
  try {
    const body = await request.json();
    const { batchId, termCount, termWeeks, examDays, semesterDuration } = body;

    console.log('POST terminal-config:', {
      batchId,
      termCount,
      termWeeks,
      examDays,
      semesterDuration,
    });

    if (!batchId) {
      return NextResponse.json({ error: 'batchId required' }, { status: 400 });
    }

    const data = {
      termCount: termCount || 2,
      termWeeks: termWeeks || [7, 12],
      examDays: examDays || 5,
      semesterDuration: semesterDuration || 16,
    };

    const config = await prisma.terminalConfig.upsert({
      where: { batchId: parseInt(batchId) },
      create: {
        batchId: parseInt(batchId),
        ...data,
      },
      update: data,
    });

    console.log('Saved terminal config:', config);

    return NextResponse.json({
      config,
      message: 'Terminal configuration saved',
    });
  } catch (error) {
    console.error('POST terminal-config error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Delete terminal config for a batch
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');

    if (!batchId) {
      return NextResponse.json({ error: 'batchId required' }, { status: 400 });
    }

    await prisma.terminalConfig.deleteMany({
      where: { batchId: parseInt(batchId) },
    });

    return NextResponse.json({ message: 'Terminal configuration deleted' });
  } catch (error) {
    console.error('DELETE terminal-config error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
