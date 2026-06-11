import { prisma } from './prisma';

/**
 * Generates a new, sequential, and unique name for a journal move.
 * Example: For a journal with code 'INV' in the year 2026, it will generate
 * sequences like 'INV/2026/0001', 'INV/2026/0002', etc.
 *
 * @param journalCode - The code of the journal (e.g., 'INV', 'BILL').
 * @param date - The date of the move, to determine the year.
 * @returns The next sequence name.
 */
export async function getNextSequence(journalCode: string, date: Date): Promise<string> {
  const year = date.getFullYear();
  const prefix = `${journalCode}/${year}/`;

  // Find the last move for this journal and year
  const lastMove = await prisma.journalMove.findFirst({
    where: {
      name: {
        startsWith: prefix,
      },
    },
    orderBy: {
      name: 'desc',
    },
  });

  let nextNumber = 1;
  if (lastMove) {
    const lastNumberStr = lastMove.name.split('/').pop();
    if (lastNumberStr) {
      const lastNumber = parseInt(lastNumberStr, 10);
      nextNumber = lastNumber + 1;
    }
  }

  // Format the number with leading zeros (e.g., 0001)
  const sequence = nextNumber.toString().padStart(4, '0');

  return `${prefix}${sequence}`;
}
