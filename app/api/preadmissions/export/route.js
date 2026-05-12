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
    const status = searchParams.get('status');
    const departmentId = searchParams.get('departmentId');
    const referralSource = searchParams.get('referralSource');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    const where = {};
    if (status) where.status = status;
    if (referralSource) where.referralSource = referralSource;
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom);
      if (dateTo) where.date.lte = new Date(dateTo + 'T23:59:59.999');
    }
    if (departmentId) {
      where.departments = { some: { departmentId: parseInt(departmentId) } };
    }

    const preadmissions = await prisma.preadmission.findMany({
      where,
      include: {
        departments: { include: { department: true } },
        counselor: { select: { name: true } },
        agent: { select: { name: true, company: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Transform data for Excel
    const excelData = preadmissions.map((p, index) => ({
      'S.No': index + 1,
      'Student Name': p.studentName,
      Phone: p.phone,
      Email: p.email || '',
      Address: p.address || '',
      'Previous College': p.previousCollege || '',
      GPA: p.gpa || '',
      Departments:
        p.departments?.map((d) => d.department?.name).join(', ') || '',
      'Referral Source': p.referralSource || '',
      'Referred By': p.referralName || '',
      Agent: p.agent?.name || '',
      'Agent Company': p.agent?.company || '',
      'Inquiry Date': p.date ? new Date(p.date).toLocaleDateString() : '',
      Status: p.status,
      Notes: p.notes || '',
      Counselor: p.counselor?.name || '',
      'Created At': new Date(p.createdAt).toLocaleDateString(),
    }));

    // Create workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    const colWidths = [
      { wch: 6 }, // S.No
      { wch: 25 }, // Student Name
      { wch: 15 }, // Phone
      { wch: 25 }, // Email
      { wch: 30 }, // Address
      { wch: 25 }, // Previous College
      { wch: 8 }, // GPA
      { wch: 30 }, // Departments
      { wch: 15 }, // Referral Source
      { wch: 20 }, // Referred By
      { wch: 20 }, // Agent
      { wch: 20 }, // Agent Company
      { wch: 12 }, // Inquiry Date
      { wch: 12 }, // Status
      { wch: 30 }, // Notes
      { wch: 20 }, // Counselor
      { wch: 12 }, // Created At
    ];
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, 'Preadmissions');

    // Generate buffer
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buf, {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="preadmissions_${
          new Date().toISOString().split('T')[0]
        }.xlsx"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
