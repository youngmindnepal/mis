-- CreateEnum
CREATE TYPE "RoutineStatus" AS ENUM ('active', 'cancelled', 'makeup');

-- CreateTable
CREATE TABLE "Routine" (
    "id" SERIAL NOT NULL,
    "day" INTEGER NOT NULL,
    "timeSlot" INTEGER NOT NULL,
    "timeSlotEnd" INTEGER,
    "subject" TEXT,
    "facultyId" INTEGER NOT NULL,
    "batchId" INTEGER,
    "classroomId" INTEGER,
    "courseId" INTEGER,
    "roomNumber" TEXT,
    "status" "RoutineStatus" NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Routine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Routine_day_timeSlot_idx" ON "Routine"("day", "timeSlot");

-- CreateIndex
CREATE INDEX "Routine_facultyId_idx" ON "Routine"("facultyId");

-- CreateIndex
CREATE INDEX "Routine_batchId_idx" ON "Routine"("batchId");

-- CreateIndex
CREATE INDEX "Routine_classroomId_idx" ON "Routine"("classroomId");

-- CreateIndex
CREATE INDEX "Routine_day_facultyId_idx" ON "Routine"("day", "facultyId");

-- AddForeignKey
ALTER TABLE "Routine" ADD CONSTRAINT "Routine_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES "Faculty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Routine" ADD CONSTRAINT "Routine_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Routine" ADD CONSTRAINT "Routine_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Routine" ADD CONSTRAINT "Routine_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;
