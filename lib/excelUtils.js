// lib/excelUtils.js
import * as XLSX from 'xlsx';

// Export students to Excel
export const exportToExcel = (students, filename = 'students_data') => {
  // Prepare data for export
  const exportData = students.map((student) => ({
    'Student ID': student.id,
    'Full Name': student.user?.name || '',
    Email: student.user?.email || '',
    Phone: student.phone || '',
    'Roll Number': student.rollNumber || '',
    'Registration Number': student.registrationNumber || '',
    'Exam Roll Number': student.examRollNumber || '',
    Batch: student.batch?.name || '',
    Department: student.batch?.department?.name || '',
    'Enrollment Date': student.enrollmentDate
      ? new Date(student.enrollmentDate).toLocaleDateString()
      : '',
    'Date of Birth': student.dateOfBirth
      ? new Date(student.dateOfBirth).toLocaleDateString()
      : '',
    'Blood Group': student.bloodGroup || '',
    'Guardian Name': student.guardianName || '',
    'Guardian Contact': student.guardianContact || '',
    'Guardian Email': student.guardianEmail || '',
    'Emergency Contact': student.emergencyContact || '',
    Address: student.address || '',
    Status: student.status || '',
    'Created At': student.createdAt
      ? new Date(student.createdAt).toLocaleDateString()
      : '',
  }));

  // Create worksheet
  const ws = XLSX.utils.json_to_sheet(exportData);

  // Set column widths
  const colWidths = [
    { wch: 10 }, // Student ID
    { wch: 20 }, // Full Name
    { wch: 25 }, // Email
    { wch: 15 }, // Phone
    { wch: 15 }, // Roll Number
    { wch: 20 }, // Registration Number
    { wch: 15 }, // Exam Roll Number
    { wch: 15 }, // Batch
    { wch: 20 }, // Department
    { wch: 15 }, // Enrollment Date
    { wch: 15 }, // Date of Birth
    { wch: 10 }, // Blood Group
    { wch: 20 }, // Guardian Name
    { wch: 15 }, // Guardian Contact
    { wch: 25 }, // Guardian Email
    { wch: 15 }, // Emergency Contact
    { wch: 30 }, // Address
    { wch: 10 }, // Status
    { wch: 15 }, // Created At
  ];
  ws['!cols'] = colWidths;

  // Create workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Students');

  // Generate Excel file
  XLSX.writeFile(
    wb,
    `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`
  );
};

