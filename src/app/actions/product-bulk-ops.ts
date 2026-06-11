// src/app/actions/product-bulk-ops.ts
"use server"
import { prisma } from "@/lib/prisma"

interface BulkProductItem {
  name: string;
  sku: string;
  salePrice: number;
  costPrice: number;
  currentStock: number;
}

export async function importProductsBulk(items: BulkProductItem[], targetWarehouseId?: string) {
  return await prisma.$transaction(async (tx) => {
    let importedCount = 0;
    let skippedCount = 0;

    // الحسابات التوجيهية الافتراضية الثابتة والمحمية تماًماً كالصورة المعتمدة
    const defaultIncomeAccountId = "410101"; // حساب إيرادات مبيعات البضائع
    const defaultExpenseAccountId = "510101"; // حساب مصروف تكلفة البضاعة المباعة (COGS)

    for (const item of items) {
      // 1. التحقق من نظافة البيانات وعدم تكرار الباركود
      if (!item.sku || !item.name) {
        skippedCount++;
        continue;
      }

      const existing = await tx.product.findUnique({ where: { sku: String(item.sku) } });
      if (existing) {
        skippedCount++; // تخطي الصنف إذا كان الباركود مسجلاً مسبقاً لحماية المخازن
        continue;
      }

      // 2. إنشاء بطاقة الصنف وتوجيهه محاسبياً
      const product = await tx.product.create({
        data: {
          name: item.name,
          sku: String(item.sku),
          salePrice: Number(item.salePrice) || 0,
          costPrice: Number(item.costPrice) || 0,
          incomeAccountId: defaultIncomeAccountId,
          expenseAccountId: defaultExpenseAccountId,
        }
      });

      // 3. إثبات الرصيد الافتتاحي في جدول المستودعات المتعددة إذا وجد رصيد ومخزن
      if (item.currentStock > 0 && targetWarehouseId) {
        await tx.productStock.create({
          data: {
            productId: product.id,
            warehouseId: targetWarehouseId,
            quantity: Number(item.currentStock) || 0
          }
        });

        // تسجيل حركة مخزن واردة للتأريخ والتدقيق القانوني
        await tx.stockMove.create({
          data: {
            reference: `STK/BULK/${new Date().getFullYear()}/${product.sku}`,
            type: "INCOMING",
            quantity: Number(item.currentStock) || 0,
            unitCost: Number(item.costPrice) || 0,
            productId: product.id,
            destWarehouseId: targetWarehouseId
          }
        });
      }

      importedCount++;
    }

    return { success: true, importedCount, skippedCount };
  });
}
