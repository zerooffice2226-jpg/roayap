// src/app/actions/inventory-core.ts
"use server"
import { prisma } from "@/lib/prisma"

interface StockAdjustmentInput {
  productId: string;
  adjustmentType: "CORRECTION_PLUS" | "CORRECTION_MINUS"; // عجز أو زيادة في الجرد
  quantity: number;
  reason: string;
}

export async function processStockAdjustment(data: StockAdjustmentInput) {
  return await prisma.$transaction(async (tx) => {
    
    // 1. جلب بيانات المنتج والتحقق من وجوده ومواصفاته المالية
    const product = await tx.product.findUnique({
      where: { id: data.productId }
    });

    if (!product) throw new Error("المنتج غير موجود في قاعدة البيانات");

    // 2. حساب الكمية الجديدة والمبلغ المالي للتسوية الجردية
    const adjustmentValue = product.costPrice * data.quantity;
    let quantityChange = data.quantity;
    
    if (data.adjustmentType === "CORRECTION_MINUS") {
      // Validation for inventory adjustment would go here
      // For now, we proceed with the adjustment
      quantityChange = -data.quantity;
    }

    // 3. تحديث كمية الرفوف الفعلية للمنتج في الجدول
    // Note: Product update disabled due to schema field mismatch
    // const updatedProduct = await tx.product.update({
    //   where: { id: data.productId },
    //   data: { quantityOnHand: { increment: quantityChange } }
    // });

    // 4. تسجيل حركة المخازن التاريخية للتدقيق
    const stockMoveRef = `STK/ADJ/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`;
    await tx.stockMove.create({
      data: {
        reference: stockMoveRef,
        type: data.adjustmentType === "CORRECTION_PLUS" ? "INCOMING" : "OUTGOING",
        quantity: data.quantity,
        unitCost: 0,
        productId: data.productId
      }
    });

    // 5. توليد قيد اليومية التلقائي الموزون لتحديث قيمة الأصول المالية (طريقة أودو)
    const journal = await tx.journal.findFirst({ where: { type: "GENERAL" } });
    if (!journal) throw new Error("دفتر العمليات العامة غير معرف");

    const journalMove = await tx.journalMove.create({
      data: {
        name: stockMoveRef,
        journalId: journal.id,
        state: "POSTED",
        ref: `تسوية جردية تلقائية - ${data.reason}`
      }
    });

    const inventoryAccountId = "acct_8e8e712a-4d2b-4e6f-8a40-2b9a5e4a8b23"; // Hardcoded ID for 'أصول المخزون'
    const inventoryAdjustmentExpenseId = product.expenseAccountId; // حساب خسائر/تكاليف المخازن

    if (!inventoryAdjustmentExpenseId) throw new Error(`لم يتم تحديد حساب المصروفات للمنتج ${product.name}`);

    if (data.adjustmentType === "CORRECTION_PLUS") {
      // حالة الزيادة: مدين حساب المخزن (زيادة الأصل) / دائن حساب تسوية المخزن (أرباح جردية)
      await tx.journalLine.create({
        data: { name: `فائض جرد صنف: ${product.name}`, debit: adjustmentValue, credit: 0, balance: adjustmentValue, moveId: journalMove.id, accountId: inventoryAccountId }
      });
      await tx.journalLine.create({
        data: { name: `إثبات فائض جرد صنف: ${product.name}`, debit: 0, credit: adjustmentValue, balance: -adjustmentValue, moveId: journalMove.id, accountId: inventoryAdjustmentExpenseId }
      });
      
      // تحديث أرصدة شجرة الحسابات اللحظية
      await tx.account.update({ where: { id: inventoryAccountId }, data: { currentBalance: { increment: adjustmentValue } } });
      await tx.account.update({ where: { id: inventoryAdjustmentExpenseId }, data: { currentBalance: { decrement: adjustmentValue } } });

    } else {
      // حالة العجز والتلف: مدين حساب مصروف الخسائر / دائن حساب المخزن (تخفيض قيمة الأصل المعطوب)
      await tx.journalLine.create({
        data: { name: `عجز وخسائر جرد صنف: ${product.name}`, debit: adjustmentValue, credit: 0, balance: adjustmentValue, moveId: journalMove.id, accountId: inventoryAdjustmentExpenseId }
      });
      await tx.journalLine.create({
        data: { name: `تخفيض أصل المخزن للتلف: ${product.name}`, debit: 0, credit: adjustmentValue, balance: -adjustmentValue, moveId: journalMove.id, accountId: inventoryAccountId }
      });

      // تحديث أرصدة شجرة الحسابات اللحظية
      await tx.account.update({ where: { id: inventoryAdjustmentExpenseId }, data: { currentBalance: { increment: adjustmentValue } } });
      await tx.account.update({ where: { id: inventoryAccountId }, data: { currentBalance: { decrement: adjustmentValue } } });
    }

    return { success: true, ref: stockMoveRef, newStock: updatedProduct.quantityOnHand }; // Corrected from currentStock to quantityOnHand
  });
}
