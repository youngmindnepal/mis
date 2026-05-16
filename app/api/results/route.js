import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');
    const examId = searchParams.get('examId');
    const classroomId = searchParams.get('classroomId');
    const studentId = searchParams.get('studentId');
    const examCategory = searchParams.get('examCategory');
    const semester = searchParams.get('semester');
    const resultStatus = searchParams.get('resultStatus');

    // Build where clause
    const where = {};

    // If batchId is provided, filter by batch through exam or classroom
    if (batchId) {
      const batchIdNum = parseInt(batchId);
      if (isNaN(batchIdNum)) {
        return NextResponse.json(
          { error: 'Invalid batch ID' },
          { status: 400 }
        );
      }

      // Find exams that belong to this batch
      where.OR = [
        { exam: { batchId: batchIdNum } },
        { classroom: { batchId: batchIdNum } },
      ];
    }

    if (examId) {
      const examIdNum = parseInt(examId);
      if (isNaN(examIdNum)) {
        return NextResponse.json({ error: 'Invalid exam ID' }, { status: 400 });
      }
      where.examId = examIdNum;
    }

    if (classroomId) {
      const classroomIdNum = parseInt(classroomId);
      if (isNaN(classroomIdNum)) {
        return NextResponse.json(
          { error: 'Invalid classroom ID' },
          { status: 400 }
        );
      }
      where.classroomId = classroomIdNum;
    }

    if (studentId) {
      const studentIdNum = parseInt(studentId);
      if (isNaN(studentIdNum)) {
        return NextResponse.json(
          { error: 'Invalid student ID' },
          { status: 400 }
        );
      }
      where.studentId = studentIdNum;
    }

    if (examCategory) {
      where.examCategory = examCategory;
    }

    if (semester) {
      where.semester = semester;
    }

    if (resultStatus) {
      where.resultStatus = resultStatus;
    }

    const results = await prisma.result.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            name: true,
            rollNo: true,
            email: true,
            enrollmentNo: true,
          },
        },
        exam: {
          select: {
            id: true,
            name: true,
            date: true,
            startTime: true,
            endTime: true,
            examType: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        classroom: {
          select: {
            id: true,
            name: true,
            course: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
        course: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: [{ exam: { date: 'asc' } }, { student: { name: 'asc' } }],
    });

    return NextResponse.json({
      results,
      count: results.length,
    });
  } catch (error) {
    console.error('Error fetching results:', error);
    return NextResponse.json(
      { error: 'Failed to fetch results', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      studentId,
      examId,
      classroomId,
      courseId,
      theoryMarks,
      practicalMarks,
      totalMarks,
      maxMarks,
      passMarks,
      grade,
      gradePoint,
      resultStatus,
      isAbsent,
      isPassed,
      remarks,
      examCategory,
      semester,
      attempt,
      examRollNumber,
      resultDate,
    } = body;

    // Validate required fields
    if (!studentId || !examId) {
      return NextResponse.json(
        { error: 'studentId and examId are required' },
        { status: 400 }
      );
    }

    // Check if result already exists
    const existingResult = await prisma.result.findFirst({
      where: {
        studentId: parseInt(studentId),
        examId: parseInt(examId),
        ...(courseId ? { courseId: parseInt(courseId) } : {}),
        ...(examCategory ? { examCategory } : {}),
        ...(attempt ? { attempt: parseInt(attempt) } : {}),
      },
    });

    let result;

    if (existingResult) {
      // Update existing result
      result = await prisma.result.update({
        where: { id: existingResult.id },
        data: {
          theoryMarks:
            theoryMarks !== undefined ? parseFloat(theoryMarks) : undefined,
          practicalMarks:
            practicalMarks !== undefined
              ? parseFloat(practicalMarks)
              : undefined,
          totalMarks:
            totalMarks !== undefined ? parseFloat(totalMarks) : undefined,
          maxMarks: maxMarks !== undefined ? parseFloat(maxMarks) : undefined,
          passMarks:
            passMarks !== undefined ? parseFloat(passMarks) : undefined,
          grade: grade || undefined,
          gradePoint:
            gradePoint !== undefined ? parseFloat(gradePoint) : undefined,
          resultStatus: resultStatus || 'draft',
          isAbsent: isAbsent !== undefined ? isAbsent : undefined,
          isPassed: isPassed !== undefined ? isPassed : undefined,
          remarks: remarks || undefined,
          resultDate: resultDate ? new Date(resultDate) : undefined,
        },
        include: {
          student: { select: { id: true, name: true, rollNo: true } },
          exam: { select: { id: true, name: true } },
        },
      });
    } else {
      // Create new result
      result = await prisma.result.create({
        data: {
          studentId: parseInt(studentId),
          examId: parseInt(examId),
          classroomId: classroomId ? parseInt(classroomId) : null,
          courseId: courseId ? parseInt(courseId) : null,
          theoryMarks:
            theoryMarks !== undefined ? parseFloat(theoryMarks) : null,
          practicalMarks:
            practicalMarks !== undefined ? parseFloat(practicalMarks) : null,
          totalMarks: totalMarks !== undefined ? parseFloat(totalMarks) : null,
          maxMarks: maxMarks !== undefined ? parseFloat(maxMarks) : 100,
          passMarks: passMarks !== undefined ? parseFloat(passMarks) : 40,
          grade: grade || null,
          gradePoint: gradePoint !== undefined ? parseFloat(gradePoint) : null,
          resultStatus: resultStatus || 'draft',
          isAbsent: isAbsent || false,
          isPassed: isPassed !== undefined ? isPassed : null,
          remarks: remarks || null,
          examCategory: examCategory || 'regular',
          semester: semester || null,
          attempt: attempt ? parseInt(attempt) : null,
          examRollNumber: examRollNumber || null,
          resultDate: resultDate ? new Date(resultDate) : null,
        },
        include: {
          student: { select: { id: true, name: true, rollNo: true } },
          exam: { select: { id: true, name: true } },
        },
      });
    }

    return NextResponse.json(
      { result, message: existingResult ? 'Result updated' : 'Result created' },
      { status: existingResult ? 200 : 201 }
    );
  } catch (error) {
    console.error('Error saving result:', error);
    return NextResponse.json(
      { error: 'Failed to save result', details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Result ID is required' },
        { status: 400 }
      );
    }

    const data = {};
    if (updateData.theoryMarks !== undefined)
      data.theoryMarks = parseFloat(updateData.theoryMarks);
    if (updateData.practicalMarks !== undefined)
      data.practicalMarks = parseFloat(updateData.practicalMarks);
    if (updateData.totalMarks !== undefined)
      data.totalMarks = parseFloat(updateData.totalMarks);
    if (updateData.maxMarks !== undefined)
      data.maxMarks = parseFloat(updateData.maxMarks);
    if (updateData.passMarks !== undefined)
      data.passMarks = parseFloat(updateData.passMarks);
    if (updateData.grade !== undefined) data.grade = updateData.grade;
    if (updateData.gradePoint !== undefined)
      data.gradePoint = parseFloat(updateData.gradePoint);
    if (updateData.resultStatus) data.resultStatus = updateData.resultStatus;
    if (updateData.isAbsent !== undefined) data.isAbsent = updateData.isAbsent;
    if (updateData.isPassed !== undefined) data.isPassed = updateData.isPassed;
    if (updateData.remarks !== undefined) data.remarks = updateData.remarks;
    if (updateData.resultDate)
      data.resultDate = new Date(updateData.resultDate);

    const result = await prisma.result.update({
      where: { id: parseInt(id) },
      data,
      include: {
        student: { select: { id: true, name: true, rollNo: true } },
        exam: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ result, message: 'Result updated' });
  } catch (error) {
    console.error('Error updating result:', error);
    return NextResponse.json(
      { error: 'Failed to update result', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Result ID is required' },
        { status: 400 }
      );
    }

    await prisma.result.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({ message: 'Result deleted' });
  } catch (error) {
    console.error('Error deleting result:', error);
    return NextResponse.json(
      { error: 'Failed to delete result', details: error.message },
      { status: 500 }
    );
  }
}
