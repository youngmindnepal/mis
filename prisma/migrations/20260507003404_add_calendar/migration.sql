-- CreateTable
CREATE TABLE "RoutineConfig" (
    "id" SERIAL NOT NULL,
    "batchId" INTEGER NOT NULL,
    "timeSlots" JSONB NOT NULL DEFAULT '[]',
    "startTime" TEXT NOT NULL DEFAULT '07:01',
    "endTime" TEXT NOT NULL DEFAULT '14:00',
    "interval" INTEGER NOT NULL DEFAULT 30,
    "termCount" INTEGER NOT NULL DEFAULT 2,
    "termWeeks" JSONB NOT NULL DEFAULT '[7, 12]',
    "examDays" INTEGER NOT NULL DEFAULT 5,
    "semesterDuration" INTEGER NOT NULL DEFAULT 16,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoutineConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RoutineConfig_batchId_key" ON "RoutineConfig"("batchId");

-- AddForeignKey
ALTER TABLE "RoutineConfig" ADD CONSTRAINT "RoutineConfig_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
