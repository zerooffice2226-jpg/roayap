// src/app/actions/cheque-ops.ts
"use server"
import { prisma } from "@/lib/prisma"

interface NewChequeInput {
  number: string;
  bankName: string;
  amount: number;
  dueDate: string;
  type: "RECEIPT" | "PAYMENT";
  partnerId: string;
}

// 1. تسجيل الشيك الجديد وتوليد قيد الحساب الوسيط
export async function createNewCheque(data: NewChequeInput) {
  return await prisma.$transaction(async (tx) => {
    const currentYear = new Date().getFullYear();
    const journal = await tx.journal.findFirst({ where: { type: "GENERAL" } });
    if (!journal) throw new Error("دفتر العمليات غير معرّف");

    const sequenceName = `CHQ/${data.type}/${currentYear}/${data.number}`;
    
    // البحث عن الحسابات الوسيطة وحسابات العملاء
    const suspenseAccount = await tx.account.findFirst({where: {code: "110301"}});
    const customerAccount = await tx.account.findFirst({where: {code: "110201"}});

    if (!suspenseAccount) throw new Error('حساب أوراق القبض غير موجود');
    if (!customerAccount) throw new Error('حساب العملاء غير موجود');

    // إنشاء قيد اليومية الأولي (الحساب الوسيط)
    const move = await tx.journalMove.create({
      data: {
        name: sequenceName,
        journalId: journal.id,
        state: "POSTED",
        ref: `تسجيل شيك ورقي رقم ${data.number} - بنك ${data.bankName}`
      }
    });

    const cheque = await tx.cheque.create({
      data: {
        number: data.number,
        bankName: data.bankName,
        amount: data.amount,
        dueDate: new Date(data.dueDate),
        type: data.type,
        partnerId: data.partnerId,
        journalMoveId: move.id
      }
    });

    if (data.type === "RECEIPT") {
      // مدين: أوراق القبض زادت (أصل وسيط) / دائن: مديونية العميل انخفضت
      await tx.journalLine.create({ data: { name: `استلام شيك رقم ${data.number}`, debit: data.amount, credit: 0, balance: data.amount, moveId: move.id, accountId: suspenseAccount.id, partnerId: data.partnerId } });
      await tx.journalLine.create({ data: { name: `تصفية حساب العميل مؤقتاً بالشيك`, debit: 0, credit: data.amount, balance: -data.amount, moveId: move.id, accountId: customerAccount.id, partnerId: data.partnerId } });
      
      await tx.account.update({ where: { id: suspenseAccount.id }, data: { currentBalance: { increment: data.amount } } });
      await tx.account.update({ where: { id: customerAccount.id }, data: { currentBalance: { decrement: data.amount } } });
    }

    return { success: true, chequeId: cheque.id };
  });
}

// 2. المقاصة البنكية: تحديث حالة الشيك ونقل الكاش للبنك الجاري فعلياً
export async function clearChequeInBank(chequeId: string, bankAccountId: string) {
  return await prisma.$transaction(async (tx) => {
    const cheque = await tx.cheque.findUnique({ where: { id: chequeId } });
    if (!cheque || cheque.state !== "PENDING") throw new Error("الشيك غير متاح للصرف");

    const currentYear = new Date().getFullYear();
    const journal = await tx.journal.findFirst({ where: { type: "BANK" } });
    if (!journal) throw new Error("دفتر البنك غير معرف");

    // البحث عن الحساب الوسيط
    const suspenseAccount = await tx.account.findFirst({where: {code: "110301"}});
    if (!suspenseAccount) throw new Error('حساب أوراق القبض غير موجود');

    const move = await tx.journalMove.create({
      data: {
        name: `CLR/${currentYear}/${cheque.number}`,
        journalId: journal?.id,
        state: "POSTED",
        ref: `مقاصة وصرف فعلي للشيك رقم ${cheque.number}`
      }
    });

    // مدين: حساب البنك الجاري زاد كاش فعلياً / دائن: إغلاق حساب أوراق القبض الوسيط وتصفيره
    await tx.journalLine.create({ data: { name: `تحصيل شيك رقم ${cheque.number} في الحساب`, debit: cheque.amount, credit: 0, balance: cheque.amount, moveId: move.id, accountId: bankAccountId } });
    await tx.journalLine.create({ data: { name: `تصفية حساب أوراق القبض الوسيط للشيك`, debit: 0, credit: cheque.amount, balance: -cheque.amount, moveId: move.id, accountId: suspenseAccount.id } });

    await tx.account.update({ where: { id: bankAccountId }, data: { currentBalance: { increment: cheque.amount } } });
    await tx.account.update({ where: { id: suspenseAccount.id }, data: { currentBalance: { decrement: cheque.amount } } });

    await tx.cheque.update({ where: { id: chequeId }, data: { state: "CLEARED" } });

    return { success: true };
  });
}
