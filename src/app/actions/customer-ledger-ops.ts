// src/app/actions/customer-ledger-ops.ts
"use server"
import { prisma } from "@/lib/prisma"

// 💡 1. تقرير أرصدة ومطابقات العملاء المجمع حياً من قاعدة البيانات
export async function getCustomersSummaryReport() {
  try {
    const customers = await prisma.partner.findMany({
      where: { type: { in: ["CUSTOMER", "BOTH"] } },
      include: {
        invoices: { where: { state: "POSTED", type: "OUT_INVOICE" } } // المبيعات (مدين)
      },
      orderBy: { name: 'asc' }
    });

    const reportData = [];

    for (const cust of customers) {
      const totalDebit = cust.invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
      
      // جلب الحركات بدلالة كود الشريك المخزن بـ ref السند
      const payments = await prisma.journalMove.findMany({
        where: { 
          state: "POSTED",
          ref: { contains: `شريك:${cust.id}` }
        }
      });

      const totalCredit = payments.reduce((sum, m) => {
        const refText = m.ref || "";
        const match = refText.match(/مبلغ:([\d.]+)/);
        const extractedAmount = match && match[1] ? parseFloat(match[1]) : 0;
        return sum + (isNaN(extractedAmount) ? 0 : extractedAmount);
      }, 0);

      const balance = totalDebit - totalCredit;

      reportData.push({
        id: cust.id,
        name: cust.name,
        phone: cust.phone || "—",
        debit: totalDebit,
        credit: totalCredit,
        balance: Math.abs(balance),
        balanceType: balance === 0 ? "مطابق" : balance > 0 ? "مدين" : "دائن"
      });
    }

    return { success: true, reportData };
  } catch (error: any) {
    console.error("❌ عطل في كود الأستاذ العام للعملاء:", error);
    throw new Error(`فشل في استخراج الأرصدة: ${error.message}`);
  }
}

// 💡 2. كشف الحساب التاريخي التفصيلي المطور بميزة قراء واستخراج مسمى الخزينة الحية 🏛️
export async function getCustomerStatementDetail(partnerId: string) {
  try {
    const partner = await prisma.partner.findUnique({ where: { id: partnerId } });
    if (!partner) throw new Error("العميل غير مسجل بالنظام");

    const invoices = await prisma.invoice.findMany({
      where: { partnerId, state: "POSTED", type: "OUT_INVOICE" },
      orderBy: { date: 'asc' }
    });

    const payments = await prisma.journalMove.findMany({
      where: { 
        state: "POSTED",
        ref: { contains: `شريك:${partnerId}` }
      },
      orderBy: { date: 'asc' }
    });

    const allEntries: any[] = [];
    
    invoices.forEach(inv => {
      allEntries.push({
        id: inv.id,
        date: inv.date ? inv.date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        reference: inv.number,
        type: "INVOICE",
        label: "فاتورة مبيعات معتمدة ومرحّلة",
        debit: inv.totalAmount,
        credit: 0
      });
    });

    payments.forEach(pay => {
      const refText = pay.ref || "";
      const matchAmt = refText.match(/مبلغ:([\d.]+)/);
      const amt = matchAmt && matchAmt[1] ? parseFloat(matchAmt[1]) : 0;
      const safeAmt = isNaN(amt) ? 0 : amt;

      // 💡 استخراج اسم الخزينة ديناميكياً بـ RegEx محكم ومطابق لطلبك الفاخر
      const matchWh = refText.match(/خزينة:([^|]+)/);
      const extractedWhName = matchWh && matchWh[1] ? matchWh[1] : "الخزينة العمومية";

      allEntries.push({
        id: pay.id,
        date: pay.date ? pay.date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        reference: pay.name,
        type: "PAYMENT",
        // طبع الصيغة المطلوبة في صورتك تماماً حركياً بالجدول
        label: `تحصيل إلى خزينة "${extractedWhName}"`,
        debit: 0,
        credit: safeAmt
      });
    });

    // إعادة ضبط الحسبة التصاعدية التراكمية لبناء الأستاذ المساعد بدقة
    allEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let currentBal = 0;
    const correctedMoves = allEntries.map(e => {
      currentBal += (e.debit - e.credit);
      return { ...e, runningBalance: currentBal };
    });

    return {
      success: true,
      customerName: partner.name,
      phone: partner.phone || "—",
      ledgerMoves: [...correctedMoves].reverse() // الأحدث بالأعلى بصرياً
    };
  } catch (error: any) {
    throw new Error(error.message || "فشل في جلب كشف حساب العميل التفصيلي");
  }
}