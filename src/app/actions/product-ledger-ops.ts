// src/app/actions/product-ledger-ops.ts
"use server"
import { prisma } from "@/lib/prisma"

export async function getProductLedgerDetail(productId: string) {
  try {
    // 1. جلب بيانات كارت الصنف
    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) throw new Error("الصنف غير معرّف بالنظام");

    // 2. جلب كافة الحركات المخزنية الحقيقية المرتبطة بهذا الصنف حصرياً مرتبة تاريخياً من الأقدم للأحدث
    const rawMoves = await prisma.stockMove.findMany({
      where: { productId: productId },
      orderBy: { date: 'asc' }, // التعديل الحاسم لتفادي الـ Unknown argument
      include: {
        partner: true 
      }
    });

    // 3. بناء الرصيد التراكمي الرياضي الصحيح خطوة بخطوة (الوارد يزود والمنصرف يخصم)
    let currentStockValue = 0;
    const stockMoves = rawMoves.map((move) => {
      if (move.type === "INCOMING") {
        currentStockValue += move.quantity; // الوارد يرفع الرصيد
      } else {
        currentStockValue -= move.quantity; // المنصرف يخفض الرصيد
      }

      return {
        id: move.id,
        // قراءة الحقل الحقيقي والتأكد من تحويله لنص تاريخ نظيف (YYYY-MM-DD)
        date: move.date ? new Date(move.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        reference: move.reference,
        type: move.type,
        quantity: move.quantity,
        unitCost: move.unitCost || product.costPrice,
        partnerName: move.partner?.name || "عميل نقدي/تسوية جردية",
        runningStock: currentStockValue
      };
    });

    // عكس المصفوفة للأشخاص المحبين لرؤية الحركات الأحدث في أعلى الجدول البصري
    const displayMoves = [...stockMoves].reverse();

    return {
      success: true,
      productName: product.name,
      sku: product.sku,
      currentRunningStock: currentStockValue,
      stockMoves: displayMoves
    };
  } catch (error: any) {
    throw new Error(error.message || "فشل في جلب تقرير حركة الصنف");
  }
}