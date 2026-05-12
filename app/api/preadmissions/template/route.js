import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export async function GET() {
  try {
    const templateData = [
      {
        'Student Name': 'John Doe',
        Phone: '9841123456',
        Email: 'john@email.com',
        Address: 'Kathmandu, Nepal',
        'Previous College': 'ABC College',
        GPA: '3.5',
        Departments: 'Computer Science, Management',
        'Referral Source': 'facebook',
        'Referred By': '',
        Agent: '',
        Notes: 'Interested in BSc CSIT',
        Status: 'pending',
      },
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(templateData);

    // Add instructions sheet
    const instructionsData = [
      {
        Field: 'Student Name',
        Required: 'Yes',
        Description: 'Full name of the student',
      },
      { Field: 'Phone', Required: 'Yes', Description: 'Contact phone number' },
      { Field: 'Email', Required: 'No', Description: 'Email address' },
      { Field: 'Address', Required: 'No', Description: 'Physical address' },
      {
        Field: 'Previous College',
        Required: 'No',
        Description: 'Previous college/school name',
      },
      {
        Field: 'GPA',
        Required: 'No',
        Description: 'GPA or percentage (e.g., 3.5)',
      },
      {
        Field: 'Departments',
        Required: 'Yes',
        Description: 'Comma-separated department names',
      },
      {
        Field: 'Referral Source',
        Required: 'No',
        Description:
          'facebook, instagram, youtube, students, website, newspaper, referred_by, agent, other',
      },
      {
        Field: 'Referred By',
        Required: 'No',
        Description:
          'Name of person who referred (if referral source is referred_by)',
      },
      {
        Field: 'Agent',
        Required: 'No',
        Description: 'Agent name (must match existing agent)',
      },
      { Field: 'Notes', Required: 'No', Description: 'Additional notes' },
      {
        Field: 'Status',
        Required: 'No',
        Description:
          'pending, contacted, follow_up, enrolled, rejected (default: pending)',
      },
    ];
    const ws2 = XLSX.utils.json_to_sheet(instructionsData);
    ws2['!cols'] = [{ wch: 20 }, { wch: 10 }, { wch: 60 }];

    XLSX.utils.book_append_sheet(wb, ws, 'Preadmissions');
    XLSX.utils.book_append_sheet(wb, ws2, 'Instructions');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buf, {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition':
          'attachment; filename="preadmission_template.xlsx"',
      },
    });
  } catch (error) {
    console.error('Template error:', error);
    return NextResponse.json(
      { error: 'Template generation failed' },
      { status: 500 }
    );
  }
}
