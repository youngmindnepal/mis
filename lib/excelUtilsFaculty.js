// lib/excelUtilsFaculty.js
import * as XLSX from 'xlsx';

// Export faculty to Excel
export const exportFacultyToExcel = (faculty, filename = 'faculty_export') => {
  try {
    const exportData = faculty.map((member) => ({
      ID: member.id,
      'Full Name': member.name,
      Email: member.email,
      Phone: member.phone,
      Designation: member.designation || '',
      Qualification: member.qualification || '',
      Specialization: member.specialization || '',
      'Joined Date': member.joinedDate
        ? new Date(member.joinedDate).toLocaleDateString()
        : '',
      Status: member.status.replace('_', ' '),
      Address: member.address || '',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wscols = Object.keys(exportData[0] || {}).map(() => ({ wch: 15 }));
    ws['!cols'] = wscols;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Faculty');
    XLSX.writeFile(wb, `${filename}.xlsx`);

    return true;
  } catch (error) {
    console.error('Error exporting faculty:', error);
    throw error;
  }
};

// Download template for faculty import
export const downloadFacultyTemplate = () => {
  try {
    const templateData = [
      {
        'Full Name': 'John Doe',
        Email: 'john.doe@example.com',
        Phone: '9876543210',
        Designation: 'Professor',
        Qualification: 'PhD in Computer Science',
        Specialization: 'Artificial Intelligence',
        'Joined Date': '2024-01-15',
        Status: 'active',
        Address: 'Kathmandu, Nepal',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wscols = Object.keys(templateData[0]).map(() => ({ wch: 20 }));
    ws['!cols'] = wscols;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Faculty Template');

    const instructionsData = [
      { Instruction: 'Faculty Import Instructions' },
      { Instruction: '' },
      { Instruction: 'Required Fields:' },
      { Instruction: "1. Full Name - Faculty member's full name" },
      { Instruction: '2. Email - Must be unique' },
      { Instruction: '3. Phone - Must be 10 digits, unique' },
      { Instruction: '' },
      { Instruction: 'Optional Fields:' },
      { Instruction: 'Designation - Professor, Associate Professor, etc.' },
      { Instruction: 'Qualification - Highest educational qualification' },
      { Instruction: 'Specialization - Area of expertise' },
      { Instruction: 'Joined Date - Format: YYYY-MM-DD' },
      { Instruction: 'Status - active, inactive, on_leave, retired' },
      { Instruction: 'Address - Residential address' },
      { Instruction: '' },
      { Instruction: 'Valid Status Values:' },
      { Instruction: '- active' },
      { Instruction: '- inactive' },
      { Instruction: '- on_leave' },
      { Instruction: '- retired' },
    ];

    const instructionsWs = XLSX.utils.json_to_sheet(instructionsData);
    XLSX.utils.book_append_sheet(wb, instructionsWs, 'Instructions');
    XLSX.writeFile(wb, 'faculty_import_template.xlsx');

    return true;
  } catch (error) {
    console.error('Error downloading faculty template:', error);
    throw error;
  }
};

// Import faculty from Excel
export const importFacultyFromExcel = async (file, onProgress) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const errors = [];
        const faculty = [];

        for (let i = 0; i < jsonData.length; i++) {
          const row = jsonData[i];
          const rowNumber = i + 2;

          try {
            if (!row['Full Name'] || !row['Full Name'].toString().trim()) {
              errors.push({
                row: rowNumber,
                error: 'Full Name is required',
                data: row,
              });
              continue;
            }

            if (!row['Email'] || !row['Email'].toString().trim()) {
              errors.push({
                row: rowNumber,
                error: 'Email is required',
                data: row,
              });
              continue;
            }

            if (!row['Phone'] || !row['Phone'].toString().trim()) {
              errors.push({
                row: rowNumber,
                error: 'Phone is required',
                data: row,
              });
              continue;
            }

            const phoneValue = row['Phone'].toString().replace(/\D/g, '');
            if (!/^[0-9]{10}$/.test(phoneValue)) {
              errors.push({
                row: rowNumber,
                error: 'Phone must be 10 digits',
                data: row,
              });
              continue;
            }

            let status = 'active';
            if (row['Status']) {
              const statusValue = row['Status']
                .toString()
                .toLowerCase()
                .replace(' ', '_');
              if (
                ['active', 'inactive', 'on_leave', 'retired'].includes(
                  statusValue
                )
              ) {
                status = statusValue;
              } else {
                errors.push({
                  row: rowNumber,
                  error:
                    'Status must be active, inactive, on_leave, or retired',
                  data: row,
                });
                continue;
              }
            }

            let joinedDate = null;
            if (row['Joined Date']) {
              joinedDate = new Date(row['Joined Date']);
              if (isNaN(joinedDate.getTime())) {
                errors.push({
                  row: rowNumber,
                  error: 'Invalid date format. Use YYYY-MM-DD',
                  data: row,
                });
                continue;
              }
            }

            const facultyMember = {
              name: row['Full Name'].toString().trim(),
              email: row['Email'].toString().trim().toLowerCase(),
              phone: phoneValue,
              designation: row['Designation']
                ? row['Designation'].toString().trim()
                : null,
              qualification: row['Qualification']
                ? row['Qualification'].toString().trim()
                : null,
              specialization: row['Specialization']
                ? row['Specialization'].toString().trim()
                : null,
              joinedDate: joinedDate
                ? joinedDate.toISOString()
                : new Date().toISOString(),
              status: status,
              address: row['Address'] ? row['Address'].toString().trim() : null,
            };

            faculty.push(facultyMember);

            if (onProgress) {
              onProgress((i + 1) / jsonData.length);
            }
          } catch (error) {
            errors.push({ row: rowNumber, error: error.message, data: row });
          }
        }

        resolve({ faculty, errors });
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsArrayBuffer(file);
  });
};
