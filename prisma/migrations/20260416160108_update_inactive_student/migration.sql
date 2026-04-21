-- DropForeignKey
ALTER TABLE "Result" DROP CONSTRAINT "Result_classroomId_fkey";

-- AlterTable
ALTER TABLE "Result" ADD COLUMN     "courseId" INTEGER,
ALTER COLUMN "classroomId" DROP NOT NULL,
ALTER COLUMN "examId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Result" ADD CONSTRAINT "Result_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Result" ADD CONSTRAINT "Result_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;
