/*
  Warnings:

  - The values [REVERSED] on the enum `MoveState` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `sequenceId` on the `Journal` table. All the data in the column will be lost.
  - You are about to drop the column `reversalOfId` on the `JournalMove` table. All the data in the column will be lost.
  - You are about to drop the `Sequence` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `StockMove` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "MoveState_new" AS ENUM ('DRAFT', 'POSTED');
ALTER TABLE "public"."JournalMove" ALTER COLUMN "state" DROP DEFAULT;
ALTER TABLE "JournalMove" ALTER COLUMN "state" TYPE "MoveState_new" USING ("state"::text::"MoveState_new");
ALTER TYPE "MoveState" RENAME TO "MoveState_old";
ALTER TYPE "MoveState_new" RENAME TO "MoveState";
DROP TYPE "public"."MoveState_old";
ALTER TABLE "JournalMove" ALTER COLUMN "state" SET DEFAULT 'DRAFT';
COMMIT;

-- DropForeignKey
ALTER TABLE "Journal" DROP CONSTRAINT "Journal_sequenceId_fkey";

-- DropForeignKey
ALTER TABLE "JournalMove" DROP CONSTRAINT "JournalMove_reversalOfId_fkey";

-- DropForeignKey
ALTER TABLE "StockMove" DROP CONSTRAINT "StockMove_partnerId_fkey";

-- DropForeignKey
ALTER TABLE "StockMove" DROP CONSTRAINT "StockMove_productId_fkey";

-- DropIndex
DROP INDEX "Journal_sequenceId_key";

-- DropIndex
DROP INDEX "JournalMove_reversalOfId_key";

-- AlterTable
ALTER TABLE "Journal" DROP COLUMN "sequenceId";

-- AlterTable
ALTER TABLE "JournalMove" DROP COLUMN "reversalOfId";

-- DropTable
DROP TABLE "Sequence";

-- DropTable
DROP TABLE "StockMove";

-- DropEnum
DROP TYPE "StockMoveType";
