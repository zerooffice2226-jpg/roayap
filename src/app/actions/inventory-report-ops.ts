// src/app/actions/inventory-report-ops.ts
"use server"
import { prisma } from "@/lib/prisma"

export async function getInventorySummaryReport() {
  try {
    const products = await prisma.product.findMany({
      include: {
        stockBalances: true // جلب رصيد الصنف في كل مخزن
      },
      orderBy: { name: 'asc' }
    });

    // إعادة هيكلة البيانات لحساب الإجماليات والقيمة المالية
    const reportData = products.map(prod => {
      // حساب إجمالي الكمية المتوفرة عبر كافة المستودعات المتعددة
      const totalQty = prod.stockBalances.reduce((sum, sb) => sum + sb.quantity, 0);
      
      return {
        id: prod.id,
        sku: prod.sku,
        name: prod.name,
        totalQuantity: totalQty,
        costPrice: prod.costPrice,
        salePrice: prod.salePrice,
        // القيمة المالية للمخزون = إجمالي الكمية × تكلفة الشراء القياسية
        stockValue: totalQty * prod.costPrice
      };
    });

    // حساب الإجمالي الكلي للمستودعات لتقديمه في كروت مؤشرات علوية للتقرير
    const totalItemsInStock = reportData.reduce((sum, item) => sum + item.totalQuantity, 0);
    const totalInventoryValue = reportData.reduce((sum, item) => sum + item.stockValue, 0);

    return {
      success: true,
      reportData,
      totalItemsInStock,
      totalInventoryValue
    };
  } catch (error) {
    throw new Error("فشل في استخراج تقرير جرد المستودعات المجمع");
  }
}
