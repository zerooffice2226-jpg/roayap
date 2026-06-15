// src/app/actions/stock-adjustment-ops.ts
"use server"
import { prisma } from "@/lib/prisma"

interface AdjustmentItem {
  productId: string;
  warehouseId: string;
  countedQty: number;
  theoreticalQty: number;
  difference: number;
}

export async function applyBulkInventoryAdjustment(items: AdjustmentItem[]) {
  return await prisma.$transaction(async (tx) => {
    const currentYear = new Date().getFullYear();
    const sequenceNum = Math.floor(1000 + Math.random() * 9000);
    const referenceCode = `STK/ADJ/${currentYear}/${sequenceNum}`;

    for (const item of items) {
      // 1. تعديل الرصيد الدفتري القديم في جدول ProductStock ليصبح مساوياً للعدد الواقعي الفعلي
      await tx.productStock.upsert({
        where: {
          productId_warehouseId: {
            productId: item.productId,
            warehouseId: item.warehouseId
          }
        },
        update: { quantity: item.countedQty }, // تحديث مباشر بالعدد الواقعي
        create: {
          productId: item.productId,
          warehouseId: item.warehouseId,
          quantity: item.countedQty
        }
      });

      // 2. إذا كان هناك تباين (عجز أو فائض)، نسجل مستند حركة مخازن للتأريخ والتدقيق
      if (item.difference !== 0) {
        await tx.stockMove.create({
          data: {
            reference: referenceCode,
            type: item.difference > 0 ? "INCOMING" : "OUTGOING",
            quantity: Math.abs(item.difference),
            unitCost: 0, // تسوية جردية
            productId: item.productId,
            destWarehouseId: item.difference > 0 ? item.warehouseId : null,
            sourceWarehouseId: item.difference < 0 ? item.warehouseId : null
          }
        });
      }
    }

    return { success: true };
  });
}