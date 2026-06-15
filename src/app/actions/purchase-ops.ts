// src/app/actions/purchase-ops.ts
"use server"
import { prisma } from "@/lib/prisma"

export async function createAndPostPurchaseBill(data: any) {
  return await prisma.$transaction(async (tx) => {
    const today = new Date();
    const currentYear = today.getFullYear();

    // 1. حساب الإجمالي وتجهيز البنود بدقة لـ InvoiceLine
    let totalAmount = 0;
    const billLines = data.items.map((item: any) => {
      const subtotal = Number(item.quantity) * Number(item.priceUnit);
      totalAmount += subtotal;
      return { 
        productId: item.productId, 
        quantity: Number(item.quantity), 
        priceUnit: Number(item.priceUnit), 
        subtotal 
      };
    });

    // 2. جلب أو تأسيس الدفتر المالي للمشتريات (Journal Entry)
    let journal = await tx.journal.findFirst({ where: { type: "PURCHASE" } });
    if (!journal) journal = await tx.journal.create({ data: { name: "دفتر المشتريات الواردة", code: "BILL", type: "PURCHASE" } });

    // 3. التحقق هل الحركة تعديل لفاتورة قائمة أم إنشاء مستند جديد
    let sequenceName = data.existingNumber;
    let journalMoveId;

    if (data.existingNumber) {
      // إذا كان تعديلاً، ننظف السطور القديمة أولاً من المخزن والداتا بيز لمنع التضارب
      const oldBill = await tx.invoice.findFirst({ where: { number: data.existingNumber }, include: { lines: true } });
      if (oldBill) {
        for (const line of oldBill.lines) {
          const relatedMove = await tx.stockMove.findFirst({ where: { reference: data.existingNumber, productId: line.productId } });
          const whId = relatedMove?.destWarehouseId || data.warehouseId;
          await tx.productStock.updateMany({
            where: { productId: line.productId, warehouseId: whId },
            data: { quantity: { decrement: line.quantity } } // سحب الزيادة القديمة
          });
        }
        await tx.stockMove.deleteMany({ where: { reference: data.existingNumber } });
        await tx.invoiceLine.deleteMany({ where: { invoiceId: oldBill.id } });
        journalMoveId = oldBill.journalMoveId;
      }
    } else {
      // توليد سيريال مشتريات جديد صريح ونظيف
      const prefix = `${journal.code}/${currentYear}/`;
      const lastBill = await tx.journalMove.findFirst({ where: { journalId: journal.id, name: { startsWith: prefix } }, orderBy: { name: 'desc' } });
      let nextNum = lastBill ? parseInt(lastBill.name.split('/')[2]) + 1 : 1;
      if (isNaN(nextNum)) nextNum = 1;
      sequenceName = `${prefix}${String(nextNum).padStart(4, '0')}`;

      // إنشاء قيد اليومية المالي الموزون في الداتا بيز
      const journalMove = await tx.journalMove.create({
        data: { name: sequenceName, journalId: journal.id, state: "POSTED", date: today, ref: `فاتورة مشتريات رقم ${sequenceName}` }
      });
      journalMoveId = journalMove.id;
    }

    // 💡 التحديث الذهبي المصلح لإنشاء الفاتورة بعد إزالة الحقل الزائد وتجنب الـ ValidationError
    let bill;
    if (data.existingNumber) {
      const existingBill = await tx.invoice.findFirst({ where: { number: sequenceName } });
      if (!existingBill) throw new Error("المستند المراد تعديله غير موجود بالدفاتر");
      
      bill = await tx.invoice.update({
        where: { id: existingBill.id },
        data: { 
          totalAmount, 
          dueDate: new Date(data.dueDate), 
          partnerId: data.partnerId, 
          lines: { create: billLines } 
        }
      });
    } else {
      bill = await tx.invoice.create({
        data: {
          number: sequenceName,
          type: "IN_INVOICE",
          date: today,
          dueDate: new Date(data.dueDate),
          state: "POSTED", // الاعتماد الكلي على حقل الـ state المعرّف بنظامك
          partnerId: data.partnerId,
          totalAmount,
          journalMoveId: journalMoveId,
          lines: { create: billLines }
        }
      });
    }

    // 5. 💡 تحديث وزيادة المخزون الفعلي (increment) وتوليد سجل حركات كشف حساب الصنف (StockMove) حياً
    for (const item of data.items) {
      const targetWarehouse = data.warehouseId;
      if (!targetWarehouse) throw new Error("يرجى اختيار مستودع الاستلام الفعلي للفاتورة");

      // أ. زيادة رصيد الرف في المستودع المختار فوراً
      await tx.productStock.upsert({
        where: { productId_warehouseId: { productId: item.productId, warehouseId: targetWarehouse } },
        update: { quantity: { increment: Number(item.quantity) } }, 
        create: { productId: item.productId, warehouseId: targetWarehouse, quantity: Number(item.quantity) }
      });

      // ب. إنشاء حركة مخزنية رسمية مربوطة بالموّرد ليظهر اسمه حياً بكشف الحركة والتفاصيل الشجرية
      await tx.stockMove.create({
        data: { 
          reference: sequenceName, 
          type: "INCOMING", // حركة وارد مخزني تزيد رصيد بطاقة الصنف
          quantity: Number(item.quantity), 
          unitCost: Number(item.priceUnit), 
          productId: item.productId, 
          destWarehouseId: targetWarehouse,
          partnerId: data.partnerId // 💡 ربط الحركة بالموّرد لتجنب ظهور "عميل نقدي"
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
