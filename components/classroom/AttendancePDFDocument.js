// components/classroom/AttendancePDFDocument.jsx
'use client';

import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer';

// Register fonts if needed
Font.register({
  family: 'Inter',
  src: 'https://fonts.gstatic.com/s/inter/v12/UcC73FwrK3iLTeHuS_fvQtMwCp50KnMa1ZL7W0Q5nw.woff2',
});

// Create styles
const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Helvetica',
  },
  title: {
    fontSize: 20,
    marginBottom: 10,
    color: '#1F2937',
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 12,
    marginBottom: 5,
    color: '#6B7280',
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  infoLabel: {
    width: 60,
    fontSize: 10,
    color: '#6B7280',
  },
  infoValue: {
    fontSize: 10,
    color: '#1F2937',
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
    marginBottom: 15,
  },
  statBox: {
    flex: 1,
    padding: 10,
    marginHorizontal: 3,
    borderRadius: 6,
  },
  statLabel: {
    fontSize: 9,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  table: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#4F46E5',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  studentCell: {
    width: '20%',
    padding: 6,
    fontSize: 9,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
  subjectCell: {
    width: '10%',
    padding: 6,
    fontSize: 9,
    textAlign: 'center',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
  headerCell: {
    padding: 6,
    fontSize: 8,
    color: '#FFFFFF',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  studentName: {
    fontWeight: 'bold',
    fontSize: 9,
  },
  studentEmail: {
    fontSize: 7,
    color: '#6B7280',
  },
  inactiveBadge: {
    fontSize: 6,
    color: '#6B7280',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 4,
  },
  percentage: {
    fontWeight: 'bold',
    fontSize: 10,
  },
  percentageGreen: {
    color: '#10B981',
  },
  percentageYellow: {
    color: '#F59E0B',
  },
  percentageRed: {
    color: '#EF4444',
  },
  paText: {
    fontSize: 7,
    color: '#6B7280',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    fontSize: 8,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  pageNumber: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    fontSize: 8,
    color: '#9CA3AF',
  },
});

export default function AttendancePDFDocument({ attendanceData }) {
  const { studentReport, subjects, batch, dateRange } = attendanceData;

  // Calculate column widths based on number of subjects
  const subjectCount = subjects.length;
  const studentCellWidth =
    subjectCount <= 5 ? '25%' : subjectCount <= 8 ? '20%' : '15%';
  const subjectCellWidth =
    subjectCount <= 5
      ? `${75 / subjectCount}%`
      : subjectCount <= 8
      ? `${80 / subjectCount}%`
      : `${85 / subjectCount}%`;

  const getPercentageColor = (percentage) => {
    if (percentage >= 75) return styles.percentageGreen;
    if (percentage >= 60) return styles.percentageYellow;
    return styles.percentageRed;
  };

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* Title */}
        <Text style={styles.title}>Student Attendance Report</Text>

        {/* Batch Info */}
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Batch:</Text>
          <Text style={styles.infoValue}>
            {batch.name} ({batch.academicYear})
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Period:</Text>
          <Text style={styles.infoValue}>
            {dateRange.startDate} to {dateRange.endDate}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Generated:</Text>
          <Text style={styles.infoValue}>
            {new Date().toLocaleDateString()}
          </Text>
        </View>

        {/* Stats Summary */}
        <View style={styles.statsContainer}>
          <View style={[styles.statBox, { backgroundColor: '#F0FDF4' }]}>
            <Text style={[styles.statLabel, { color: '#10B981' }]}>
              Above 75%
            </Text>
            <Text style={[styles.statValue, { color: '#10B981' }]}>
              {attendanceData.studentStats?.above75 || 0}
            </Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: '#FEF3C7' }]}>
            <Text style={[styles.statLabel, { color: '#F59E0B' }]}>
              60% - 75%
            </Text>
            <Text style={[styles.statValue, { color: '#F59E0B' }]}>
              {attendanceData.studentStats?.between60And75 || 0}
            </Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: '#FEF2F2' }]}>
            <Text style={[styles.statLabel, { color: '#EF4444' }]}>
              Below 60%
            </Text>
            <Text style={[styles.statValue, { color: '#EF4444' }]}>
              {attendanceData.studentStats?.below60 || 0}
            </Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: '#F3F4F6' }]}>
            <Text style={[styles.statLabel, { color: '#6B7280' }]}>
              No Attendance
            </Text>
            <Text style={[styles.statValue, { color: '#6B7280' }]}>
              {attendanceData.studentStats?.noAttendance || 0}
            </Text>
          </View>
        </View>

        {/* Table */}
        <View style={styles.table}>
          {/* Header */}
          <View style={styles.tableHeader}>
            <View
              style={[
                styles.headerCell,
                { width: studentCellWidth, textAlign: 'left' },
              ]}
            >
              <Text>Student</Text>
            </View>
            {subjects.map((subject, index) => (
              <View
                key={index}
                style={[styles.headerCell, { width: subjectCellWidth }]}
              >
                <Text>{subject.name}</Text>
                <Text
                  style={{ fontSize: 6, fontWeight: 'normal', marginTop: 2 }}
                >
                  Total: {subject.totalClasses}
                </Text>
              </View>
            ))}
          </View>

          {/* Body */}
          {studentReport.map((student, rowIndex) => (
            <View key={rowIndex} style={styles.tableRow}>
              <View style={[styles.studentCell, { width: studentCellWidth }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.studentName}>{student.studentName}</Text>
                  {student.status !== 'active' && (
                    <Text style={styles.inactiveBadge}>Inactive</Text>
                  )}
                </View>
                <Text style={styles.studentEmail}>
                  {student.email || student.enrollmentNo || 'N/A'}
                </Text>
              </View>
              {student.subjects.map((subject, colIndex) => (
                <View
                  key={colIndex}
                  style={[styles.subjectCell, { width: subjectCellWidth }]}
                >
                  {subject.totalClasses > 0 ? (
                    <>
                      <Text
                        style={[
                          styles.percentage,
                          getPercentageColor(subject.percentage),
                        ]}
                      >
                        {subject.percentage}%
                      </Text>
                      <Text style={styles.paText}>
                        {subject.presentDays}P / {subject.absentDays}A
                      </Text>
                    </>
                  ) : (
                    <Text style={{ fontSize: 9, color: '#9CA3AF' }}>-</Text>
                  )}
                </View>
              ))}
            </View>
          ))}
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          Total Students: {studentReport.length} | Total Subjects:{' '}
          {subjects.length}
        </Text>
        <Text
          style={styles.pageNumber}
          render={({ pageNumber, totalPages }) =>
            `Page ${pageNumber} of ${totalPages}`
          }
          fixed
        />
      </Page>
    </Document>
  );
}
