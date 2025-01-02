/*
  Warnings:

  - Added the required column `visitId` to the `payment` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "payment" ADD COLUMN     "visitId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "visit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
