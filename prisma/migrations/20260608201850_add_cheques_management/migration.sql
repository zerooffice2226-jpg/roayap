-- CreateEnum
CREATE TYPE "ChequeType" AS ENUM ('RECEIPT', 'PAYMENT');

-- CreateEnum
CREATE TYPE "ChequeState" AS ENUM ('PENDING', 'CLEARED', 'REJECTED');

-- AlterTable
ALTER TABLE "Journal" ADD COLUMN     "defaultAccountId" TEXT;

-- CreateTable
CREATE TABLE "Cheque" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "type" "ChequeType" NOT NULL,
    "state" "ChequeState" NOT NULL DEFAULT 'PENDING',
    "partnerId" TEXT NOT NULL,
    "journalMoveId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cheque_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Cheque_journalMoveId_key" ON "Cheque"("journalMoveId");

-- AddForeignKey
ALTER TABLE "Cheque" ADD CONSTRAINT "Cheque_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cheque" ADD CONSTRAINT "Cheque_journalMoveId_fkey" FOREIGN KEY ("journalMoveId") REFERENCES "JournalMove"("id") ON DELETE SET NULL ON UPDATE CASCADE;
