// app/api/results/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - Fetch results by batch and exam category
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');
    const examCategory = searchParams.get('examCategory') || 'regular';
    const studentId = searchParams.get('studentId');

    if (!batchId) {
      return NextResponse.json(
        { error: 'Batch ID is required' },
        { status: 400 }
      );
    }

    const where = {
      examCategory,
      student: { batchId: parseInt(batchId) },
    };

    if (studentId) {
      where.studentId = parseInt(studentId);
    }

    const results = await prisma.result.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            name: true,
            rollNo: true,
            enrollmentNo: true,
            batchId: true,
            status: true,
            inactiveDate: true,
          },
        },
        course: {
          select: {
            id: true,
            code: true,
            name: true,
            credits: true,
          },
        },
      },
      orderBy: [{ student: { name: 'asc' } }, { course: { code: 'asc' } }],
    });

    const resultsByStudent = {};
    results.forEach((result) => {
      const sId = result.studentId.toString();
      const cId = result.courseId?.toString();
      if (!cId) return;

      if (!resultsByStudent[sId]) {
        resultsByStudent[sId] = {};
      }

      resultsByStudent[sId][cId] = {
        id: result.id,
        gradePoint: result.gradePoint,
        grade: result.grade,
        isPassed: result.isPassed,
        resultStatus: result.resultStatus,
        publishedAt: result.publishedAt,
        resultPublishedDate: result.resultPublishedDate,
      };
    });

    return NextResponse.json({
      success: true,
      results: resultsByStudent,
      total: results.length,
      batchId: parseInt(batchId),
    });
  } catch (error) {
    console.error('Error fetching results:', error);
    return NextResponse.json(
      { error: 'Failed to fetch results' },
      { status: 500 }
    );
  }
}

// app/api/results/route.js - Fixed POST handler

// app/api/results/route.js - Fix the POST handler

// app/api/results/route.js - Fix the resultStatus enum values

// app/api/results/route.js - Fixed POST handler

