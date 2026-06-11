'use server'

import { prisma } from "@/lib/prisma"
import { generateNextSequence } from "./sequences"

export async function postInvoice(invoiceId: string) {
  return await prisma.$transaction(async (tx) => {
    
    // 1. Fetch the invoice with all details: products and customer
    const invoice = await tx.invoice.findUnique({
      where: { id: invoiceId },
      include: { 
        lines: { include: { product: true } },
        partner: true 
      },
    });

    if (!invoice) throw new Error("Invoice not found");
    if (invoice.state !== "DRAFT") throw new Error("Only draft invoices can be posted");

    // 2. Find the default sales journal
    const journal = await tx.journal.findFirst({
      where: { type: "SALE" }
    });
    if (!journal) throw new Error("Sales journal is not defined in the system");

    // 3. Generate the official sequence number for the invoice and journal entry
    const sequenceName = await generateNextSequence(journal.id, tx);

    // 4. Create the Journal Move header
    const journalMove = await tx.journalMove.create({
      data: {
        name: sequenceName,
        journalId: journal.id,
        state: "POSTED",
        ref: `Sales Invoice: ${invoice.number || sequenceName}`
      }
    });

    // 5. Build Journal Lines and update stock (Odoo's integrated logic)
    
    // A. Customer receivable line (Debit the customer's account with the total invoice amount)
    const receivableAccountId = "d1b4a45a-12e0-41c1-92f7-7299a8a29486"; // Replace with actual Accounts Receivable account ID
    
    await tx.journalLine.create({
      data: {
        name: `Customer debt for invoice ${sequenceName}`,
        debit: invoice.totalAmount,
        credit: 0,
        balance: invoice.totalAmount,
        moveId: journalMove.id,
        accountId: receivableAccountId,
        partnerId: invoice.partnerId
      }
    });

    // B. Product lines: revenue + stock move for each product on the invoice
    for (const line of invoice.lines) {
      const product = line.product;
      const lineSubtotal = line.subtotal;

      // Update product stock (decrease due to sale)
      if (product.currentStock < line.quantity) {
        throw new Error(`Insufficient stock for product: ${product.name}`);
      }
      
      await tx.product.update({
        where: { id: product.id },
        data: { currentStock: { decrement: line.quantity } }
      });

      // Log the historical stock move
      // await tx.stockMove.create({
      //   data: {
      //     reference: sequenceName,
      //     type: "OUTGOING",
      //     quantity: line.quantity,
      //     unitCost: product.costPrice,
      //     productId: product.id,
      //     partnerId: invoice.partnerId
      //   }
      // });

      // Product income journal line (Credit sales with the line amount)
      await tx.journalLine.create({
        data: {
          name: `Sale of product: ${product.name}`,
          debit: 0,
          credit: lineSubtotal,
          balance: -lineSubtotal,
          moveId: journalMove.id,
          accountId: product.incomeAccountId,
          partnerId: invoice.partnerId
        }
      });

      // C. Cost of Goods Sold (COGS) entry (Advanced Odoo automated inventory)
      const totalCost = product.costPrice * line.quantity;
      const inventoryAccountId = "2e49a212-70e6-4277-b49a-5b871c4c8edc"; // Replace with actual Inventory Asset account ID

      // Debit: COGS expense account
      await tx.journalLine.create({
        data: {
          name: `Cost of Goods Sold: ${product.name}`,
          debit: totalCost,
          credit: 0,
          balance: totalCost,
          moveId: journalMove.id,
          accountId: product.expenseAccountId
        }
      });

      // Credit: Inventory asset account (to reduce inventory value)
      await tx.journalLine.create({
        data: {
          name: `Inventory reduction for product: ${product.name}`,
          debit: 0,
          credit: totalCost,
          balance: -totalCost,
          moveId: journalMove.id,
          accountId: inventoryAccountId
        }
      });

      // E. Update account balances in real-time for faster reporting
      await tx.account.update({ where: { id: receivableAccountId }, data: { currentBalance: { increment: invoice.totalAmount } } });
      await tx.account.update({ where: { id: product.incomeAccountId }, data: { currentBalance: { decrement: lineSubtotal } } });
      await tx.account.update({ where: { id: product.expenseAccountId }, data: { currentBalance: { increment: totalCost } } });
      await tx.account.update({ where: { id: inventoryAccountId }, data: { currentBalance: { decrement: totalCost } } });
    }

    // 6. Update the invoice state to POSTED and link it to the journal move
    await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        state: "POSTED",
        number: sequenceName,
        journalMoveId: journalMove.id
      }
    });

    return { success: true, invoiceNumber: sequenceName };
  });
}
