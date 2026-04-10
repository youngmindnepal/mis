// lib/excelUtilsCourses.js
import * as XLSX from 'xlsx';

// Helper function to get semester label
const getSemesterLabel = (semester) => {
  const semesters = {
    semester1: 'Semester 1',
    semester2: 'Semester 2',
    semester3: 'Semester 3',
    semester4: 'Semester 4',
    semester5: 'Semester 5',
    semester6: 'Semester 6',
    semester7: 'Semester 7',
    semester8: 'Semester 8',
  };
  return semesters[semester] || semester;
};

// Helper function to get semester value from label
const getSemesterValue = (label) => {
  const semesterMap = {
    'Semester 1': 'semester1',
    'Semester 2': 'semester2',
    'Semester 3': 'semester3',
    'Semester 4': 'semester4',
    'Semester 5': 'semester5',
    'Semester 6': 'semester6',
    'Semester 7': 'semester7',
    'Semester 8': 'semester8',
  };
  return semesterMap[label] || label;
};

// Export courses to Excel
export const exportCoursesToExcel = (courses, filename = 'courses_export') => {
  try {
    const exportData = courses.map((course) => ({
      'Course Name': course.name,
      'Course Code': course.code,
      Credits: course.credits || '',
      Description: course.description || '',
      'Lecture Hours': course.lecture !== undefined ? course.lecture : '',
      'Tutorial Hours': course.tutorial !== undefined ? course.tutorial : '',
      'Practical Hours': course.practical !== undefined ? course.practical : '',
      'Non-Credit': course.noncredit ? 'Yes' : 'No',
      'Course Type': course.couresetype === 'core' ? 'Core' : 'Elective',
      Semester: getSemesterLabel(course.semester),
      Department: course.department?.name || '',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wscols = Object.keys(exportData[0] || {}).map(() => ({ wch: 15 }));
    ws['!cols'] = wscols;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Courses');
    XLSX.writeFile(wb, `${filename}.xlsx`);

    return true;
  } catch (error) {
    console.error('Error exporting courses:', error);
    throw error;
  }
};

// Download template for course import
export const downloadCourseTemplate = () => {
  try {
    const templateData = [
      {
        'Course Name': 'Introduction to Computer Science',
        'Course Code': 'CS101',
        Credits: 3,
        Description:
          'Basic concepts of computer science including programming fundamentals',
        'Lecture Hours': 3,
        'Tutorial Hours': 0,
        'Practical Hours': 2,
        'Non-Credit': 'No',
        'Course Type': 'Core',
        Semester: 'Semester 1',
        Department: 'Computer Science',
      },
      {
        'Course Name': 'Advanced Mathematics',
        'Course Code': 'MATH201',
        Credits: 4,
        Description: 'Advanced mathematical concepts for engineering',
        'Lecture Hours': 4,
        'Tutorial Hours': 1,
        'Practical Hours': 0,
        'Non-Credit': 'No',
        'Course Type': 'Core',
        Semester: 'Semester 2',
        Department: 'Mathematics',
      },
      {
        'Course Name': 'Web Development Elective',
        'Course Code': 'WEB301',
        Credits: 3,
        Description: 'Modern web development technologies',
        'Lecture Hours': 2,
        'Tutorial Hours': 0,
        'Practical Hours': 3,
        'Non-Credit': 'No',
        'Course Type': 'Elective',
        Semester: 'Semester 3',
        Department: 'Computer Science',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wscols = Object.keys(templateData[0]).map(() => ({ wch: 20 }));
    ws['!cols'] = wscols;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Course Template');

    const instructionsData = [
      { Instruction: 'Course Import Instructions' },
      { Instruction: '' },
      { Instruction: 'Required Fields:' },
      { Instruction: '1. Course Name - Must be unique' },
      {
        Instruction:
          '2. Course Code - Must be unique, 3-10 alphanumeric characters',
      },
      { Instruction: '' },
      { Instruction: 'Optional Fields:' },
      { Instruction: 'Credits - Number of credits (0-12)' },
      { Instruction: 'Lecture Hours - Hours per week (0-40)' },
      { Instruction: 'Tutorial Hours - Hours per week (0-20)' },
      { Instruction: 'Practical Hours - Hours per week (0-30)' },
      { Instruction: 'Non-Credit - Yes/No (default: No)' },
      { Instruction: 'Course Type - Core/Elective (default: Core)' },
      { Instruction: 'Semester - Semester 1-8 (default: Semester 1)' },
      {
        Instruction:
          'Department - Department name (must match existing department)',
      },
    ];

    const instructionsWs = XLSX.utils.json_to_sheet(instructionsData);
    XLSX.utils.book_append_sheet(wb, instructionsWs, 'Instructions');
    XLSX.writeFile(wb, 'course_import_template.xlsx');

    return true;
  } catch (error) {
    console.error('Error downloading course template:', error);
    throw error;
  }
};

// Import courses from Excel
export const importCoursesFromExcel = async (file, departments, onProgress) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const errors = [];
        const courses = [];

        const departmentMap = new Map();
        departments.forEach((dept) => {
          departmentMap.set(dept.name.toLowerCase(), dept.id);
          departmentMap.set(dept.code.toLowerCase(), dept.id);
        });

        for (let i = 0; i < jsonData.length; i++) {
          const row = jsonData[i];
          const rowNumber = i + 2;

          try {
            if (!row['Course Name'] || !row['Course Name'].toString().trim()) {
              errors.push({
                row: rowNumber,
                error: 'Course Name is required',
                data: row,
              });
              continue;
            }

            if (!row['Course Code'] || !row['Course Code'].toString().trim()) {
              errors.push({
                row: rowNumber,
                error: 'Course Code is required',
                data: row,
              });
              continue;
            }

            const courseCode = row['Course Code']
              .toString()
              .trim()
              .toUpperCase();
            if (!/^[A-Z0-9]{3,10}$/.test(courseCode)) {
              errors.push({
                row: rowNumber,
                error: 'Course Code must be 3-10 alphanumeric characters',
                data: row,
              });
              continue;
            }

            let credits = null;
            if (row['Credits'] !== undefined && row['Credits'] !== '') {
              const creditsValue = parseFloat(row['Credits']);
              if (isNaN(creditsValue)) {
                errors.push({
                  row: rowNumber,
                  error: 'Credits must be a number',
                  data: row,
                });
                continue;
              }
              if (creditsValue < 0 || creditsValue > 12) {
                errors.push({
                  row: rowNumber,
                  error: 'Credits must be between 0 and 12',
                  data: row,
                });
                continue;
              }
              credits = creditsValue;
            }

            let lecture = null;
            if (
              row['Lecture Hours'] !== undefined &&
              row['Lecture Hours'] !== ''
            ) {
              const lectureValue = parseInt(row['Lecture Hours']);
              if (isNaN(lectureValue)) {
                errors.push({
                  row: rowNumber,
                  error: 'Lecture Hours must be a number',
                  data: row,
                });
                continue;
              }
              if (lectureValue < 0 || lectureValue > 40) {
                errors.push({
                  row: rowNumber,
                  error: 'Lecture Hours must be between 0 and 40',
                  data: row,
                });
                continue;
              }
              lecture = lectureValue;
            }

            let tutorial = null;
            if (
              row['Tutorial Hours'] !== undefined &&
              row['Tutorial Hours'] !== ''
            ) {
              const tutorialValue = parseInt(row['Tutorial Hours']);
              if (isNaN(tutorialValue)) {
                errors.push({
                  row: rowNumber,
                  error: 'Tutorial Hours must be a number',
                  data: row,
                });
                continue;
              }
              if (tutorialValue < 0 || tutorialValue > 20) {
                errors.push({
                  row: rowNumber,
                  error: 'Tutorial Hours must be between 0 and 20',
                  data: row,
                });
                continue;
              }
              tutorial = tutorialValue;
            }

            let practical = null;
            if (
              row['Practical Hours'] !== undefined &&
              row['Practical Hours'] !== ''
            ) {
              const practicalValue = parseInt(row['Practical Hours']);
              if (isNaN(practicalValue)) {
                errors.push({
                  row: rowNumber,
                  error: 'Practical Hours must be a number',
                  data: row,
                });
                continue;
              }
              if (practicalValue < 0 || practicalValue > 30) {
                errors.push({
                  row: rowNumber,
                  error: 'Practical Hours must be between 0 and 30',
                  data: row,
                });
                continue;
              }
              practical = practicalValue;
            }

            let noncredit = false;
            if (row['Non-Credit']) {
              const noncreditValue = row['Non-Credit'].toString().toLowerCase();
              noncredit = noncreditValue === 'yes' || noncreditValue === 'true';
            }

            let couresetype = 'core';
            if (row['Course Type']) {
              const typeValue = row['Course Type'].toString().toLowerCase();
              if (typeValue === 'elective') {
                couresetype = 'elective';
              } else if (typeValue !== 'core') {
                errors.push({
                  row: rowNumber,
                  error: 'Course Type must be "Core" or "Elective"',
                  data: row,
                });
                continue;
              }
            }

            let semester = 'semester1';
            if (row['Semester']) {
              const semesterValue = getSemesterValue(
                row['Semester'].toString().trim()
              );
              if (!semesterValue || !semesterValue.startsWith('semester')) {
                errors.push({
                  row: rowNumber,
                  error: 'Semester must be "Semester 1" through "Semester 8"',
                  data: row,
                });
                continue;
              }
              semester = semesterValue;
            }

            let departmentId = null;
            if (row['Department']) {
              const departmentName = row['Department'].toString().trim();
              const deptId = departmentMap.get(departmentName.toLowerCase());
              if (!deptId) {
                errors.push({
                  row: rowNumber,
                  error: `Department "${departmentName}" not found`,
                  data: row,
                });
                continue;
              }
              departmentId = deptId;
            }

            const course = {
              name: row['Course Name'].toString().trim(),
              code: courseCode,
              credits: credits,
              description: row['Description']
                ? row['Description'].toString().trim()
                : '',
              lecture: lecture,
              tutorial: tutorial,
              practical: practical,
              noncredit: noncredit,
              couresetype: couresetype,
              semester: semester,
              departmentId: departmentId,
            };

            courses.push(course);

            if (onProgress) {
              onProgress((i + 1) / jsonData.length);
            }
          } catch (error) {
            errors.push({ row: rowNumber, error: error.message, data: row });
          }
        }

        resolve({ courses, errors });
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