// app/api/results/route.js - Fixed POST handler with correct ResultStatus

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      studentId,
      batchId,
      semester,
      examCategory,
      attempt,
      resultDate,
      results,
    } = body;

    console.log('=== API SAVE RESULTS ===');
    console.log('Received body:', JSON.stringify(body, null, 2));

    if (
      !studentId ||
      !batchId ||
      !semester ||
      !examCategory ||
      !results ||
      !Array.isArray(results)
    ) {
      console.error('Missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate results including 0 values
    const validResults = results.filter((r) => {
      const hasValidCourse = r.courseId && !isNaN(parseInt(r.courseId));
      const gradePoint = r.gradePoint;
      const hasValidGrade =
        gradePoint !== null &&
        gradePoint !== undefined &&
        !isNaN(parseFloat(gradePoint));

      return hasValidCourse && hasValidGrade;
    });

    console.log('Valid results count:', validResults.length);

    if (validResults.length === 0) {
      return NextResponse.json(
        {
          error:
            'No valid results to save. Please provide at least one grade (including 0).',
        },
        { status: 400 }
      );
    }

    // Process each result
    const savedResults = [];

    for (const result of validResults) {
      const courseId = parseInt(result.courseId);
      const gradePoint = parseFloat(result.gradePoint);

      // Calculate grade and pass status
      const grade = calculateGradeFromGPA(gradePoint);
      const isPassed = gradePoint >= 2.0;

      // FIXED: resultStatus should be 'draft' or 'published', NOT 'pass'/'fail'
      // The pass/fail is stored in isPassed field
      const resultStatus = 'draft'; // Default to draft when saving

      console.log(
        `Processing: courseId=${courseId}, gradePoint=${gradePoint}, grade=${grade}, isPassed=${isPassed}`
      );

      try {
        // Match the exact unique constraint fields
        const whereClause = {
          studentId: parseInt(studentId),
          courseId: courseId,
          examCategory: examCategory,
        };

        if (attempt !== null && attempt !== undefined) {
          whereClause.attempt = attempt;
        }

        if (semester) {
          whereClause.semester = semester;
        }

        console.log('Looking for existing result with:', whereClause);

        // Check if result already exists
        const existingResult = await prisma.result.findFirst({
          where: whereClause,
        });

        let savedResult;

        // Prepare data for create/update
        const resultData = {
          gradePoint: gradePoint,
          grade: grade,
          isPassed: isPassed,
          resultStatus: resultStatus, // Use 'draft' - valid enum value
          resultDate: resultDate ? new Date(resultDate) : null,
          updatedAt: new Date(),
        };

        if (existingResult) {
          // Update existing result
          console.log('Updating existing result:', existingResult.id);
          savedResult = await prisma.result.update({
            where: { id: existingResult.id },
            data: resultData,
          });
          console.log('Updated result:', savedResult.id);
        } else {
          // Create new result
          console.log('Creating new result');

          // Build create data with all required fields
          const createData = {
            studentId: parseInt(studentId),
            courseId: courseId,
            examCategory: examCategory,
            semester: semester,
            ...resultData,
          };

          if (attempt !== null && attempt !== undefined) {
            createData.attempt = attempt;
          }

          savedResult = await prisma.result.create({
            data: createData,
          });
          console.log('Created new result:', savedResult.id);
        }

        savedResults.push(savedResult);
      } catch (dbError) {
        console.error(`Database error for course ${courseId}:`, dbError);
        console.error('Error details:', {
          message: dbError.message,
          code: dbError.code,
          meta: dbError.meta,
        });

        // If it's a unique constraint error, try to update instead
        if (dbError.code === 'P2002') {
          console.log(
            'Unique constraint violation, attempting to find and update...'
          );

          try {
            const whereClause = {
              studentId: parseInt(studentId),
              courseId: courseId,
              examCategory: examCategory,
            };

            if (attempt !== null && attempt !== undefined) {
              whereClause.attempt = attempt;
            }

            if (semester) {
              whereClause.semester = semester;
            }

            const existing = await prisma.result.findFirst({
              where: whereClause,
            });

            if (existing) {
              const updated = await prisma.result.update({
                where: { id: existing.id },
                data: {
                  gradePoint: gradePoint,
                  grade: grade,
                  isPassed: isPassed,
                  resultStatus: 'draft', // Use valid enum value
                  resultDate: resultDate ? new Date(resultDate) : null,
                  updatedAt: new Date(),
                },
              });
              savedResults.push(updated);
              console.log('Updated after unique constraint:', updated.id);
              continue;
            }
          } catch (retryError) {
            console.error('Retry failed:', retryError);
          }
        }

        throw new Error(
          `Failed to save result for course ${courseId}: ${dbError.message}`
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: `Saved ${savedResults.length} results`,
      count: savedResults.length,
      results: savedResults,
    });
  } catch (error) {
    console.error('=== API ERROR ===');
    console.error('Error saving results:', error);
    console.error('Error stack:', error.stack);

    return NextResponse.json(
      {
        error: error.message || 'Failed to save results',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// Helper function to calculate grade from GPA
function calculateGradeFromGPA(gpa) {
  if (gpa >= 3.71) return 'A';
  if (gpa >= 3.31) return 'A-';
  if (gpa >= 3.01) return 'B+';
  if (gpa >= 2.71) return 'B';
  if (gpa >= 2.31) return 'B-';
  if (gpa >= 2.01) return 'C+';
  if (gpa >= 1.71) return 'C';
  return 'F';
}
export async function PUT(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { batchId, examCategory, studentId, publishDate } = body;

    if (!batchId || !examCategory) {
      return NextResponse.json(
        { error: 'Batch ID and exam category are required' },
        { status: 400 }
      );
    }

    const where = {
      examCategory,
      student: { batchId: parseInt(batchId) },
      resultStatus: 'draft',
    };

    if (studentId) {
      where.studentId = parseInt(studentId);
    }

    // Use provided publish date or current date
    const publishedAtDate = publishDate ? new Date(publishDate) : new Date();

    // Update all draft results to published and set publishedAt
    const updatedResults = await prisma.result.updateMany({
      where,
      data: {
        resultStatus: 'published',
        publishedAt: publishedAtDate,
        resultPublishedDate: publishedAtDate, // Same date for all students
      },
    });

    return NextResponse.json({
      success: true,
      message: `Published ${updatedResults.count} results`,
      count: updatedResults.count,
      publishedDate: publishedAtDate,
    });
  } catch (error) {
    console.error('Error publishing results:', error);
    return NextResponse.json(
      { error: 'Failed to publish results' },
      { status: 500 }
    );
  }
}

// DELETE - Remove a specific result
export async function DELETE(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const resultId = searchParams.get('id');

    if (!resultId) {
      return NextResponse.json(
        { error: 'Result ID is required' },
        { status: 400 }
      );
    }

    const result = await prisma.result.findUnique({
      where: { id: parseInt(resultId) },
    });

    if (!result) {
      return NextResponse.json({ error: 'Result not found' }, { status: 404 });
    }

    // Only allow deletion of draft results
    if (result.resultStatus !== 'draft') {
      return NextResponse.json(
        { error: 'Only draft results can be deleted' },
        { status: 400 }
      );
    }

    await prisma.result.delete({ where: { id: parseInt(resultId) } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting result:', error);
    return NextResponse.json(
      { error: 'Failed to delete result' },
      { status: 500 }
    );
  }
}
