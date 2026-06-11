/*
  Warnings:

  - A unique constraint covering the columns `[reversalOfId]` on the table `JournalMove` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
ALTER TYPE "MoveState" ADD VALUE 'REVERSED';

-- AlterTable
ALTER TABLE "JournalMove" ADD COLUMN     "reversalOfId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "JournalMove_reversalOfId_key" ON "JournalMove"("reversalOfId");

-- AddForeignKey
ALTER TABLE "JournalMove" ADD CONSTRAINT "JournalMove_reversalOfId_fkey" FOREIGN KEY ("reversalOfId") REFERENCES "JournalMove"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
