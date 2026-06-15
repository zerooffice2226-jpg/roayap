// src/app/actions/summary-ops.ts
"use server"
import { prisma } from "@/lib/prisma"

export async function getLiveExecutiveSummary(startDate: string, endDate: string) {
  try {
    const start = new Date(`${startDate}T00:00:00.000Z`);
    const end = new Date(`${endDate}T23:59:59.999Z`);

    // 1. حساب ملخص المبيعات (مدين فواتير المبيعات الصادرة POSTED)
    const salesInvoices = await prisma.invoice.findMany({
      where: { type: "OUT_INVOICE", state: "POSTED", date: { gte: start, lte: end } },
      select: { totalAmount: true }
    });
    const totalSales = salesInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);

    // 2. حساب رصيد الصناديق التراكمي (مجموع currentBalance للخزائن الحية)
    const accounts = await prisma.account.findMany({
      where: { OR: [{ code: { startsWith: "1101" } }, { name: { contains: "خزينة" } }] },
      select: { currentBalance: true }
    });
    const totalCash = accounts.reduce((sum, acc) => sum + (Number((acc as any).currentBalance) || 0), 0);

    // 3. حساب إجمالي كميات المخزن (مجموع قطع البضائع الحالية بالرفوف)
    const stockBalances = await prisma.productStock.findMany({
      select: { quantity: true }
    });
    const totalStockQty = stockBalances.reduce((sum, sb) => sum + (sb.quantity || 0), 0);

    // 4. حصر المنتجات المطلوبة (الأصناف التي نفدت ورصيدها الكلي صفر أو سالب)
    const allProducts = await prisma.product.findMany({
      include: { stockBalances: true }
    });
    const outOfStockProducts = allProducts.filter(p => {
      const totalProdQty = p.stockBalances.reduce((sum, sb) => sum + (sb.quantity || 0), 0);
      return totalProdQty <= 0;
    });

    return {
      success: true,
      totalSales,
      totalCash,
      totalStockQty,
      zeroProductsCount: outOfStockProducts.length,
      zeroProductsList: outOfStockProducts.map(p => ({ id: p.id, name: p.name, sku: p.sku }))
    };
  } catch (error) {
    return { success: false, totalSales: 0, totalCash: 0, totalStockQty: 0, zeroProductsCount: 0, zeroProductsList: [] };
  }
}
