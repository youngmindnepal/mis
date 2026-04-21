/*
  Warnings:

  - A unique constraint covering the columns `[studentId,courseId]` on the table `Result` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Result_studentId_examId_courseId_key";

-- CreateIndex
CREATE UNIQUE INDEX "Result_studentId_courseId_key" ON "Result"("studentId", "courseId");
