// app/api/exam-types/route.js
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Fetch all exam types
export async function GET() {
  try {
    const examTypes = await prisma.examType.findMany({
      where: {
        status: 'active',
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json(examTypes);
  } catch (error) {
    console.error('Error fetching exam types:', error);
    return NextResponse.json(
      { error: 'Failed to fetch exam types' },
      { status: 500 }
    );
  }
}

// POST - Create new exam type
export async function POST(request) {
  try {
    const body = await request.json();
    const { name, code, description, weightage, isGraded } = body;

    // Validate required fields
    if (!name || !code) {
      return NextResponse.json(
        { error: 'Name and code are required' },
        { status: 400 }
      );
    }

    // Check if exam type already exists
    const existingType = await prisma.examType.findFirst({
      where: {
        OR: [{ name }, { code }],
      },
    });

    if (existingType) {
      return NextResponse.json(
        { error: 'Exam type with this name or code already exists' },
        { status: 409 }
      );
    }

    const examType = await prisma.examType.create({
      data: {
        name,
        code,
        description,
        weightage: weightage ? parseFloat(weightage) : null,
        isGraded: isGraded !== undefined ? isGraded : true,
        status: 'active',
      },
    });

    return NextResponse.json(examType, { status: 201 });
  } catch (error) {
    console.error('Error creating exam type:', error);
    return NextResponse.json(
      { error: 'Failed to create exam type' },
      { status: 500 }
    );
  }
}
