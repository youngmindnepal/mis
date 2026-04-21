-- CreateEnum
CREATE TYPE "ExamCategory" AS ENUM ('regular', 'supplementary');

-- AlterTable
ALTER TABLE "Result" ADD COLUMN     "examCategory" "ExamCategory" NOT NULL DEFAULT 'regular';

-- CreateIndex
CREATE INDEX "Result_examCategory_idx" ON "Result"("examCategory");
