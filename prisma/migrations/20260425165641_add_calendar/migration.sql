-- CreateEnum
CREATE TYPE "CalendarEventType" AS ENUM ('semester_start', 'semester_end', 'holiday', 'first_term_start', 'first_term_end', 'second_term_start', 'second_term_end', 'exam_preparation', 'exam_start', 'exam_end', 'result_publication', 'supplementary_exam', 'college_event', 'meeting', 'other');

-- CreateEnum
CREATE TYPE "NoticeType" AS ENUM ('holiday_notice', 'exam_notice', 'result_notice', 'class_start_notice', 'general_notice');

-- CreateTable
CREATE TABLE "AcademicCalendar" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "eventType" "CalendarEventType" NOT NULL,
    "semester" "Semester",
    "batchId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademicCalendar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarNotice" (
    "id" SERIAL NOT NULL,
    "calendarId" INTEGER NOT NULL,
    "noticeType" "NoticeType" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarNotice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AcademicCalendar_date_idx" ON "AcademicCalendar"("date");

-- CreateIndex
CREATE INDEX "AcademicCalendar_eventType_idx" ON "AcademicCalendar"("eventType");

-- AddForeignKey
ALTER TABLE "AcademicCalendar" ADD CONSTRAINT "AcademicCalendar_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarNotice" ADD CONSTRAINT "CalendarNotice_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "AcademicCalendar"("id") ON DELETE CASCADE ON UPDATE CASCADE;
