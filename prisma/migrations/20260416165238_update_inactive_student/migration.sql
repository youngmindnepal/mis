/*
  Warnings:

  - A unique constraint covering the columns `[studentId,courseId,examCategory]` on the table `Result` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Result_studentId_courseId_key";

-- CreateIndex
CREATE UNIQUE INDEX "Result_studentId_courseId_examCategory_key" ON "Result"("studentId", "courseId", "examCategory");
