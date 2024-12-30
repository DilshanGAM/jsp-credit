-- CreateTable
CREATE TABLE "visit" (
    "id" SERIAL NOT NULL,
    "startDateTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "collectorId" TEXT NOT NULL,
    "endDateTime" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'started',
    "managerId" TEXT NOT NULL,

    CONSTRAINT "visit_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "visit" ADD CONSTRAINT "visit_collectorId_fkey" FOREIGN KEY ("collectorId") REFERENCES "User"("nic") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visit" ADD CONSTRAINT "visit_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("nic") ON DELETE RESTRICT ON UPDATE CASCADE;
