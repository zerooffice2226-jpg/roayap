"use server";

import { prisma } from "@/lib/prisma";

/**
 * Generates the next unique, formatted sequence number for a given journal.
 * This function is designed to be race-condition-safe by using a database-level transaction
 * and a pessimistic lock (`FOR UPDATE`) on the sequence row.
 *
 * @param journalId The ID of the journal for which to generate a sequence.
 * @param tx An optional Prisma transaction client. If not provided, a new transaction is created.
 * @returns A promise that resolves to the formatted sequence string (e.g., "INV/2026/00001").
 */
export async function generateNextSequence(journalId: string, tx: any = prisma): Promise<string> {
    
    // 1. Find the journal and its associated sequence configuration.
    const journal = await tx.journal.findFirst({
        where: { id: journalId },
        include: { sequence: true },
    });

    if (!journal || !journal.sequence) {
        throw new Error(`Sequence configuration not found for journal ID: ${journalId}`);
    }

    const seq = journal.sequence;
    const currentYear = new Date().getFullYear();
    const prefix = `${seq.prefix}${currentYear}/`; // e.g., INV/2026/

    // 2. Lock the sequence row and get the next number.
    // IMPORTANT: We use a raw query with `FOR UPDATE` to acquire a pessimistic lock
    // on the specific sequence row. This is the key to preventing race conditions.
    const lockedSequence: { next_number: number }[] = await tx.$queryRaw`
      SELECT "nextNumber" as next_number FROM "Sequence" WHERE id = ${seq.id} FOR UPDATE;
    `;

    const nextNumber = lockedSequence[0].next_number;

    // 3. Increment the number for the next operation.
    await tx.sequence.update({
        where: { id: seq.id },
        data: { nextNumber: { increment: 1 } },
    });

    // 4. Format the final sequence string.
    const paddedSerial = String(nextNumber).padStart(seq.padding, '0');
    return `${prefix}${paddedSerial}`;
}
