// src/app/actions/partner-ledger-ops.ts
"use server"
import { prisma } from "@/lib/prisma"

export async function getPartnerDetailedLedger(partnerId: string) {
  try {
    // 1. جلب بيانات الشريك الأساسية
    const partner = await prisma.partner.findUnique({
      where: { id: partnerId }
    });
    if (!partner) throw new Error("الشريك غير موجود");

    // 2. جلب جميع أسطر القيود المرحّلة المرتبطة بهذا الشريك حصراً
    const lines = await prisma.journalLine.findMany({
      where: {
        partnerId: partnerId,
        move: { state: "POSTED" }
      },
      include: { move: true },
      orderBy: { move: { date: 'asc' } } // Order by the move's date
    });

    let runningBalance = 0;

    // 3. بناء صفوف كشف الحساب واحتساب الرصيد المتراكم بعد كل عملية
    const rows = lines.map((line) => {
      // For a customer: Debit increases balance, Credit decreases it.
      // For a vendor: Credit increases balance, Debit decreases it.
      // We adopt the standard accounting view: Balance = Debit - Credit for receivables.
      // To make it intuitive for both, we'll adjust based on partner type.
      let balanceEffect = line.debit - line.credit;
      if (partner.type === 'VENDOR') {
          balanceEffect = line.credit - line.debit; // For suppliers, credit is liability
      }
      runningBalance += balanceEffect;

      return {
        id: line.id,
        date: line.move.date.toISOString().split('T')[0],
        moveName: line.move.name,
        label: line.name,
        debit: line.debit,
        credit: line.credit,
        cumulativeBalance: runningBalance
      };
    });
    
    const totalDebit = lines.reduce((sum, l) => sum + l.debit, 0);
    const totalCredit = lines.reduce((sum, l) => sum + l.credit, 0);
    const finalBalance = partner.type === 'VENDOR' ? totalCredit - totalDebit : totalDebit - totalCredit;


    return {
      partnerName: partner.name,
      partnerType: partner.type,
      totalDebit,
      totalCredit,
      finalBalance,
      rows
    };
  } catch (error: any) {
    console.error("خطأ في جلب كشف حساب الشريك:", error);
    throw new Error(error.message || "فشل في جلب كشف حساب الشريك");
  }
}
