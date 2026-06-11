/*
  Warnings:

  - A unique constraint covering the columns `[sequenceId]` on the table `Journal` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Journal" ADD COLUMN     "sequenceId" TEXT;

-- CreateTable
CREATE TABLE "Sequence" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "padding" INTEGER NOT NULL,
    "nextNumber" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sequence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Sequence_code_key" ON "Sequence"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Journal_sequenceId_key" ON "Journal"("sequenceId");

-- AddForeignKey
ALTER TABLE "Journal" ADD CONSTRAINT "Journal_sequenceId_fkey" FOREIGN KEY ("sequenceId") REFERENCES "Sequence"("id") ON DELETE SET NULL ON UPDATE CASCADE;
