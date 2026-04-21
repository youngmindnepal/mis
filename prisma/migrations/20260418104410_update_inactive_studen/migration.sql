-- CreateTable
CREATE TABLE "ExamConfig" (
    "id" SERIAL NOT NULL,
    "batchId" INTEGER NOT NULL,
    "semester" "Semester" NOT NULL,
    "examCategory" "ExamCategory" NOT NULL,
    "resultDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExamConfig_batchId_idx" ON "ExamConfig"("batchId");

-- CreateIndex
CREATE INDEX "ExamConfig_semester_idx" ON "ExamConfig"("semester");

-- CreateIndex
CREATE INDEX "ExamConfig_examCategory_idx" ON "ExamConfig"("examCategory");

-- CreateIndex
CREATE UNIQUE INDEX "ExamConfig_batchId_semester_examCategory_key" ON "ExamConfig"("batchId", "semester", "examCategory");

-- AddForeignKey
ALTER TABLE "ExamConfig" ADD CONSTRAINT "ExamConfig_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
