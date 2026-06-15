// src/app/actions/inventory-report-ops.ts
"use server"
import { prisma } from "@/lib/prisma"

export async function getInventorySummaryReport() {
  try {
    const products = await prisma.product.findMany({
      include: {
        stockMoves: true // الاعتماد الكلي على سجل الحركات التاريخية الفعلي لضمان النزاهة
      },
      orderBy: { name: 'asc' }
    });

    const reportData = products.map(prod => {
      // 1. حساب إجمالي الكميات الواردة المعتمدة
      const totalIncoming = prod.stockMoves
        .filter(move => move.type === "INCOMING")
        .reduce((sum, move) => sum + move.quantity, 0);

      // 2. حساب إجمالي الكميات المنصرفة المعتمدة
      const totalOutgoing = prod.stockMoves
        .filter(move => move.type === "OUTGOING")
        .reduce((sum, move) => sum + move.quantity, 0);

      // 3. 💡 المعادلة الذهبية المحكمة: الرصيد الجاري الحالي = (إجمالي الوارد - إجمالي المنصرف)
      const currentBalance = totalIncoming - totalOutgoing;

      return {
        id: prod.id,
        sku: prod.sku,
        name: prod.name,
        incomingQty: totalIncoming,
        outgoingQty: totalOutgoing,
        totalQuantity: currentBalance, // الرصيد الصافي الموزون رياضياً مئة بالمئة
        costPrice: prod.costPrice,
        salePrice: prod.salePrice,
        stockValue: currentBalance * prod.costPrice // القيمة المالية للمخزون الجاري
      };
    });

    // كروت المؤشرات العلوية
    const totalItemsInStock = reportData.reduce((sum, item) => sum + item.totalQuantity, 0);
    const totalInventoryValue = reportData.reduce((sum, item) => sum + item.stockValue, 0);

    return {
      success: true,
      reportData,
      totalItemsInStock,
      totalInventoryValue
    };
  } catch (error) {
    throw new Error("فشل في استخراج تقرير جرد المستودعات التجميعي المطور");
  }
}
