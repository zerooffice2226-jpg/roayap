'use server'

import { prisma } from "@/lib/prisma"

export async function getPartnerStatement(partnerId: string) {
  // Fetch all financially-relevant journal lines for this partner, sorted chronologically
  const lines = await prisma.journalLine.findMany({
    where: {
      partnerId: partnerId,
      move: { state: "POSTED" } // Only include posted entries
    },
    include: { move: true },
    orderBy: { createdAt: 'asc' }
  });

  let runningBalance = 0;
  
  // Build the statement with a running balance calculated after each transaction
  const statementRows = lines.map((line) => {
    // In receivable accounts (customers): Debit increases balance, Credit decreases it
    runningBalance += (line.debit - line.credit);
    
    return {
      id: line.id,
      date: line.move.date,
      moveName: line.move.name,
      label: line.name,
      debit: line.debit,
      credit: line.credit,
      cumulativeBalance: runningBalance // The live running balance
    };
  });

  return {
    partnerId,
    totalDebit: lines.reduce((sum, l) => sum + l.debit, 0),
    totalCredit: lines.reduce((sum, l) => sum + l.credit, 0),
    finalBalance: runningBalance,
    rows: statementRows
  };
}
