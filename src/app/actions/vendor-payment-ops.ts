// src/app/actions/vendor-payment-ops.ts
"use server"
import { prisma } from "@/lib/prisma"

// 1. جلب الفواتير المعتمدة حياً مع فحص هل سُدد منها جزء سابقاً
export async function getUnpaidVendorBills() {
  try {
    const bills = await prisma.invoice.findMany({
      where: {
        type: "IN_INVOICE",
        state: "POSTED",
        totalAmount: { gt: 0 } // جلب الفواتير التي لا تزال تحمل مديونية
      },
      include: {
        partner: true
      },
      orderBy: { date: 'desc' }
    });

    // جلب كافة قيود الصرف المالي المسجلة بالفترات السابقة لتحديد الفواتير المسددة جزئياً
    const allPaymentMoves = await prisma.journalMove.findMany({
      where: { name: { startsWith: "PAY/" } }
    });

    return bills.map(b => {
      // فحص هل يوجد أي قيد مالي صرف يشير لرقم هذه الفاتورة بالـ Reference
      const hasHistory = allPaymentMoves.some(move => move.ref?.includes(b.number));

      return {
        id: b.id,
        number: b.number,
        partnerName: b.partner?.name || "مورد نقدي معتمد",
        date: b.date ? b.date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        totalAmount: b.totalAmount,
        amountDue: b.totalAmount, // المبلغ المتبقي المستحق
        isPartialPaid: hasHistory // 💡 علامة ذكية لتلوين الفاتورة المسددة جزئياً بصرياً
      };
    });
  } catch (error) {
    throw new Error("فشل في جلب مستندات مديونيات الموردين");
  }
}

// 2. معالجة السداد وتثبيت الدفعة داخل الـ JournalMove لتعمل كـ سجل History
export async function processVendorPayment(data: { billId: string, paymentAmount: number, accountCode: string }) {
  return await prisma.$transaction(async (tx) => {
    const bill = await tx.invoice.findUnique({ where: { id: data.billId } });
    if (!bill) throw new Error("الفاتورة غير موجودة بالدفاتر");

    const currentDue = bill.totalAmount;
    if (data.paymentAmount > currentDue) throw new Error("المبلغ المدخل أكبر من قيمة المستحق");

    const newDue = currentDue - data.paymentAmount;

    // تحديث المتبقي من الفاتورة سحابياً
    await tx.invoice.update({
      where: { id: data.billId },
      data: { totalAmount: newDue }
    });

    let journal = await tx.journal.findFirst({ where: { type: "BANK" } });
    if (!journal) journal = await tx.journal.create({ data: { name: "دفتر صرف النقدية", code: "PAY", type: "BANK" } });

    const sequenceCode = `PAY/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`;
    
    // 💡 إنشاء حركة قيد الصرف النقدي لتسجيلها كتاريخ أبدي مثبت للفاتورة
    await tx.journalMove.create({
      data: {
        name: sequenceCode,
        journalId: journal.id,
        state: "POSTED",
        date: new Date(),
        // نضع مبلغ الصرف واسم الحساب داخل النص ليقوم الكود بقراءته وعرضه بالـ History
        ref: `مبلغ:${data.paymentAmount}|حساب:${data.accountCode}|مستند:${bill.number}`
      }
    });

    return { success: true, remaining: newDue };
  });
}

// 3. 💡 تابع الجلب الذكي المضاف لاستخراج سجل الدفعات النقدية السابقة للفاتورة
export async function getBillPaymentHistory(billNumber: string) {
  try {
    const moves = await prisma.journalMove.findMany({
      where: {
        name: { startsWith: "PAY/" },
        ref: { contains: billNumber }
      },
      orderBy: { date: 'desc' }
    });

    return moves.map(m => {
      // تفكيك النص المستخرج واستخراج الأرقام الحقيقية
      const parts = m.ref?.split('|') || [];
      const amtPart = parts.find(p => p.startsWith("مبلغ:"))?.split(':')[1] || "0";
      const accPart = parts.find(p => p.startsWith("حساب:"))?.split(':')[1] || "—";

      return {
        id: m.id,
        code: m.name,
        date: m.date.toISOString().split('T')[0],
        amount: parseFloat(amtPart),
        account: accPart === "110102" ? "بنك مصر الجاري" : "خزينة كاش الرئيسية"
      };
    });
  } catch (error) {
    return [];
  }
}
