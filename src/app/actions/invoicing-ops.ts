// src/app/actions/invoicing-ops.ts
"use server"
import { prisma } from "@/lib/prisma"

export async function createAndPostInvoice(data: any) {
  return await prisma.$transaction(async (tx) => {
    const today = new Date();
    const currentYear = today.getFullYear();

    // 1. حساب الإجمالي وتجهيز البنود
    let totalAmount = 0;
    const invoiceLines = data.items.map((item: any) => {
      const subtotal = item.quantity * item.priceUnit;
      totalAmount += subtotal;
      return { productId: item.productId, quantity: item.quantity, priceUnit: item.priceUnit, subtotal };
    });

    let journal = await tx.journal.findFirst({ where: { type: "SALE" } });
    if (!journal) {
      journal = await tx.journal.create({ 
        data: { name: "دفتر المبيعات العمومية", code: "INV", type: "SALE" } 
      });
    }

    let sequenceName = data.existingNumber;
    let journalMoveId;

    // 2. معالجة حالة التعديل (تنظيف الأثر المخزني والمالي القديم)
    if (data.existingNumber) {
      const oldInv = await tx.invoice.findFirst({ 
        where: { number: data.existingNumber }, 
        include: { lines: true } 
      });

      if (oldInv) {
        // أ) إرجاع كميات المخزن القديمة
        for (const line of oldInv.lines) {
          const relatedMove = await tx.stockMove.findFirst({ 
            where: { reference: data.existingNumber, productId: line.productId } 
          });
          const whId = relatedMove?.sourceWarehouseId || data.warehouseId || "w-main";
          await tx.productStock.updateMany({
            where: { productId: line.productId, warehouseId: whId },
            data: { quantity: { increment: line.quantity } }
          });
        }

        // ب) محاسبياً: تنظيف قيد الكاش القديم وعكس أثره من رصيد الحساب قبل حذفه
        const oldCashMoveName = `CASH/${data.existingNumber}`;
        const oldCashMove = await tx.journalMove.findFirst({
          where: { name: oldCashMoveName },
          include: { lines: true }
        });

        if (oldCashMove) {
          // جلب سطر المدين (الخزينة) لعكس رصيده
          const oldCashLine = oldCashMove.lines.find(l => l.debit > 0);
          if (oldCashLine) {
            await tx.account.update({
              where: { id: oldCashLine.accountId },
              data: { currentBalance: { decrement: oldCashLine.debit } } // خصم المبلغ القديم لحماية الحساب
            });
          }
          // حذف قيد الكاش القديم سطوراً وحركة
          await tx.journalMove.delete({ where: { id: oldCashMove.id } });
        }

        // ج) حذف حركات المخزن وسطور الفاتورة القديمة
        await tx.stockMove.deleteMany({ where: { reference: data.existingNumber } });
        await tx.invoiceLine.deleteMany({ where: { invoiceId: oldInv.id } });
        journalMoveId = oldInv.journalMoveId;
      }
    } else {
      // إنشاء سيريال جديد لفاتورة جديدة
      const prefix = `${journal.code}/${currentYear}/`;
      const lastInv = await tx.journalMove.findFirst({ 
        where: { journalId: journal.id, name: { startsWith: prefix } }, 
        orderBy: { name: 'desc' } 
      });
      let nextNum = lastInv ? parseInt(lastInv.name.split('/')[2]) + 1 : 1;
      sequenceName = `${prefix}${String(nextNum).padStart(4, '0')}`;

      const journalMove = await tx.journalMove.create({
        data: { name: sequenceName, journalId: journal.id, state: "POSTED", date: today, ref: `فاتورة مبيعات رقم ${sequenceName}` }
      });
      journalMoveId = journalMove.id;
    }

    // 3. تحديث أو إنشاء الفاتورة
    let invoice;
    if (data.existingNumber) {
      const existingBill = await tx.invoice.findFirst({ where: { number: sequenceName } });
      if (!existingBill) throw new Error("المستند المراد تعديله غير موجود بالدفاتر");

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
          journalMoveId: journalMoveId,
          lines: { create: invoiceLines }
        }
      });
    }

    // 4. إنشاء قيد اليومية المالي النقدي الجديد (موزون ومطابق للمخطط)
    if (data.cashAccountId && totalAmount > 0) {
      const cashJournal = await tx.journal.findFirst({ where: { type: "CASH" } });
      if (cashJournal) {
        let revenueAccount = await tx.account.findFirst({
          where: { OR: [{ name: { contains: "إيراد" } }, { code: { startsWith: "4" } }] }
        });
        
        if (!revenueAccount) throw new Error("حساب الإيرادات والمبيعات غير معرف في شجرة الحسابات");

        // إنشاء قيد الكاش الجديد مع حقل balance الإجباري (Debit - Credit)
        await tx.journalMove.create({
          data: {
            name: `CASH/${sequenceName}`,
            journalId: cashJournal.id,
            state: "POSTED",
            date: today,
            ref: `تحصيل نقدي للفاتورة ${sequenceName} | مبلغ:${totalAmount}`,
            lines: {
              create: [
                {
                  name: `استلام نقدي - فاتورة ${sequenceName}`,
                  accountId: data.cashAccountId,
                  debit: totalAmount,
                  credit: 0,
                  balance: totalAmount // ✅ حقل مدين موجب
                },
                {
                  name: `إيراد مبيعات - فاتورة ${sequenceName}`,
                  accountId: revenueAccount.id,
                  credit: totalAmount,
                  debit: 0,
                  balance: -totalAmount // ✅ حقل دائن سالب ليتزن القيد
                }
              ]
            }
          }
        });

        // زيادة رصيد الخزينة الحالي بالصافي الجديد حياً
        await tx.account.update({
          where: { id: data.cashAccountId },
          data: { currentBalance: { increment: totalAmount } }
        });
      }
    }

    // 5. خصم كميات المخزن الجديدة وتوليد حركات المخزن
    for (const item of data.items) {
      const targetWarehouse = data.warehouseId || "w-main";
      await tx.productStock.upsert({
        where: { productId_warehouseId: { productId: item.productId, warehouseId: targetWarehouse } },
        update: { quantity: { decrement: item.quantity } },
        create: { productId: item.productId, warehouseId: targetWarehouse, quantity: -item.quantity }
      });

      await tx.stockMove.create({
        data: {
          reference: sequenceName,
          type: "OUTGOING",
          quantity: item.quantity,
          unitCost: 0,
          productId: item.productId,
          sourceWarehouseId: targetWarehouse,
          partnerId: data.partnerId
        }
      });
    }

    return { success: true, invoiceNumber: sequenceName };
  });
}

