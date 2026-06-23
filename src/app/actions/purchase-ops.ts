// src/app/actions/purchase-ops.ts
"use server"
import { prisma } from "@/lib/prisma"

// 🌟 دالة لتحديث رصيد حساب واحد فقط (باستخدام increment)
async function updateSingleAccountBalance(tx: any, accountId: string, debit: number, credit: number) {
  const account = await tx.account.findUnique({ where: { id: accountId } });
  if (!account) return;

  let change = 0;
  if (account.type === 'ASSET' || account.type === 'EXPENSE') {
    change = debit - credit;
  } else { // LIABILITY, EQUITY, INCOME
    change = credit - debit;
  }

  if (change === 0) return; // No need to update if there's no change

  await tx.account.update({
    where: { id: accountId },
    data: { currentBalance: { increment: change } }
  });
}

// 🌟 دالة لتحديث الحسابات الأبوية (بتجميع الأرصدة من الأبناء)
async function updateParentAccountBalances(tx: any, accountId: string) {
  const account = await tx.account.findUnique({ 
    where: { id: accountId },
    include: { 
      children: {
        select: { 
          id: true, 
          currentBalance: true, 
          type: true,
          children: {
            select: {
              id: true,
              currentBalance: true,
              type: true
            }
          }
        }
      }
    }
  });
  
  if (!account || !account.parentId) return;

  // ✅ حساب المجموع من الأبناء (مش increment!)
  let totalBalance = 0;
  for (const child of account.children) {
    totalBalance += child.currentBalance || 0;
    
    if (child.children && child.children.length > 0) {
      for (const grandchild of child.children) {
        totalBalance += grandchild.currentBalance || 0;
      }
    }
  }

  // ✅ استبدال الرصيد بالكامل (مش increment)
  await tx.account.update({
    where: { id: account.parentId },
    data: { currentBalance: totalBalance }  // ← مهم: مش increment
  });

  await updateParentAccountBalances(tx, account.parentId);
}


// 🌟 الدالة الرئيسية (بتجمع الاتنين)
async function updateAccountBalance(tx: any, accountId: string, debit: number, credit: number) {
  await updateSingleAccountBalance(tx, accountId, debit, credit);
  await updateParentAccountBalances(tx, accountId);
}


async function reverseJournalMoveBalances(tx: any, journalMoveId: string | null) {
  if (!journalMoveId) return;
  const move = await tx.journalMove.findUnique({ where: { id: journalMoveId }, include: { lines: true } });
  if (!move) return;
  for (const line of move.lines) {
      await updateAccountBalance(tx, line.accountId, line.credit, line.debit);
  }
  await tx.journalLine.deleteMany({ where: { moveId: move.id } });
  await tx.journalMove.delete({ where: { id: move.id } });
}

