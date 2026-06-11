// src/app/actions/vendor-payment-ops.ts
"use server"
import { prisma } from "@/lib/prisma"

interface VendorPaymentPayload {
  invoiceId: string;
  amountPaid: number;
  bankAccountId: string;     // حساب البنك/الخزينة الذي خرجت منه الأموال
  cashierJournalId: string;  // دفتر يومية البنك أو النقدية المستخدم
}

export async function processVendorBillPayment({ invoiceId, amountPaid, bankAccountId, cashierJournalId }: VendorPaymentPayload) {
  try {
  return await prisma.$transaction(async (tx) => {
    
    // 1. جلب فاتورة المشتريات مع بيانات المورد
    const bill = await tx.invoice.findUnique({
      where: { id: invoiceId },
      include: { partner: true }
    });

    if (!bill) throw new Error("فاتورة المشتريات غير موجودة");
    if (bill.type !== "IN_INVOICE") throw new Error("المستند المحدد ليس فاتورة مشتريات");
    if (bill.state === "PAID") {
      throw new Error("يمكن فقط سداد الفواتير الموردة المعتمدة وغير المدفوعة بالكامل");
    }

    // 2. إنشاء قيد السداد (سند صرف للمورد) تلقائياً بنظام سيريال أودو
    const currentYear = new Date().getFullYear();
    const payMove = await tx.journalMove.create({
      data: {
        name: `VPA/${bill.partner.name.substring(0,3).toUpperCase()}/${currentYear}/${Math.floor(1000 + Math.random() * 9000)}`,
        journalId: cashierJournalId,
        state: "POSTED",
        ref: `سداد الدفعة المستحقة لفاتورة المشتريات رقم ${bill.number}`
      }
    });

    // 3. بناء أسطر القيد المزدوج: الخصوم (المورد) تقل في المدين، والأصول (البنك) تقل في الدائن
    const vendorAccountId = "210101"; // حساب الموردين/الدائنون

    // السطر الأول: حساب الموردين/الدائنون (مدين DEBIT - لتقليص الالتزامات والمديونية المترتبة علينا)
    await tx.journalLine.create({
      data: {
        name: `تسوية وإغلاق مديونية المورد عن فاتورة ${bill.number}`,
        debit: amountPaid,
        credit: 0,
        balance: amountPaid,
        moveId: payMove.id,
        accountId: vendorAccountId,
        partnerId: bill.partnerId
      }
    });

    // السطر الثاني: حساب البنك/الخزينة (دائن CREDIT - خرجت منه الأموال ونقص الأصل السائل)
    await tx.journalLine.create({
      data: {
        name: `خروج كاش لسداد المورد - فاتورة ${bill.number}`,
        debit: 0,
        credit: amountPaid,
        balance: -amountPaid,
        moveId: payMove.id,
        accountId: bankAccountId,
        partnerId: bill.partnerId
      }
    });

    // 4. التحديث اللحظي الصارم للأرصدة الجارية داخل دليل الحسابات
    await tx.account.update({ where: { code: vendorAccountId }, data: { currentBalance: { decrement: amountPaid } } }); 
    await tx.account.update({ where: { code: bankAccountId }, data: { currentBalance: { decrement: amountPaid } } });

    // 5. تغيير حالة الفاتورة إلى مدفوعة بالكامل (PAID) في حال تغطية القيمة
    const updatedState = amountPaid >= bill.totalAmount ? "PAID" : "POSTED";
    
    await tx.invoice.update({
      where: { id: invoiceId },
      data: { state: updatedState }
    });

    return { success: true, paymentMoveName: payMove.name, status: updatedState };
  });
} catch (e) {
    return { success: false, status: "DRAFT" };
}

}
