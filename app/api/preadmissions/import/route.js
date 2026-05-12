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

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Read file buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Parse Excel
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    if (data.length === 0) {
      return NextResponse.json(
        { error: 'No data found in file' },
        { status: 400 }
      );
    }

    // Get all departments for mapping
    const departments = await prisma.department.findMany();
    const agents = await prisma.agent.findMany();

    let imported = 0;
    let skipped = 0;
    const errors = [];

    for (const row of data) {
      try {
        const studentName =
          row['Student Name'] || row['studentName'] || row['Name'];
        const phone = row['Phone'] || row['phone'] || row['Phone Number'] || '';
        const email = row['Email'] || row['email'] || '';
        const address = row['Address'] || row['address'] || '';
        const previousCollege =
          row['Previous College'] ||
          row['previousCollege'] ||
          row['College'] ||
          '';
        const gpa = row['GPA'] || row['gpa'] || '';
        const referralSource =
          row['Referral Source'] || row['referralSource'] || '';
        const referralName = row['Referred By'] || row['referralName'] || '';
        const agentName = row['Agent'] || row['agent'] || '';
        const notes = row['Notes'] || row['notes'] || '';
        const status = row['Status'] || row['status'] || 'pending';
        const departmentStr = row['Departments'] || row['departments'] || '';

        // Validate required fields
        if (!studentName?.toString().trim()) {
          skipped++;
          errors.push(`Row skipped: Missing student name`);
          continue;
        }
        if (!phone?.toString().trim()) {
          skipped++;
          errors.push(`Row skipped: Missing phone for "${studentName}"`);
          continue;
        }

        // Parse departments
        const departmentNames = departmentStr
          .toString()
          .split(',')
          .map((d) => d.trim())
          .filter(Boolean);
        const departmentIds = [];

        for (const deptName of departmentNames) {
          const dept = departments.find(
            (d) =>
              d.name.toLowerCase() === deptName.toLowerCase() ||
              d.code?.toLowerCase() === deptName.toLowerCase()
          );
          if (dept) {
            departmentIds.push(dept.id);
          }
        }

        // If no departments matched, try to use all departments or skip
        if (departmentIds.length === 0 && departments.length > 0) {
          // Don't auto-assign, skip row
          skipped++;
          errors.push(`Row skipped: No valid departments for "${studentName}"`);
          continue;
        }

        // Find agent
        let agentId = null;
        if (agentName?.toString().trim()) {
          const agent = agents.find(
            (a) => a.name.toLowerCase() === agentName.toString().toLowerCase()
          );
          if (agent) {
            agentId = agent.id;
            if (referralSource !== 'agent') {
              // Auto-set referral source to agent if agent name provided
            }
          }
        }

        // Create preadmission
        await prisma.preadmission.create({
          data: {
            studentName: studentName.toString().trim(),
            phone: phone.toString().trim(),
            email: email?.toString().trim() || null,
            address: address?.toString().trim() || null,
            previousCollege: previousCollege?.toString().trim() || null,
            gpa: gpa ? parseFloat(gpa) : null,
            referralSource:
              referralSource?.toString().trim() || (agentId ? 'agent' : null),
            referralName: referralName?.toString().trim() || null,
            agentId: agentId,
            notes: notes?.toString().trim() || null,
            status: [
              'pending',
              'contacted',
              'follow_up',
              'enrolled',
              'rejected',
            ].includes(status?.toString().toLowerCase())
              ? status.toString().toLowerCase()
              : 'pending',
            counselorId: session.user?.id ? parseInt(session.user.id) : null,
            departments: {
              create: departmentIds.map((id) => ({ departmentId: id })),
            },
          },
        });
        imported++;
      } catch (e) {
        skipped++;
        errors.push(`Error importing row: ${e.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      imported,
      skipped,
      total: data.length,
      errors: errors.slice(0, 10), // Return first 10 errors
      message: `Imported ${imported} students. ${skipped} skipped.`,
    });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json(
      { error: 'Import failed', details: error.message },
      { status: 500 }
    );
  }
}