export async function createAndPostPurchaseBill(data: any) {
  return await prisma.$transaction(async (tx) => {
    const today = new Date();
    const currentYear = today.getFullYear();

    let totalAmount = 0;
    const billLines = data.items.map((item: any) => {
      const subtotal = Number(item.quantity) * Number(item.priceUnit);
      totalAmount += subtotal;
      return { productId: item.productId, quantity: Number(item.quantity), priceUnit: Number(item.priceUnit), subtotal };
    });

    let journal = await tx.journal.findFirst({ where: { type: "PURCHASE" } });
    if (!journal) journal = await tx.journal.create({ data: { name: "دفتر المشتريات", code: "BILL", type: "PURCHASE" } });

    const apAccount = await tx.account.findUnique({ where: { code: "210200" } });
    const inventoryAccount = await tx.account.findUnique({ where: { code: "110400" } });
    if (!apAccount) throw new Error("حساب الموردين (210200) غير موجود");
    if (!inventoryAccount) throw new Error("حساب المخزن (110400) غير موجود");

    let sequenceName = data.existingNumber;

    if (data.existingNumber) {
      const oldBill = await tx.invoice.findFirst({ where: { number: data.existingNumber }, include: { lines: true } });
      if (oldBill) {
        await reverseJournalMoveBalances(tx, oldBill.journalMoveId);

        for (const line of oldBill.lines) {
          const whId = data.warehouseId;
          await tx.productStock.updateMany({ where: { productId: line.productId, warehouseId: whId }, data: { quantity: { decrement: line.quantity } } });
        }
        await tx.stockMove.deleteMany({ where: { reference: data.existingNumber } });
        await tx.invoiceLine.deleteMany({ where: { invoiceId: oldBill.id } });
      }
    } else {
      const prefix = `${journal.code}/${currentYear}/`;
      const lastBill = await tx.journalMove.findFirst({ where: { journalId: journal.id, name: { startsWith: prefix } }, orderBy: { name: 'desc' } });
      let nextNum = lastBill ? parseInt(lastBill.name.split('/')[2]) + 1 : 1;
      if (isNaN(nextNum)) nextNum = 1;
      sequenceName = `${prefix}${String(nextNum).padStart(4, '0')}`;
    }

    let bill;
    if (data.existingNumber) {
      const existingBill = await tx.invoice.findFirst({ where: { number: sequenceName } });
      if (!existingBill) throw new Error("المستند المراد تعديله غير موجود");
      bill = await tx.invoice.update({
        where: { id: existingBill.id },
        data: { totalAmount, dueDate: new Date(data.dueDate), partnerId: data.partnerId, lines: { create: billLines } }
      });
    } else {
      bill = await tx.invoice.create({
        data: {
          number: sequenceName, type: "IN_INVOICE", date: today, dueDate: new Date(data.dueDate),
          state: "POSTED", partnerId: data.partnerId, totalAmount, lines: { create: billLines }
        }
      });
    }

    const newJournalMove = await tx.journalMove.create({
      data: { name: sequenceName, journalId: journal.id, state: "POSTED", date: today, ref: `فاتورة مشتريات ${sequenceName}` }
    });
    
    await tx.journalLine.create({
      data: { name: `مديونية مورد لفاتورة ${sequenceName}`, accountId: apAccount.id, debit: 0, credit: totalAmount, moveId: newJournalMove.id, partnerId: data.partnerId }
    });
    await updateAccountBalance(tx, apAccount.id, 0, totalAmount);

    for (const line of billLines) {
      await tx.journalLine.create({
        data: { name: `استلام مخزون - فاتورة ${sequenceName}`, accountId: inventoryAccount.id, debit: line.subtotal, credit: 0, moveId: newJournalMove.id }
      });
      await updateAccountBalance(tx, inventoryAccount.id, line.subtotal, 0);
    }

    await tx.invoice.update({ where: { id: bill.id }, data: { journalMoveId: newJournalMove.id } });

    for (const item of data.items) {
      const targetWarehouse = data.warehouseId;
      if (!targetWarehouse) throw new Error("يرجى اختيار مستودع الاستلام");

      await tx.productStock.upsert({
        where: { productId_warehouseId: { productId: item.productId, warehouseId: targetWarehouse } },
        update: { quantity: { increment: Number(item.quantity) } },
        create: { productId: item.productId, warehouseId: targetWarehouse, quantity: Number(item.quantity) }
      });

      await tx.stockMove.create({
        data: {
          reference: sequenceName, type: "INCOMING", quantity: Number(item.quantity), unitCost: Number(item.priceUnit),
          productId: item.productId, destWarehouseId: targetWarehouse, partnerId: data.partnerId
        }
      });
    }

    return { success: true, billNumber: sequenceName };
  });
}

export async function getBillByNumber(billNumber: string) {
  return await prisma.invoice.findFirst({
    where: { number: billNumber, type: "IN_INVOICE" },
    include: { lines: { include: { product: true } }, partner: true }
  });
}

export async function deleteBillByNumber(billNumber: string) {
  return await prisma.$transaction(async (tx) => {
    const bill = await tx.invoice.findFirst({ where: { number: billNumber }, include: { lines: true } });
    if (!bill) throw new Error("المستند غير موجود");

    await reverseJournalMoveBalances(tx, bill.journalMoveId);

    for (const line of bill.lines) {
      const relatedMove = await tx.stockMove.findFirst({ where: { reference: billNumber, productId: line.productId } });
      const whId = relatedMove?.destWarehouseId || "w-main";
      await tx.productStock.updateMany({ where: { productId: line.productId, warehouseId: whId }, data: { quantity: { decrement: line.quantity } } });
    }

    await tx.stockMove.deleteMany({ where: { reference: billNumber } });
    await tx.invoiceLine.deleteMany({ where: { invoiceId: bill.id } });
    await tx.invoice.delete({ where: { id: bill.id } });
    return { success: true };
  });
}
