// src/app/actions/invoicing-ops.ts
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
    // To reverse, call with swapped debit/credit
    await updateAccountBalance(tx, line.accountId, line.credit, line.debit); 
  }
  await tx.journalLine.deleteMany({ where: { moveId: move.id } });
  await tx.journalMove.delete({ where: { id: move.id } });
}

export async function createAndPostInvoice(data: any) {
  return await prisma.$transaction(async (tx) => {
    const today = new Date();
    const currentYear = today.getFullYear();

    let totalAmount = 0;
    const invoiceLines = data.items.map((item: any) => {
      const subtotal = Number(item.quantity) * Number(item.priceUnit);
      totalAmount += subtotal;
      return { 
        productId: item.productId, 
        quantity: Number(item.quantity), 
        priceUnit: Number(item.priceUnit), 
        subtotal 
      };
    });

    let journal = await tx.journal.findFirst({ where: { type: "SALE" } });
    if (!journal) journal = await tx.journal.create({ data: { name: "دفتر المبيعات", code: "INV", type: "SALE" } });

    const arAccount = await tx.account.findUnique({ where: { code: "110200" } });
    const inventoryAccount = await tx.account.findUnique({ where: { code: "110400" } });
    
    if (!arAccount) throw new Error("حساب الذمم المدينة (110200) غير موجود");
    if (!inventoryAccount) throw new Error("حساب المخزن الرئيسي (110400) غير موجود");

    let sequenceName = data.existingNumber;

    if (data.existingNumber) {
      const oldInv = await tx.invoice.findFirst({ where: { number: data.existingNumber }, include: { lines: true } });
      if (oldInv) {
        await reverseJournalMoveBalances(tx, oldInv.journalMoveId);
        
        await tx.stockMove.deleteMany({ where: { reference: data.existingNumber } });
        await tx.invoiceLine.deleteMany({ where: { invoiceId: oldInv.id } });
      }
    } else {
      const prefix = `${journal.code}/${currentYear}/`;
      const lastInv = await tx.journalMove.findFirst({ 
        where: { journalId: journal.id, name: { startsWith: prefix } }, 
        orderBy: { name: 'desc' } 
      });
      let nextNum = lastInv ? parseInt(lastInv.name.split('/')[2]) + 1 : 1;
      sequenceName = `${prefix}${String(nextNum).padStart(4, '0')}`;
    }

    let invoice;
    if (data.existingNumber) {
      const existingBill = await tx.invoice.findFirst({ where: { number: sequenceName } });
      if (!existingBill) throw new Error("المستند المراد تعديله غير موجود");
      invoice = await tx.invoice.update({
        where: { id: existingBill.id },
        data: { 
          totalAmount, 
          dueDate: new Date(data.dueDate), 
          partnerId: data.partnerId, 
          lines: { create: invoiceLines } 
        },
      });
    } else {
      invoice = await tx.invoice.create({
        data: {
          number: sequenceName, 
          type: "OUT_INVOICE", 
          date: today, 
          dueDate: new Date(data.dueDate),
          state: "POSTED", 
          partnerId: data.partnerId, 
          totalAmount, 
          lines: { create: invoiceLines }
        }
      });
    }

    const newJournalMove = await tx.journalMove.create({
      data: { 
        name: sequenceName, 
        journalId: journal.id, 
        state: "POSTED", 
        date: today, 
        ref: `فاتورة مبيعات ${sequenceName}` 
      }
    });

    const amountPaid = Number(data.amountPaid) || 0;
    const amountDue = totalAmount - amountPaid;

    if (amountPaid > 0 && data.cashAccountId && data.cashAccountId.trim() !== "") {
      const cashAccount = await tx.account.findUnique({ where: { id: data.cashAccountId } });
      if (!cashAccount) throw new Error("حساب الخزينة المحدد غير موجود");
      
      await tx.journalLine.create({
        data: { name: `تحصيل نقدي - فاتورة ${sequenceName}`, accountId: cashAccount.id, debit: amountPaid, credit: 0, moveId: newJournalMove.id, partnerId: data.partnerId }
      });
      await updateAccountBalance(tx, cashAccount.id, amountPaid, 0);
    }

    if (amountDue > 0) {
      await tx.journalLine.create({
        data: { name: `مديونية عميل - فاتورة ${sequenceName}`, accountId: arAccount.id, debit: amountDue, credit: 0, moveId: newJournalMove.id, partnerId: data.partnerId }
      });
      await updateAccountBalance(tx, arAccount.id, amountDue, 0);
    }

    for (const line of invoiceLines) {
      const product = await tx.product.findUnique({ where: { id: line.productId }});
      if (!product) throw new Error(`المنتج غير موجود: ${line.productId}`);
      if (!product.incomeAccountId) throw new Error(`⚠️ المنتج "${product.name}" ليس لديه حساب إيرادات!`);
      
      await tx.journalLine.create({
        data: { name: `إيراد مبيعات - ${product.name}`, accountId: product.incomeAccountId, debit: 0, credit: line.subtotal, moveId: newJournalMove.id }
      });
      await updateAccountBalance(tx, product.incomeAccountId, 0, line.subtotal);

      const totalCost = product.costPrice * line.quantity;
      if (totalCost > 0) {
        if (!product.expenseAccountId) throw new Error(`⚠️ المنتج "${product.name}" ليس لديه حساب تكلفة!`);

        await tx.journalLine.create({
          data: { name: `تكلفة البضاعة المباعة - ${product.name}`, accountId: product.expenseAccountId, debit: totalCost, credit: 0, moveId: newJournalMove.id }
        });
        await updateAccountBalance(tx, product.expenseAccountId, totalCost, 0);

        await tx.journalLine.create({
          data: { name: `تخفيض المخزون - ${product.name}`, accountId: inventoryAccount.id, debit: 0, credit: totalCost, moveId: newJournalMove.id }
        });
        await updateAccountBalance(tx, inventoryAccount.id, 0, totalCost);
      }
    }

    await tx.invoice.update({ where: { id: invoice.id }, data: { journalMoveId: newJournalMove.id } });

    for (const item of data.items) {
      const targetWarehouse = data.warehouseId || "w-main";
      
      await tx.productStock.upsert({
        where: { productId_warehouseId: { productId: item.productId, warehouseId: targetWarehouse } },
        update: { quantity: { decrement: item.quantity } },
        create: { productId: item.productId, warehouseId: targetWarehouse, quantity: -item.quantity }
      });

      await tx.stockMove.create({
        data: { reference: sequenceName, type: "OUTGOING", quantity: item.quantity, unitCost: 0, productId: item.productId, sourceWarehouseId: targetWarehouse, partnerId: data.partnerId }
      });
    }

    let message = `✅ تم إنشاء الفاتورة بنجاح!\n- الإجمالي: ${totalAmount.toLocaleString()} ج.م`;
    if (amountPaid > 0) message += `\n- مدفوع: ${amountPaid.toLocaleString()} ج.م`;
    if (amountDue > 0) message += `\n- متبقي: ${amountDue.toLocaleString()} ج.م`;

    return { success: true, invoiceNumber: sequenceName, message };
  });
}

