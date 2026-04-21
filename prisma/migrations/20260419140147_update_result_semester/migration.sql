-- AlterTable
ALTER TABLE "Result" ADD COLUMN     "attempt" INTEGER,
ADD COLUMN     "semester" "Semester";

-- CreateIndex
CREATE INDEX "Result_semester_idx" ON "Result"("semester");
