// src/app/actions/invoicing.ts
'use server'

import { prisma } from "@/lib/prisma"
import { generateNextSequence } from "./sequences"

export async function postInvoice(invoiceId: string) {
  return await prisma.$transaction(async (tx) => {
    
    // 1. جلب الفاتورة بكافة تفاصيلها
    const invoice = await tx.invoice.findUnique({
      where: { id: invoiceId },
      include: { 
        lines: { include: { product: true } },
        partner: true 
      },
    });

    if (!invoice) throw new Error("Invoice not found");
    if (invoice.state !== "DRAFT") throw new Error("Only draft invoices can be posted");

    // 2. تحديد نوع دفتر اليومية بناءً على نوع الفاتورة
    const isSale = invoice.type === "OUT_INVOICE";
    const journalType = isSale ? "SALE" : "PURCHASE";

    const journal = await tx.journal.findFirst({
      where: { type: journalType }
    });
    if (!journal) throw new Error(`Journal of type ${journalType} is not defined in the system`);

    // 3. جلب الحسابات الأساسية
    const partnerAccountCode = isSale ? "110200" : "210200"; 
    const partnerAccount = await tx.account.findUnique({ where: { code: partnerAccountCode } });
    if (!partnerAccount) throw new Error(`Required account code ${partnerAccountCode} not found`);

    // ✅ توحيد كود المخزن مع 110400
    const inventoryAccountCode = "110400";
    const inventoryAccount = await tx.account.findUnique({ where: { code: inventoryAccountCode } });
    if (!inventoryAccount) throw new Error("Inventory Asset account (110400) not found");

    // 4. توليد الرقم التسلسلي
    const sequenceName = await generateNextSequence(journal.id, tx);

    // 5. إنشاء رأس القيد اليومي
    const journalMove = await tx.journalMove.create({
      data: {
        name: sequenceName,
        journalId: journal.id,
        state: "POSTED",
        ref: `${isSale ? "Sales" : "Purchase"} Invoice: ${sequenceName}`
      }
    });

    // 6. بناء أسطر القيود
    // ✅ سطر الشريك (مدين للعميل في المبيعات / دائن للمورد في المشتريات)
    await tx.journalLine.create({
      data: {
        name: `${isSale ? "Customer debt" : "Vendor liability"} for invoice ${sequenceName}`,
        debit: isSale ? invoice.totalAmount : 0,
        credit: isSale ? 0 : invoice.totalAmount,
        moveId: journalMove.id,
        accountId: partnerAccount.id,
        partnerId: invoice.partnerId
      }
    });

    // تحديث رصيد حساب العميل/المورد
    const partnerBalanceChange = isSale ? invoice.totalAmount : invoice.totalAmount;
    await tx.account.update({
      where: { id: partnerAccount.id },
      data: { currentBalance: { increment: partnerBalanceChange } }
    });

    if (partnerAccount.parentId) {
      await updateParentAccountBalance(partnerAccount.parentId, isSale ? invoice.totalAmount : 0, isSale ? 0 : invoice.totalAmount, tx);
    }

    // معالجة أسطر المنتجات
    for (const line of invoice.lines) {
      const product = line.product;
      const lineSubtotal = line.subtotal;
      const totalCost = product.costPrice * line.quantity;

      if (isSale) {
        // --- سيناريو المبيعات ---
        
        // أ. تحديث كمية المخزون (✅ السماح بالسالب)
        const productStock = await tx.productStock.findFirst({ where: { productId: product.id } });
        
        if (productStock) {
          await tx.productStock.update({
            where: { id: productStock.id },
            data: { quantity: { decrement: line.quantity } }
          });
        } else {
          // ✅ إنشاء سجل جديد بكمية سالبة (البيع قبل الشراء)
          const warehouse = await tx.warehouse.findFirst();
          if (warehouse) {
            await tx.productStock.create({
              data: { 
                productId: product.id, 
                warehouseId: warehouse.id, 
                quantity: -line.quantity 
              }
            });
          }
        }

        // ب. سطر إيرادات المبيعات (دائن)
        await tx.journalLine.create({
          data: {
            name: `Sale of product: ${product.name}`,
            debit: 0,
            credit: lineSubtotal,
            moveId: journalMove.id,
            accountId: product.incomeAccountId,
            partnerId: invoice.partnerId
          }
        });
        await tx.account.update({ 
          where: { id: product.incomeAccountId }, 
          data: { currentBalance: { increment: lineSubtotal } } 
        });
        
        const incomeAcc = await tx.account.findUnique({ where: { id: product.incomeAccountId } });
        if (incomeAcc?.parentId) await updateParentAccountBalance(incomeAcc.parentId, 0, lineSubtotal, tx);

        // ج. تكلفة البضاعة المباعة (COGS)
        await tx.journalLine.create({
          data: {
            name: `Cost of Goods Sold: ${product.name}`,
            debit: totalCost,
            credit: 0,
            moveId: journalMove.id,
            accountId: product.expenseAccountId
          }
        });
        await tx.account.update({ 
          where: { id: product.expenseAccountId }, 
          data: { currentBalance: { increment: totalCost } } 
        });
        
        const expenseAcc = await tx.account.findUnique({ where: { id: product.expenseAccountId } });
        if (expenseAcc?.parentId) await updateParentAccountBalance(expenseAcc.parentId, totalCost, 0, tx);

        // دائن: حساب المخزن
        await tx.journalLine.create({
          data: {
            name: `Inventory reduction for product: ${product.name}`,
            debit: 0,
            credit: totalCost,
            moveId: journalMove.id,
            accountId: inventoryAccount.id
          }
        });
        await tx.account.update({ 
          where: { id: inventoryAccount.id }, 
          data: { currentBalance: { decrement: totalCost } } 
        });
        if (inventoryAccount.parentId) await updateParentAccountBalance(inventoryAccount.parentId, 0, totalCost, tx);

      } else {
        // --- سيناريو المشتريات ---
        
        // أ. زيادة كمية المخزون
        const productStock = await tx.productStock.findFirst({ where: { productId: product.id } });
        if (productStock) {
          await tx.productStock.update({
            where: { id: productStock.id },
            data: { quantity: { increment: line.quantity } }
          });
        } else {
          const warehouse = await tx.warehouse.findFirst();
          if (!warehouse) throw new Error("No warehouse defined to receive inventory");
          await tx.productStock.create({
            data: { productId: product.id, warehouseId: warehouse.id, quantity: line.quantity }
          });
        }

        // ب. سطر أصول المخزن (مدين)
        await tx.journalLine.create({
          data: {
            name: `Inventory incoming for product: ${product.name}`,
            debit: lineSubtotal,
            credit: 0,
            moveId: journalMove.id,
            accountId: inventoryAccount.id
          }
        });
        await tx.account.update({ 
          where: { id: inventoryAccount.id }, 
          data: { currentBalance: { increment: lineSubtotal } } 
        });
        if (inventoryAccount.parentId) await updateParentAccountBalance(inventoryAccount.parentId, lineSubtotal, 0, tx);
      }
    }

    // 7. تحديث حالة الفاتورة
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

// دالة مساعدة لتحديث الأرصدة تراجعياً
async function updateParentAccountBalance(parentId: string, debit: number, credit: number, tx: any) {
  const account = await tx.account.findUnique({ where: { id: parentId } });
  if (!account) return;

  let change = 0;
  if (account.type === 'ASSET' || account.type === 'EXPENSE') {
    change = debit - credit;
  } else if (account.type === 'LIABILITY' || account.type === 'EQUITY' || account.type === 'INCOME') {
    change = credit - debit;
  }

  await tx.account.update({
    where: { id: parentId },
    data: { currentBalance: { increment: change } }
  });

  if (account.parentId) {
    await updateParentAccountBalance(account.parentId, debit, credit, tx);
  }
}