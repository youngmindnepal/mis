// app/api/results/export-template/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';

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
        { error: 'Batch ID and Semester are required' },
        { status: 400 }
      );
    }

    // Get students
    const students = await prisma.student.findMany({
      where: { batchId: parseInt(batchId), status: 'active' },
      select: { rollNo: true, enrollmentNo: true, name: true },
      orderBy: { rollNo: 'asc' },
    });

    // Get courses
    const courseLists = await prisma.courseList.findMany({
      where: { batchId: parseInt(batchId), semester: semester },
      include: {
        course: { select: { code: true, name: true, credits: true } },
      },
      orderBy: { course: { code: 'asc' } },
    });

    // Create workbook
    const workbook = XLSX.utils.book_new();

    // Create headers
    const headers = ['Roll No', 'Student Name'];
    courseLists.forEach((cl) => {
      headers.push(`${cl.course.code} (${cl.course.credits || 3}cr)`);
    });

    // Create data rows
    const data = [headers];
    students.forEach((student) => {
      const row = [
        student.rollNo || student.enrollmentNo || '',
        student.name || '',
      ];
      // Add empty cells for each course
      courseLists.forEach(() => row.push(''));
      data.push(row);
    });

    // Create worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(data);

    // Set column widths
    const colWidths = [
      { wch: 15 }, // Roll No
      { wch: 30 }, // Student Name
    ];
    courseLists.forEach(() => colWidths.push({ wch: 12 })); // Course columns
    worksheet['!cols'] = colWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Marks Entry');

    // Add instructions sheet
    const instructionsData = [
      ['INSTRUCTIONS FOR MARKS ENTRY'],
      [''],
      ['1. DO NOT modify the header row or column order'],
      ['2. Enter GPA values between 0.0 and 4.0 for each course'],
      ['3. Leave cell empty if no marks to enter'],
      ['4. Course headers show course code and credit hours'],
      ['5. Match Roll Number with student records'],
      [''],
      ['Grade Scale:'],
      ['A: 4.0', 'A-: 3.7', 'B+: 3.3', 'B: 3.0'],
      ['B-: 2.7', 'C+: 2.3', 'C: 2.0', 'F: Below 2.0'],
    ];
    const instructionsSheet = XLSX.utils.aoa_to_sheet(instructionsData);
    XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions');

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buffer, {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="marks_template_${semester}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('Error generating template:', error);
    return NextResponse.json(
      { error: 'Failed to generate template' },
      { status: 500 }
    );
  }
}
