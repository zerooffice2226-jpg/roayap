// src/app/actions/vendor-ledger-ops.ts
"use server"
import { prisma } from "@/lib/prisma"

// 1. تقرير أرصدة الموردين الإجمالية المجمعة (معزول ومحمي 100%)
export async function getVendorsSummaryReport() {
  try {
    const vendors = await prisma.partner.findMany({
      where: { type: { in: ["VENDOR", "BOTH"] } },
      include: {
        invoices: { where: { state: "POSTED", type: "IN_INVOICE" } } // المشتريات الواردة (دائن للشركة)
      },
      orderBy: { name: 'asc' }
    });

    const reportData = [];

    for (const vendor of vendors) {
      // إجمالي الفواتير المشتراة من المورد (دائن)
      const totalCredit = vendor.invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
      
      // جلب القيود المالية لصرف النقدية المرتبطة بهذا المورد من الـ ref الموحد لتفادي الـ Null
      const payments = await prisma.journalMove.findMany({
        where: {
          state: "POSTED",
          ref: { contains: `شريك:${vendor.id}` }
        }
      });

      // إجمالي الدفعات النقدية المدفوعة للمورد (مدين)
      const totalDebit = payments.reduce((sum, m) => {
        const refText = m.ref || "";
        const match = refText.match(/مبلغ:([\d.]+)/);
        const extractedAmount = match && match[1] ? parseFloat(match[1]) : 0;
        return sum + (isNaN(extractedAmount) ? 0 : extractedAmount);
      }, 0);

      const balance = totalCredit - totalDebit;

      reportData.push({
        id: vendor.id,
        name: vendor.name,
        phone: vendor.phone || "—",
        debit: totalDebit,   // ما سددناه له
        credit: totalCredit, // إجمالي مديونيته الأصلية
        balance: Math.abs(balance),
        balanceType: balance === 0 ? "مطابق" : balance > 0 ? "دائن للمورد" : "مدين (له فلوس)"
      });
    }

    return { success: true, reportData };
  } catch (error: any) {
    console.error("❌ عطل في كود الأستاذ العام للموردين:", error);
    throw new Error(`فشل في استخراج أرصدة الموردين: ${error.message}`);
  }
}

// 2. كشف الحساب التاريخي التفصيلي والتراكمي للمورد المختار
export async function getVendorStatementDetail(partnerId: string) {
  try {
    const partner = await prisma.partner.findUnique({ where: { id: partnerId } });
    if (!partner) throw new Error("المورد غير مسجل بالدفاتر");

    const invoices = await prisma.invoice.findMany({
      where: { partnerId, state: "POSTED", type: "IN_INVOICE" },
      orderBy: { date: 'asc' }
    });

    const payments = await prisma.journalMove.findMany({
      where: { state: "POSTED", ref: { contains: `شريك:${partnerId}` } },
      orderBy: { date: 'asc' }
    });

    const allEntries: any[] = [];
    
    invoices.forEach(inv => {
      allEntries.push({
        id: inv.id,
        date: inv.date ? inv.date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        reference: inv.number,
        type: "INVOICE",
        label: "فاتورة مشتريات واردة معتمدة",
        debit: 0,
        credit: inv.totalAmount
      });
    });

    payments.forEach(pay => {
      const refText = pay.ref || "";
      const match = refText.match(/مبلغ:([\d.]+)/);
      const amt = match && match[1] ? parseFloat(match[1]) : 0;
      const safeAmt = isNaN(amt) ? 0 : amt;

      allEntries.push({
        id: pay.id,
        date: pay.date ? pay.date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        reference: pay.name,
        type: "PAYMENT",
        label: "سند صرف نقدي للمورد",
        debit: safeAmt,
        credit: 0
      });
    });

    // الترتيب التاريخي التصاعدي لبناء رصيد المورد المتبقي بدقة
    allEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let runningBalance = 0;
    const correctedMoves = allEntries.map(e => {
      runningBalance += (e.credit - e.debit); // المشتريات تزيد المديونية والصرف يطرحها
      return { ...e, runningBalance };
    });

    return {
      success: true,
      vendorName: partner.name,
      phone: partner.phone || "—",
      ledgerMoves: [...correctedMoves].reverse() // الأحدث بالأعلى
    };
  } catch (error: any) {
    throw new Error(error.message || "فشل في جلب كشف حساب المورد التفصيلي");
  }
}
