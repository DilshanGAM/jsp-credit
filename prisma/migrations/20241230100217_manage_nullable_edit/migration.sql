-- DropForeignKey
ALTER TABLE "visit" DROP CONSTRAINT "visit_managerId_fkey";

-- AlterTable
ALTER TABLE "visit" ALTER COLUMN "managerId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "visit" ADD CONSTRAINT "visit_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("nic") ON DELETE SET NULL ON UPDATE CASCADE;
