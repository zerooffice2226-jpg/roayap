// src/app/actions/receipt-ops.ts
"use server"
import { prisma } from "@/lib/prisma"

interface ReceiptInput {
  type: "PAYMENT" | "RECEIPT"; // PAYMENT (صرف ومصروفات) أو RECEIPT (قبض وإيرادات)
  amount: number;
  bankAccountId: string;       // حساب البنك أو الخزينة المتأثر كاش
  oppositeAccountId: string;   // الحساب المقابل (حساب المصروف أو الإيراد المعني)
  description: string;
}

export async function createCashReceipt(data: ReceiptInput) {
  return await prisma.$transaction(async (tx) => {
    const currentYear = new Date().getFullYear();
    
    // 1. تحديد دفتر يومية النقدية والبنك (CASH / BANK)
    const journal = await tx.journal.findFirst({
      where: { type: { in: ["CASH", "BANK"] } }
    });
    if (!journal) throw new Error("دفتر يومية النقدية أو البنك غير معرّف");

    // 2. توليد سيريال السند تلقائياً (مثال: CSH/2024/0001)
    const prefix = `${journal.code}/${currentYear}/`;
    const lastMove = await tx.journalMove.findFirst({
      where: { journalId: journal.id, name: { startsWith: prefix } },
      orderBy: { name: 'desc' },
      select: { name: true }
    });
    let nextNum = 1;
    if (lastMove) {
      const parts = lastMove.name.split('/');
      nextNum = parseInt(parts[parts.length - 1], 10) + 1;
    }
    const sequenceName = `${prefix}${String(nextNum).padStart(4, '0')}`;

    // 3. إنشاء رأس قيد اليومية
    const journalMove = await tx.journalMove.create({
      data: {
        name: sequenceName,
        journalId: journal.id,
        state: "POSTED", // السندات النقدية ترحل فوراً في أودو
        ref: `${data.type === "PAYMENT" ? "سند صرف نقدي" : "سند قبض نقدي"} - ${data.description}`
      }
    });

    // 4. بناء أسطر القيد المزدوج (Double-Entry) وتحديث الأرصدة اللحظية
    if (data.type === "PAYMENT") {
      // [حالة الصرف]: مدين حساب المصروف (زاد) / دائن حساب الخزينة والبنك (نقص الكاش)
      await tx.journalLine.create({
        data: { name: data.description, debit: data.amount, credit: 0, balance: data.amount, moveId: journalMove.id, accountId: data.oppositeAccountId }
      });
      await tx.journalLine.create({
        data: { name: `صرف نقدي سند ${sequenceName}`, debit: 0, credit: data.amount, balance: -data.amount, moveId: journalMove.id, accountId: data.bankAccountId }
      });

      // تحديث شجرة الحسابات
      await tx.account.update({ where: { id: data.oppositeAccountId }, data: { currentBalance: { increment: data.amount } } }); // المصروف طبيعته مدين، يزيد بالـ increment
      await tx.account.update({ where: { id: data.bankAccountId }, data: { currentBalance: { decrement: data.amount } } }); // الأصل (الكاش) طبيعته مدين، ينقص بالـ decrement

    } else {
      // [حالة القبض]: مدين حساب الخزينة والبنك (زاد الكاش) / دائن حساب الإيراد المقابل (زاد)
      await tx.journalLine.create({
        data: { name: `قبض نقدي سند ${sequenceName}`, debit: data.amount, credit: 0, balance: data.amount, moveId: journalMove.id, accountId: data.bankAccountId }
      });
      await tx.journalLine.create({
        data: { name: data.description, debit: 0, credit: data.amount, balance: -data.amount, moveId: journalMove.id, accountId: data.oppositeAccountId }
      });

      // تحديث شجرة الحسابات (تصحيح منطق الإيراد)
      await tx.account.update({ where: { id: data.bankAccountId }, data: { currentBalance: { increment: data.amount } } }); // الأصل (الكاش) يزيد بالـ increment
      await tx.account.update({ where: { id: data.oppositeAccountId }, data: { currentBalance: { increment: data.amount } } }); // الإيراد طبيعته دائن، يزيد بالـ increment ليصبح رصيده الدائن أكبر
    }

    return { success: true, sequenceName };
  });
}
