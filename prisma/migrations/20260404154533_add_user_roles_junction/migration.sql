/*
  Warnings:

  - You are about to drop the column `category` on the `Permission` table. All the data in the column will be lost.
  - You are about to drop the `UserRole` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "UserRole" DROP CONSTRAINT "UserRole_roleId_fkey";

-- DropForeignKey
ALTER TABLE "UserRole" DROP CONSTRAINT "UserRole_userId_fkey";

-- DropIndex
DROP INDEX "Permission_action_idx";

-- DropIndex
DROP INDEX "Permission_resource_idx";

-- DropIndex
DROP INDEX "RolePermission_permissionId_idx";

-- DropIndex
DROP INDEX "RolePermission_roleId_idx";

-- AlterTable
ALTER TABLE "Permission" DROP COLUMN "category";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "roleId" INTEGER;

-- DropTable
DROP TABLE "UserRole";

-- CreateIndex
CREATE INDEX "User_roleId_idx" ON "User"("roleId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE SET NULL ON UPDATE CASCADE;
