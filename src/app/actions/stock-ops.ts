// src/app/actions/stock-ops.ts
"use server"

import { prisma } from "@/lib/prisma"

// 1. تابع لجلب قائمة المنتجات لعرضها في الشاشة
export async function getProducts() {
  try {
    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        quantityOnHand: true,
      },
      orderBy: {
        name: 'asc'
      }
    });
    return products;
  } catch (error) {
    console.error("فشل في جلب المنتجات:", error);
    return [];
  }
}

interface StockMoveInput {
  productId: string;
  moveType: "INCOMING" | "OUTGOING";
  quantity: number;
}

// 2. محرك السيرفر لتسجيل حركة المخزن وتحديث كمية المنتج
export async function createStockMove(data: StockMoveInput) {
  const { productId, moveType, quantity } = data;

  if (!productId || quantity <= 0) {
    throw new Error("بيانات غير صالحة. يرجى التحقق من المنتج والكمية.");
  }

  try {
    return await prisma.$transaction(async (tx) => {
      // الخطوة الأولى: جلب المنتج الحالي للتأكد من وجوده وتوفر الكمية للصرف
      const product = await tx.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        throw new Error("المنتج المحدد غير موجود.");
      }

      // الخطوة الثانية: التحقق من كفاية الرصيد في حالة الصرف
      if (moveType === "OUTGOING" && product.quantityOnHand < quantity) {
        throw new Error(`الكمية غير كافية في المخزن. الرصيد الحالي: ${product.quantityOnHand}`);
      }
      
      // الخطوة الثالثة: تسجيل الحركة المخزنية كسجل تاريخي للتدقيق
      const stockMove = await tx.stockMove.create({
        data: {
          productId: productId,
          type: moveType,
          quantity: quantity,
        }
      });

      // الخطوة الرابعة: تحديث كمية المنتج في بطاقة الصنف الرئيسية
      const updatedQuantity = moveType === 'INCOMING' 
        ? product.quantityOnHand + quantity
        : product.quantityOnHand - quantity;

      await tx.product.update({
        where: { id: productId },
        data: { quantityOnHand: updatedQuantity },
      });

      return { success: true, stockMoveId: stockMove.id, newQuantity: updatedQuantity };
    });
  } catch (error: any) {
    console.error("خطأ أثناء تسجيل حركة المخزن:", error.message);
    // Re-throw the specific error message to be caught by the client
    throw new Error(error.message || "فشل في تسجيل حركة المخزن وتحديث الكميات.");
  }
}
