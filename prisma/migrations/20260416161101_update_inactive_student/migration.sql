/*
  Warnings:

  - A unique constraint covering the columns `[studentId,examId,courseId]` on the table `Result` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Result_studentId_examId_courseId_key" ON "Result"("studentId", "examId", "courseId");