export async function getInvoiceByNumber(invoiceNumber: string) {
  return await prisma.invoice.findFirst({
    where: { number: invoiceNumber },
    include: { 
      partner: true, 
      lines: { include: { product: true } },
      journalMove: { include: { lines: { include: { account: true } } } }
    }
  });
}

export async function deleteInvoiceByNumber(invoiceNumber: string) {
  return await prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findFirst({ where: { number: invoiceNumber }, include: { lines: true } });
    
    if (invoice) {
      await reverseJournalMoveBalances(tx, invoice.journalMoveId);
      
      for (const line of invoice.lines) {
        const stockMove = await tx.stockMove.findFirst({ where: { reference: invoiceNumber, productId: line.productId } });
        const whId = stockMove?.sourceWarehouseId || "w-main"; 
        
        await tx.productStock.upsert({
          where: { productId_warehouseId: { productId: line.productId, warehouseId: whId } },
          update: { quantity: { increment: line.quantity } },
          create: { productId: line.productId, warehouseId: whId, quantity: line.quantity }
        });
      }
      
      await tx.stockMove.deleteMany({ where: { reference: invoiceNumber } });
      await tx.invoiceLine.deleteMany({ where: { invoiceId: invoice.id } });
      await tx.invoice.delete({ where: { id: invoice.id } });
    }
    
    return { success: true };
  });
}
