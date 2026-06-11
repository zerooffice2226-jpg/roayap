'use server'

import { prisma } from "@/lib/prisma"

export async function reverseJournalMove(moveId: string, reason: string) {
  return await prisma.$transaction(async (tx) => {
    
    // 1. Fetch and lock the original move to be reversed
    const originalMove = await tx.journalMove.findUnique({
      where: { id: moveId },
      include: { lines: true, journal: true }
    });

    if (!originalMove) throw new Error("Original move not found");
    if (originalMove.state !== "POSTED") throw new Error("Only posted moves can be reversed");

    // 2. Generate a new sequence number for the reversal move
    const journal = originalMove.journal;
    if (!journal) {
        throw new Error('دفتر اليومية المرتبط بهذا القيد غير موجود في النظام');
    }
    const currentYear = new Date().getFullYear();
    const prefix = `R/${journal.code}/${currentYear}/`;

    const lastRevMove = await tx.journalMove.findFirst({
      where: { name: { startsWith: prefix } },
      orderBy: { name: 'desc' },
      select: { name: true }
    });

    let nextNum = 1;
    if (lastRevMove) {
      const parts = lastRevMove.name.split('/');
      nextNum = parseInt(parts[parts.length - 1], 10) + 1;
    }
    const sequenceName = `${prefix}${String(nextNum).padStart(4, '0')}`;

    // 3. Create the reversal Journal Move header
    const reversalMove = await tx.journalMove.create({
      data: {
        name: sequenceName,
        journalId: originalMove.journalId,
        state: "POSTED",
        ref: `Reversal of: ${originalMove.name} - Reason: ${reason}`,
      }
    });

    // 4. Reverse the journal lines
    for (const line of originalMove.lines) {
      const reversedDebit = line.credit;
      const reversedCredit = line.debit;
      const reversedBalance = reversedDebit - reversedCredit;

      // a: Create the reversed journal line
      await tx.journalLine.create({
        data: {
          name: `[REVERSAL] ${line.name}`,
          debit: reversedDebit,
          credit: reversedCredit,
          balance: reversedBalance,
          moveId: reversalMove.id,
          accountId: line.accountId,
          partnerId: line.partnerId
        }
      });

      // b: Instantly update the account balance to reverse the financial impact
      await tx.account.update({
        where: { id: line.accountId },
        data: { currentBalance: { increment: reversedBalance } }
      });
    }

    // 5. Update the state of the original move to REVERSED
    await tx.journalMove.update({
      where: { id: moveId },
      data: { 
        state: "DRAFT",
        ref: `${originalMove.ref || ''} [Reversed by: ${sequenceName}]`
      }
    });

    return { success: true, reversalMoveName: sequenceName };
  });
}