// get invoice by number
export async function getInvoiceByNumber(invoiceNumber: string) {
  return await prisma.invoice.findFirst({
    where: { number: invoiceNumber },
    include: {
      partner: true,
      lines: {
        include: {
          product: true,
        }
      }
    }
  });
}

// delete invoice by number (تمت إضافة تنظيف حساب الكاش وقيد الكاش أيضاً هنا لحماية النظام)
export async function deleteInvoiceByNumber(invoiceNumber: string) {
  return await prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findFirst({
      where: { number: invoiceNumber },
      include: { lines: true }
    });

    if (invoice) {
      // إرجاع المخزون
      for (const line of invoice.lines) {
        const stockMove = await tx.stockMove.findFirst({
          where: { reference: invoiceNumber, productId: line.productId }
        });
        const warehouseId = stockMove?.sourceWarehouseId || "w-main";
        await tx.productStock.updateMany({
          where: { productId: line.productId, warehouseId: warehouseId },
          data: { quantity: { increment: line.quantity } }
        });
      }

      // تنظيف وعكس أثر قيد الكاش المرتبط بالفاتورة تماماً
      const oldCashMoveName = `CASH/${invoiceNumber}`;
      const cashMove = await tx.journalMove.findFirst({
        where: { name: oldCashMoveName },
        include: { lines: true }
      });
      if (cashMove) {
        const cashLine = cashMove.lines.find(l => l.debit > 0);
        if (cashLine) {
          await tx.account.update({
            where: { id: cashLine.accountId },
            data: { currentBalance: { decrement: cashLine.debit } }
          });
        }
        await tx.journalMove.delete({ where: { id: cashMove.id } });
      }

      // حذف بقية الارتباطات
      await tx.stockMove.deleteMany({ where: { reference: invoiceNumber } });
      await tx.invoiceLine.deleteMany({ where: { invoiceId: invoice.id } });
      if (invoice.journalMoveId) {
        await tx.journalMove.delete({ where: { id: invoice.journalMoveId } });
      }
      await tx.invoice.delete({ where: { id: invoice.id } });
    }

    return { success: true };
  });
}
