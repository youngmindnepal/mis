/*
  Warnings:

  - You are about to drop the column `collegeName` on the `Preadmission` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "AgentStatus" AS ENUM ('active', 'inactive');

-- AlterTable
ALTER TABLE "Preadmission" DROP COLUMN "collegeName",
ADD COLUMN     "agentId" INTEGER,
ADD COLUMN     "previousCollege" TEXT;

-- CreateTable
CREATE TABLE "Agent" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "company" TEXT,
    "commission" DOUBLE PRECISION,
    "status" "AgentStatus" NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Agent_phone_key" ON "Agent"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Agent_email_key" ON "Agent"("email");

-- CreateIndex
CREATE INDEX "Agent_name_idx" ON "Agent"("name");

-- CreateIndex
CREATE INDEX "Agent_phone_idx" ON "Agent"("phone");

-- CreateIndex
CREATE INDEX "Preadmission_referralSource_idx" ON "Preadmission"("referralSource");

-- CreateIndex
CREATE INDEX "Preadmission_agentId_idx" ON "Preadmission"("agentId");

-- AddForeignKey
ALTER TABLE "Preadmission" ADD CONSTRAINT "Preadmission_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
