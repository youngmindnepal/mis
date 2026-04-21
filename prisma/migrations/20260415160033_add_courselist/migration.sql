-- CreateTable
CREATE TABLE "CourseList" (
    "id" SERIAL NOT NULL,
    "departmentId" INTEGER NOT NULL,
    "batchId" INTEGER NOT NULL,
    "courseId" INTEGER NOT NULL,
    "semester" "Semester" NOT NULL DEFAULT 'semester1',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseList_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CourseList_batchId_idx" ON "CourseList"("batchId");

-- CreateIndex
CREATE INDEX "CourseList_courseId_idx" ON "CourseList"("courseId");

-- CreateIndex
CREATE INDEX "CourseList_semester_idx" ON "CourseList"("semester");

-- CreateIndex
CREATE UNIQUE INDEX "CourseList_batchId_courseId_semester_key" ON "CourseList"("batchId", "courseId", "semester");

-- AddForeignKey
ALTER TABLE "CourseList" ADD CONSTRAINT "CourseList_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseList" ADD CONSTRAINT "CourseList_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseList" ADD CONSTRAINT "CourseList_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
