'use server'

import { prisma } from "@/lib/prisma"

interface PaymentPayload {
  invoiceId: string;
  amountPaid: number;
  bankAccountId: string; // The bank account where money was received
  cashierJournalId: string; // The bank/cash journal
}

export async function processInvoicePayment({ invoiceId, amountPaid, bankAccountId, cashierJournalId }: PaymentPayload) {
  return await prisma.$transaction(async (tx) => {
    
    // 1. Fetch the invoice and lock accounts using a protected query
    const invoice = await tx.invoice.findUnique({
      where: { id: invoiceId },
      include: { partner: true }
    });

    if (!invoice) throw new Error("Invoice not found");
    if (invoice.state === "PAID" || invoice.state === "DRAFT") {
      throw new Error("Only posted and not fully paid invoices can be paid");
    }

    // 2. Automatically create the payment journal entry
    const currentYear = new Date().getFullYear();
    const payMove = await tx.journalMove.create({
      data: {
        name: `PAY/${invoice.partner.name.substring(0,3).toUpperCase()}/${currentYear}/${Math.floor(1000 + Math.random() * 9000)}`,
        journalId: cashierJournalId,
        state: "POSTED",
        ref: `Payment for Invoice #${invoice.number}`
      }
    });

    // 3. Line 1: Bank/Cash account (Debit - assets increase)
    await tx.journalLine.create({
      data: {
        name: `Cash receipt - Invoice ${invoice.number}`,
        debit: amountPaid,
        credit: 0,
        balance: amountPaid,
        moveId: payMove.id,
        accountId: bankAccountId,
        partnerId: invoice.partnerId
      }
    });

    // 4. Line 2: Accounts Receivable (Credit - reduce customer debt)
    const receivableAccountId = "d1b4a45a-12e0-41c1-92f7-7299a8a29486"; 

    await tx.journalLine.create({
      data: {
        name: `Settlement of customer debt for invoice ${invoice.number}`,
        debit: 0,
        credit: amountPaid,
        balance: -amountPaid,
        moveId: payMove.id,
        accountId: receivableAccountId,
        partnerId: invoice.partnerId
      }
    });

    // 5. Instantly update account balances in the Chart of Accounts
    await tx.account.update({ where: { id: bankAccountId }, data: { currentBalance: { increment: amountPaid } } });
    await tx.account.update({ where: { id: receivableAccountId }, data: { currentBalance: { decrement: amountPaid } } });

    // 6. Change invoice state to PAID if fully paid, otherwise remains POSTED (supports partial payments)
    const updatedState = amountPaid >= invoice.totalAmount ? "PAID" : "POSTED"; 
    
    await tx.invoice.update({
      where: { id: invoiceId },
      data: { state: updatedState }
    });

    return { success: true, paymentMoveName: payMove.name, status: updatedState };
  });
}
