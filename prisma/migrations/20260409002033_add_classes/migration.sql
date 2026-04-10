/*
  Warnings:

  - A unique constraint covering the columns `[examRollNumber]` on the table `Student` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "examRollNumber" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Student_examRollNumber_key" ON "Student"("examRollNumber");