// Import students from Excel
export const importFromExcel = (file, batches, onProgress) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);

        const errors = [];
        const validStudents = [];

        for (let i = 0; i < jsonData.length; i++) {
          const row = jsonData[i];
          const rowNumber = i + 2; // +2 because Excel rows start at 1 and header is row 1

          // Validate required fields
          if (!row['Full Name'] || !row['Email'] || !row['Phone']) {
            errors.push({
              row: rowNumber,
              error: 'Name, Email, and Phone are required',
            });
            continue;
          }

          // Validate email format
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(row['Email'])) {
            errors.push({
              row: rowNumber,
              error: 'Invalid email format',
            });
            continue;
          }

          // Validate phone format (10 digits)
          const phoneStr = row['Phone'].toString().replace(/\D/g, '');
          if (phoneStr.length !== 10) {
            errors.push({
              row: rowNumber,
              error: 'Phone number must be 10 digits',
            });
            continue;
          }

          // Find batch by name
          let batchId = null;
          if (row['Batch']) {
            const batch = batches.find(
              (b) =>
                b.name.toLowerCase() === row['Batch'].toLowerCase() ||
                b.academicYear?.toLowerCase() === row['Batch'].toLowerCase()
            );
            if (batch) {
              batchId = batch.id;
            } else {
              errors.push({
                row: rowNumber,
                error: `Batch "${row['Batch']}" not found`,
              });
              continue;
            }
          }

          // Parse dates
          let enrollmentDate = null;
          if (row['Enrollment Date']) {
            enrollmentDate = parseExcelDate(row['Enrollment Date']);
            if (!enrollmentDate) {
              errors.push({
                row: rowNumber,
                error: 'Invalid enrollment date format',
              });
              continue;
            }
          }

          let dateOfBirth = null;
          if (row['Date of Birth']) {
            dateOfBirth = parseExcelDate(row['Date of Birth']);
            if (!dateOfBirth) {
              errors.push({
                row: rowNumber,
                error: 'Invalid date of birth format',
              });
              continue;
            }
          }

          validStudents.push({
            name: row['Full Name'].trim(),
            email: row['Email'].trim().toLowerCase(),
            phone: phoneStr,
            address: row['Address'] || '',
            rollNumber: row['Roll Number'] || null,
            registrationNumber: row['Registration Number'] || null,
            examRollNumber: row['Exam Roll Number'] || null,
            enrollmentDate: enrollmentDate,
            dateOfBirth: dateOfBirth,
            bloodGroup: row['Blood Group'] || null,
            guardianName: row['Guardian Name'] || null,
            guardianContact: row['Guardian Contact'] || null,
            guardianEmail: row['Guardian Email'] || null,
            emergencyContact: row['Emergency Contact'] || null,
            batchId: batchId,
            status:
              row['Status']?.toLowerCase() === 'active'
                ? 'active'
                : row['Status']?.toLowerCase() === 'inactive'
                ? 'inactive'
                : row['Status']?.toLowerCase() === 'graduated'
                ? 'graduated'
                : row['Status']?.toLowerCase() === 'transferred'
                ? 'transferred'
                : row['Status']?.toLowerCase() === 'suspended'
                ? 'suspended'
                : 'active',
          });

          if (onProgress) {
            onProgress((i + 1) / jsonData.length);
          }
        }

        resolve({ students: validStudents, errors });
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};

// Helper function to parse Excel dates
const parseExcelDate = (dateValue) => {
  if (!dateValue) return null;

  // If it's a number (Excel serial date)
  if (typeof dateValue === 'number') {
    const date = new Date((dateValue - 25569) * 86400 * 1000);
    return date.toISOString().split('T')[0];
  }

  // If it's a string
  const dateStr = dateValue.toString();
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }

  return null;
};

// Download template for import
export const downloadTemplate = () => {
  const template = [
    {
      'Full Name': 'John Doe',
      Email: 'john.doe@example.com',
      Phone: '9876543210',
      'Roll Number': '2024CS001',
      'Registration Number': 'REG2024001',
      'Exam Roll Number': 'EXAM001',
      Batch: 'Batch 2024',
      'Enrollment Date': '2024-01-15',
      'Date of Birth': '2000-01-01',
      'Blood Group': 'O+',
      'Guardian Name': 'Jane Doe',
      'Guardian Contact': '9876543211',
      'Guardian Email': 'jane.doe@example.com',
      'Emergency Contact': '9876543212',
      Address: '123 Main Street, City, Country',
      Status: 'active',
    },
  ];

  const ws = XLSX.utils.json_to_sheet(template);

  // Set column widths
  const colWidths = [
    { wch: 20 }, // Full Name
    { wch: 25 }, // Email
    { wch: 15 }, // Phone
    { wch: 15 }, // Roll Number
    { wch: 20 }, // Registration Number
    { wch: 15 }, // Exam Roll Number
    { wch: 15 }, // Batch
    { wch: 15 }, // Enrollment Date
    { wch: 15 }, // Date of Birth
    { wch: 10 }, // Blood Group
    { wch: 20 }, // Guardian Name
    { wch: 15 }, // Guardian Contact
    { wch: 25 }, // Guardian Email
    { wch: 15 }, // Emergency Contact
    { wch: 30 }, // Address
    { wch: 10 }, // Status
  ];
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Student Template');
  XLSX.writeFile(wb, 'student_import_template.xlsx');
};
