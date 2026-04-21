/*
  Warnings:

  - You are about to drop the column `publishedAt` on the `Result` table. All the data in the column will be lost.
  - You are about to drop the column `resultPublishedDate` on the `Result` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Result" DROP COLUMN "publishedAt",
DROP COLUMN "resultPublishedDate",
ADD COLUMN     "resultDate" TIMESTAMP(3);
