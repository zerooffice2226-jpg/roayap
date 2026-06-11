// src/app/actions/returns-ops.ts
"use server"
import { prisma } from "@/lib/prisma"

interface ReturnInput {
  invoiceId: string; // الفاتورة الأصلية المراد إرجاع جزء منها أو كلها
  items: { productId: string; quantity: number; priceUnit: number }[];
  type: "SALE_RETURN" | "PURCHASE_RETURN"; // مردود مبيعات أو مردود مشتريات
}

export async function processProductReturn(data: ReturnInput) {
  return await prisma.$transaction(async (tx) => {
    const currentYear = new Date().getFullYear();
    
    // 1. جلب بيانات الفاتورة الأصلية والتحقق منها
    const originalInvoice = await tx.invoice.findUnique({
      where: { id: data.invoiceId },
      include: { partner: true }
    });
    if (!originalInvoice) throw new Error("الفاتورة الأصلية غير موجودة");

    // 2. حساب إجمالي مبلغ المردودات
    const totalReturnAmount = data.items.reduce((sum, item) => sum + (item.quantity * item.priceUnit), 0);

    // 3. تحديد دفتر اليومية التلقائي وتوليد السيريال (مثال: RET/INV/2026/0001)
    const journalType = data.type === "SALE_RETURN" ? "SALE" : "PURCHASE";
    const journal = await tx.journal.findFirst({ where: { type: journalType } });
    if (!journal) throw new Error("دفتر اليومية الخاص بالعملية غير معرف");

    const prefix = `RET/${journal.code}/${currentYear}/`;
    const lastMove = await tx.journalMove.findFirst({
      where: { journalId: journal.id, name: { startsWith: prefix } },
      orderBy: { name: 'desc' },
      select: { name: true }
    });
    let nextNum = 1;
    if (lastMove) {
      const parts = lastMove.name.split('/');
      nextNum = parseInt(parts[parts.length - 1], 10) + 1;
    }
    const sequenceName = `${prefix}${String(nextNum).padStart(4, '0')}`;

    // 4. إنشاء قيد اليومية العكسي للمردودات
    const journalMove = await tx.journalMove.create({
      data: {
        name: sequenceName,
        journalId: journal.id,
        state: "POSTED",
        ref: `مردودات مسموحات عن مستند رقم ${originalInvoice.number}`
      }
    });

    // 5. الحسابات المالية المتأثرة
    const customerAccountId = "110201"; // حساب العملاء
    const vendorAccountId = "id-حساب-الدائنون-الموردين"; // حساب الموردين
    const inventoryAccountId = "110401"; // حساب المخزن

    // 6. تدوير السطور وعكس أثر المخازن والمالية (منطق أودو الصارم)
    if (data.type === "SALE_RETURN") {
      // [مردود مبيعات]: مديونية العميل تنخفض (دائن Credit) / حساب الإيرادات ينخفض (مدين Debit)
      await tx.journalLine.create({
        data: { name: `مردودات مبيعات - مستند ${sequenceName}`, debit: totalReturnAmount, credit: 0, balance: totalReturnAmount, moveId: journalMove.id, accountId: originalInvoice.partnerId } // استخدام حساب الإيراد المرتبط أو حساب مردود مبيعات مخصص
      });
      await tx.journalLine.create({
        data: { name: `تخفيض حساب العميل للمردودات`, debit: 0, credit: totalReturnAmount, balance: -totalReturnAmount, moveId: journalMove.id, accountId: customerAccountId, partnerId: originalInvoice.partnerId }
      });

      // إعادة البضاعة المباعة إلى كميات المخزن الفعلي
      for (const item of data.items) {
        await tx.product.update({ where: { id: item.productId }, data: { currentStock: { increment: item.quantity } } });
        // تسجيل حركة مخزن واردة (INCOMING) بسبب المردود
        await tx.stockMove.create({ data: { reference: sequenceName, type: "INCOMING", quantity: item.quantity, unitCost: item.priceUnit, productId: item.productId, partnerId: originalInvoice.partnerId } });
      }

      // تحديث أرصدة الحسابات
      await tx.account.update({ where: { id: customerAccountId }, data: { currentBalance: { decrement: totalReturnAmount } } });

    } else {
      // [مردود مشتريات]: مديونية المورد تنخفض (مدين Debit) / أصل المخزن المالي ينخفض (دائن Credit)
      await tx.journalLine.create({
        data: { name: `تخفيض مستحقات المورد للمردودات`, debit: totalReturnAmount, credit: 0, balance: totalReturnAmount, moveId: journalMove.id, accountId: vendorAccountId, partnerId: originalInvoice.partnerId }
      });
      await tx.journalLine.create({
        data: { name: `مردودات مشتريات - مستند ${sequenceName}`, debit: 0, credit: totalReturnAmount, balance: -totalReturnAmount, moveId: journalMove.id, accountId: inventoryAccountId }
      });

      // إخراج البضاعة المعطوبة من المخزن الفعلي
      for (const item of data.items) {
        await tx.product.update({ where: { id: item.productId }, data: { currentStock: { decrement: item.quantity } } });
        // تسجيل حركة مخزن خارجة (OUTGOING) للإرجاع
        await tx.stockMove.create({ data: { reference: sequenceName, type: "OUTGOING", quantity: item.quantity, unitCost: item.priceUnit, productId: item.productId, partnerId: originalInvoice.partnerId } });
      }

      // تحديث أرصدة الحسابات
      await tx.account.update({ where: { id: vendorAccountId }, data: { currentBalance: { increment: totalReturnAmount } } });
      await tx.account.update({ where: { id: inventoryAccountId }, data: { currentBalance: { decrement: totalReturnAmount } } });
    }

    return { success: true, returnNumber: sequenceName };
  });
}
