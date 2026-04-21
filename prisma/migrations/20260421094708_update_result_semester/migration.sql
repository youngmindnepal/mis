/*
  Warnings:

  - A unique constraint covering the columns `[studentId,courseId,examCategory,attempt]` on the table `Result` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Result_studentId_courseId_examCategory_key";

-- DropIndex
DROP INDEX "Result_studentId_examId_key";

-- CreateIndex
CREATE INDEX "Result_attempt_idx" ON "Result"("attempt");

-- CreateIndex
CREATE UNIQUE INDEX "Result_studentId_courseId_examCategory_attempt_key" ON "Result"("studentId", "courseId", "examCategory", "attempt");
