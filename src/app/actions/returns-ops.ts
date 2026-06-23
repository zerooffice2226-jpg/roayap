// src/app/actions/returns-ops.ts
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
async function updateParentAccountBalances(tx: any, childAccountId: string) {
    const childAccount = await tx.account.findUnique({ 
        where: { id: childAccountId },
        select: { parentId: true }
    });
    
    if (!childAccount || !childAccount.parentId) return;

    const parentId = childAccount.parentId;

    const parent = await tx.account.findUnique({
        where: { id: parentId },
        include: { 
            children: {
                select: { currentBalance: true }
            } 
        }
    });

    if (!parent) return;

    const totalChildrenBalance = parent.children.reduce((sum, child) => sum + child.currentBalance, 0);

    await tx.account.update({
        where: { id: parentId },
        data: { currentBalance: totalChildrenBalance }
    });

    await updateParentAccountBalances(tx, parentId);
}

// 🌟 الدالة الرئيسية (بتجمع الاتنين)
async function updateAccountBalance(tx: any, accountId: string, debit: number, credit: number) {
  await updateSingleAccountBalance(tx, accountId, debit, credit);
  await updateParentAccountBalances(tx, accountId);
}

interface ReturnInput {
  invoiceId: string;
  items: { productId: string; quantity: number; priceUnit: number }[];
  type: "SALE_RETURN" | "PURCHASE_RETURN";
}

export async function processProductReturn(data: ReturnInput) {
  return await prisma.$transaction(async (tx) => {
    const currentYear = new Date().getFullYear();
    
    const originalInvoice = await tx.invoice.findUnique({ where: { id: data.invoiceId }, include: { partner: true, journalMove: { include: { lines: { include: { account: true } } } } } });
    if (!originalInvoice) throw new Error("الفاتورة الأصلية غير موجودة");

    let returnCreditAccount: any = null;
    if (originalInvoice.journalMove?.lines) {
      const debitLine = originalInvoice.journalMove.lines.find((line: any) => line.debit > 0);
      if (debitLine && debitLine.account) returnCreditAccount = debitLine.account;
    }
    if (!returnCreditAccount) returnCreditAccount = await tx.account.findUnique({ where: { code: "110200" } });
    if (!returnCreditAccount) throw new Error("حساب الذمم المدينة غير موجود");

    const totalReturnAmount = data.items.reduce((sum: number, item: any) => sum + (item.quantity * item.priceUnit), 0);

    const journalType = data.type === "SALE_RETURN" ? "SALE" : "PURCHASE";
    const journal = await tx.journal.findFirst({ where: { type: journalType } });
    if (!journal) throw new Error("دفتر اليومية غير معرف");

    const prefix = `RET/${journal.code}/${currentYear}/`;
    const lastMove = await tx.journalMove.findFirst({ where: { journalId: journal.id, name: { startsWith: prefix } }, orderBy: { name: 'desc' } });
    const nextNum = lastMove ? parseInt(lastMove.name.split('/')[3]) + 1 : 1;
    const sequenceName = `${prefix}${String(nextNum).padStart(4, '0')}`;

    const inventoryAccount = await tx.account.findUnique({ where: { code: "110400" } });
    if (!inventoryAccount) throw new Error("حساب المخزن (110400) غير موجود");

    const journalMove = await tx.journalMove.create({ data: { name: sequenceName, journalId: journal.id, state: "POSTED", ref: `مردود مبيعات عن مستند ${originalInvoice.number}`, date: new Date() } });

    for (const item of data.items) {
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      if (!product || !product.incomeAccountId) continue;
      
      const lineAmount = item.quantity * item.priceUnit;
      
      await tx.journalLine.create({
        data: { name: `مردود مبيعات - ${product.name}`, debit: lineAmount, credit: 0, moveId: journalMove.id, accountId: product.incomeAccountId }
      });
      await updateAccountBalance(tx, product.incomeAccountId, lineAmount, 0);
    }

    await tx.journalLine.create({
      data: { name: `تخفيض ${returnCreditAccount.name} - مردودات ${originalInvoice.number}`, debit: 0, credit: totalReturnAmount, moveId: journalMove.id, accountId: returnCreditAccount.id, partnerId: originalInvoice.partnerId }
    });
    await updateAccountBalance(tx, returnCreditAccount.id, 0, totalReturnAmount);

    const defaultWarehouse = await tx.warehouse.findFirst();
    
    for (const item of data.items) {
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      if (!product) continue;

      const productStock = await tx.productStock.findFirst({ where: { productId: item.productId, warehouseId: defaultWarehouse?.id } });
      if (productStock) {
        await tx.productStock.update({ where: { id: productStock.id }, data: { quantity: { increment: item.quantity } } });
      } else if (defaultWarehouse) {
        await tx.productStock.create({ data: { productId: item.productId, warehouseId: defaultWarehouse.id, quantity: item.quantity } });
      }

      if (defaultWarehouse) {
        await tx.stockMove.create({ data: { reference: sequenceName, type: "INCOMING", quantity: item.quantity, unitCost: product.costPrice, productId: item.productId, partnerId: originalInvoice.partnerId, destWarehouseId: defaultWarehouse.id } });
      }

      const totalCost = product.costPrice * item.quantity;
      if (totalCost > 0) {
        if (!product.expenseAccountId) throw new Error("Product has no expense account");

        await tx.journalLine.create({ data: { name: `عكس تكلفة البضاعة - ${product.name}`, debit: totalCost, credit: 0, moveId: journalMove.id, accountId: inventoryAccount.id } });
        await updateAccountBalance(tx, inventoryAccount.id, totalCost, 0);
        
        await tx.journalLine.create({ data: { name: `عكس COGS - ${product.name}`, debit: 0, credit: totalCost, moveId: journalMove.id, accountId: product.expenseAccountId } });
        await updateAccountBalance(tx, product.expenseAccountId, 0, totalCost);
      }
    }

    const returnInvoice = await tx.invoice.create({
      data: {
        number: sequenceName, type: "OUT_INVOICE", date: new Date(), dueDate: new Date(), state: "POSTED", partnerId: originalInvoice.partnerId, totalAmount: totalReturnAmount, journalMoveId: journalMove.id,
        lines: { create: data.items.map((item: any) => ({ productId: item.productId, quantity: item.quantity, priceUnit: item.priceUnit, subtotal: item.quantity * item.priceUnit })) }
      }
    });

    return { success: true, returnNumber: sequenceName, invoiceId: returnInvoice.id };
  });
}

export async function fetchOriginalInvoiceData(invoiceNumber: string) {
  try {
    const invoice = await prisma.invoice.findFirst({ where: { number: invoiceNumber, state: "POSTED" }, include: { partner: true, lines: { include: { product: true } } } });
    if (!invoice) return { success: false, error: `الفاتورة "${invoiceNumber}" غير موجودة أو لم يتم اعتمادها` };
    return { success: true, data: { invoiceId: invoice.id, partnerName: invoice.partner?.name || "عميل غير معروف", partnerId: invoice.partnerId, lines: invoice.lines.map((line: any) => ({ productId: line.productId, sku: line.product?.sku || "—", name: line.product?.name || "صنف", quantity: line.quantity, priceUnit: line.priceUnit, subtotal: line.subtotal })) } };
  } catch (error) {
    return { success: false, error: `حدث خطأ أثناء جلب البيانات: ${error instanceof Error ? error.message : "خطأ غير معروف"}` };
  }
}
