/*
  Warnings:

  - You are about to drop the column `examDays` on the `RoutineConfig` table. All the data in the column will be lost.
  - You are about to drop the column `semesterDuration` on the `RoutineConfig` table. All the data in the column will be lost.
  - You are about to drop the column `termCount` on the `RoutineConfig` table. All the data in the column will be lost.
  - You are about to drop the column `termWeeks` on the `RoutineConfig` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "RoutineConfig" DROP COLUMN "examDays",
DROP COLUMN "semesterDuration",
DROP COLUMN "termCount",
DROP COLUMN "termWeeks";

-- CreateTable
CREATE TABLE "TerminalConfig" (
    "id" SERIAL NOT NULL,
    "batchId" INTEGER NOT NULL,
    "termCount" INTEGER NOT NULL DEFAULT 2,
    "termWeeks" JSONB NOT NULL DEFAULT '[7, 12]',
    "examDays" INTEGER NOT NULL DEFAULT 5,
    "semesterDuration" INTEGER NOT NULL DEFAULT 16,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TerminalConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TerminalConfig_batchId_key" ON "TerminalConfig"("batchId");

-- AddForeignKey
ALTER TABLE "TerminalConfig" ADD CONSTRAINT "TerminalConfig_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
