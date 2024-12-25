/*
  Warnings:

  - Added the required column `issuedDate` to the `Loan` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Loan" ADD COLUMN     "issuedDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;
