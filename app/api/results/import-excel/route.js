// app/api/results/import-excel/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const batchId = formData.get('batchId');
    const semester = formData.get('semester');
    const examCategory = formData.get('examCategory') || 'regular';
    const attempt = formData.get('attempt') || null;
    const resultDate = formData.get('resultDate');

    if (!file || !batchId || !semester) {
      return NextResponse.json(
        { error: 'File, Batch ID, and Semester are required' },
        { status: 400 }
      );
    }

    // Read the Excel file
    const bytes = await file.arrayBuffer();
    const workbook = XLSX.read(bytes, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convert to JSON
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    if (data.length < 2) {
      return NextResponse.json(
        { error: 'Excel file is empty or has no data rows' },
        { status: 400 }
      );
    }

    // First row is header
    const headerRow = data[0];
    console.log('Header row:', headerRow);

    // Find column indexes
    const rollNoIndex = headerRow.findIndex(
      (h) =>
        h &&
        (h.toString().toLowerCase().includes('roll') ||
          h.toString().toLowerCase().includes('enrollment'))
    );

    // Find course columns (everything after roll number column)
    const courseColumns = [];
    for (let i = 0; i < headerRow.length; i++) {
      if (i !== rollNoIndex && headerRow[i]) {
        courseColumns.push({
          index: i,
          header: headerRow[i].toString().trim(),
        });
      }
    }

    console.log('Roll No column index:', rollNoIndex);
    console.log('Course columns:', courseColumns);

    if (rollNoIndex === -1) {
      return NextResponse.json(
        { error: 'Could not find Roll No/Enrollment column in Excel' },
        { status: 400 }
      );
    }

    // Get all students in the batch
    const students = await prisma.student.findMany({
      where: { batchId: parseInt(batchId), status: 'active' },
      select: { id: true, rollNo: true, enrollmentNo: true, name: true },
    });

    // Create student lookup map (by rollNo and enrollmentNo)
    const studentMap = new Map();
    students.forEach((s) => {
      if (s.rollNo) studentMap.set(s.rollNo.toString().toLowerCase().trim(), s);
      if (s.enrollmentNo)
        studentMap.set(s.enrollmentNo.toString().toLowerCase().trim(), s);
    });

    // Get all courses for this batch and semester
    const courseLists = await prisma.courseList.findMany({
      where: {
        batchId: parseInt(batchId),
        semester: semester,
      },
      include: {
        course: {
          select: { id: true, code: true, name: true, credits: true },
        },
      },
    });

    // Create course lookup map (by code and name)
    const courseMap = new Map();
    courseLists.forEach((cl) => {
      const code = cl.course.code?.toLowerCase().trim();
      const name = cl.course.name?.toLowerCase().trim();
      if (code) courseMap.set(code, cl.course);
      if (name) courseMap.set(name, cl.course);
      // Also try without spaces
      if (code) courseMap.set(code.replace(/\s+/g, ''), cl.course);
      if (name) courseMap.set(name.replace(/\s+/g, ''), cl.course);
    });

    console.log('Available courses:', Array.from(courseMap.keys()));

    // Process each data row
    const results = [];
    const errors = [];
    let successCount = 0;
    let skipCount = 0;

    for (let rowIndex = 1; rowIndex < data.length; rowIndex++) {
      const row = data[rowIndex];

      if (!row || row.length === 0) continue;

      // Get student identifier
      const rollNo = row[rollNoIndex]?.toString().trim();

      if (!rollNo) {
        errors.push(`Row ${rowIndex + 1}: Empty roll number`);
        skipCount++;
        continue;
      }

      // Find student
      const student = studentMap.get(rollNo.toLowerCase());

      if (!student) {
        errors.push(
          `Row ${rowIndex + 1}: Student not found for roll number "${rollNo}"`
        );
        skipCount++;
        continue;
      }

      // Process each course column
      const studentResults = [];

      for (const courseCol of courseColumns) {
        const cellValue = row[courseCol.index];

        // Skip empty cells
        if (cellValue === undefined || cellValue === null || cellValue === '') {
          continue;
        }

        // Parse GPA value
        let gradePoint = parseFloat(cellValue);

        if (isNaN(gradePoint) || gradePoint < 0 || gradePoint > 4.0) {
          errors.push(
            `Row ${rowIndex + 1}, ${
              courseCol.header
            }: Invalid GPA value "${cellValue}"`
          );
          continue;
        }

        // Find course by header
        const headerLower = courseCol.header.toLowerCase().trim();
        const headerNoSpace = headerLower.replace(/\s+/g, '');

        let course = courseMap.get(headerLower) || courseMap.get(headerNoSpace);

        // Try partial match
        if (!course) {
          for (const [key, value] of courseMap) {
            if (headerLower.includes(key) || key.includes(headerLower)) {
              course = value;
              break;
            }
          }
        }

        if (!course) {
          errors.push(
            `Row ${rowIndex + 1}: Course not found for column "${
              courseCol.header
            }"`
          );
          continue;
        }

        // Calculate grade
        const grade = calculateGradeFromGPA(gradePoint);
        const isPassed = gradePoint >= 2.0;

        studentResults.push({
          courseId: course.id,
          gradePoint: gradePoint,
          grade: grade,
          isPassed: isPassed,
        });
      }

      if (studentResults.length > 0) {
        // Save results for this student
        for (const result of studentResults) {
          try {
            const existingResult = await prisma.result.findFirst({
              where: {
                studentId: student.id,
                courseId: result.courseId,
                examCategory: examCategory,
                attempt: attempt ? parseInt(attempt) : null,
                semester: semester,
              },
            });

            const resultData = {
              gradePoint: result.gradePoint,
              grade: result.grade,
              isPassed: result.isPassed,
              resultStatus: 'draft',
              resultDate: resultDate ? new Date(resultDate) : null,
              updatedAt: new Date(),
            };

            if (existingResult) {
              await prisma.result.update({
                where: { id: existingResult.id },
                data: resultData,
              });
            } else {
              await prisma.result.create({
                data: {
                  studentId: student.id,
                  courseId: result.courseId,
                  examCategory: examCategory,
                  attempt: attempt ? parseInt(attempt) : null,
                  semester: semester,
                  ...resultData,
                },
              });
            }
            successCount++;
          } catch (dbError) {
            console.error(
              `Error saving result for student ${student.id}, course ${result.courseId}:`,
              dbError
            );
            errors.push(
              `Row ${rowIndex + 1}: Failed to save result for course ID ${
                result.courseId
              }`
            );
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Import completed! Saved: ${successCount}, Skipped: ${skipCount}, Errors: ${errors.length}`,
      savedCount: successCount,
      skipCount: skipCount,
      errorCount: errors.length,
      errors: errors.slice(0, 20), // Return first 20 errors
      totalRows: data.length - 1,
    });
  } catch (error) {
    console.error('Error importing Excel:', error);
    return NextResponse.json(
      { error: 'Failed to import Excel file', details: error.message },
      { status: 500 }
    );
  }
}

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
