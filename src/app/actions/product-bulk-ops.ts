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

async function getDefaultAccounts(tx: any) {
  const incomeAccount = await tx.account.findFirst({
    where: {
      OR: [
        { code: "410101" },
        { code: "410000" },
        { name: { contains: "إيرادات المبيعات" } }
      ]
    }
  }) || await tx.account.findFirst({
    where: { type: "INCOME" }
  });

  const expenseAccount = await tx.account.findFirst({
    where: {
      OR: [
        { code: "510101" },
        { code: "510000" },
        { name: { contains: "تكلفة البضاعة" } },
        { name: { contains: "COGS" } }
      ]
    }
  }) || await tx.account.findFirst({
    where: { type: "EXPENSE" }
  });

  return { incomeAccount, expenseAccount };
}

export async function importProductsBulk(items: BulkProductItem[], targetWarehouseId?: string) {
  return await prisma.$transaction(async (tx) => {
    let importedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    const { incomeAccount: defaultIncome, expenseAccount: defaultExpense } = await getDefaultAccounts(tx);

    if (!defaultIncome) {
      throw new Error("لا يوجد حساب إيرادات المبيعات! يرجى إنشاء حساب (410101)");
    }
    if (!defaultExpense) {
      throw new Error("لا يوجد حساب تكلفة البضاعة المباعة! يرجى إنشاء حساب (510101)");
    }

    for (const item of items) {
      if (!item.sku || !item.name) {
        skippedCount++;
        errors.push(`تم تخطي صنف بدون اسم أو SKU`);
        continue;
      }

      const existing = await tx.product.findUnique({ where: { sku: String(item.sku) } });
      if (existing) {
        skippedCount++;
        continue;
      }

      const product = await tx.product.create({
        data: {
          name: item.name,
          sku: String(item.sku),
          salePrice: Number(item.salePrice) || 0,
          costPrice: Number(item.costPrice) || 0,
          incomeAccountId: defaultIncome.id,
          expenseAccountId: defaultExpense.id,
        }
      });

      if (item.currentStock > 0 && targetWarehouseId) {
        await tx.productStock.create({
          data: {
            productId: product.id,
            warehouseId: targetWarehouseId,
            quantity: Number(item.currentStock) || 0
          }
        });

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

    return { 
      success: true, 
      importedCount, 
      skippedCount,
      errors,
      message: `✅ تم استيراد ${importedCount} منتج\n- ربطهم بـ: الإيراد (${defaultIncome.code})، التكلفة (${defaultExpense.code})${errors.length > 0 ? `\n- تحذيرات: ${errors.length}` : ''}`
    };
  });
}