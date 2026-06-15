// src/app/actions/cash-receipt-ops.ts
"use server"
import { prisma } from "@/lib/prisma"

export async function postCashTransaction(data: any) {
  return await prisma.$transaction(async (tx) => {
    const today = new Date();
    const currentYear = today.getFullYear();

    let journal = await tx.journal.findFirst({ where: { type: "CASH" } });
    if (!journal) {
      journal = await tx.journal.create({
        data: { name: "دفتر النقدية العمومية", code: "TX", type: "CASH" }
      });
    }

    const prefix = `TX/${currentYear}/`;
    const lastMove = await tx.journalMove.findFirst({
      where: { journalId: journal.id, name: { startsWith: prefix } },
      orderBy: { name: 'desc' }
    });
    
    let nextNum = 1;
    if (lastMove) {
        const lastNumStr = lastMove.name.split('/').pop();
        if (lastNumStr) {
            const lastNum = parseInt(lastNumStr, 10);
            if (!isNaN(lastNum)) {
                nextNum = lastNum + 1;
            }
        }
    }
    const sequenceCode = `${prefix}${String(nextNum).padStart(4, '0')}`;

    const paymentAmount = Number(data.amount) || 0;

    if (data.liquidAccountId) {
      await tx.account.update({
        where: { id: data.liquidAccountId },
        data: {
          currentBalance: {
            [data.transType === "RECEIPT" ? "increment" : "decrement"]: paymentAmount
          }
        }
      });
    }

    // 💡 التحديث الذكي: دمج اسم الخزينة المحددة حركياً داخل حقل الـ ref لمنع السقوط الدفتري
    await tx.journalMove.create({
      data: {
        name: sequenceCode,
        journalId: journal.id,
        state: "POSTED",
        date: today,
        // حقن اسم الخزينة (مثل: الخزنة الرئيسية) داخل سلسلة الـ ref
        ref: `مبلغ:${paymentAmount}|حساب:${data.accountType || "EXPENSE"}|شريك:${data.subEntityId || "لا يوجد"}|خزينة:${data.liquidAccountName || "الخزينة العمومية"}|مستند:${data.statement || "سند معتمد"}`
      }
    });

    return { success: true, reference: sequenceCode };
  });
}

export async function getLiquidAccounts() {
  try {
    return await prisma.account.findMany({
      where: {
        OR: [
          { code: { startsWith: "110" } },
          { name: { contains: "خزينة" } },
          { name: { contains: "بنك" } }
        ]
      },
      orderBy: { code: 'asc' }
    });
  } catch (error) {
    return [
      { id: "acc-1", code: "110103", name: "110103 - الخزنة الرئيسية" }
    ];
  }
}

export async function getExpenseAccounts() {
  try {
    return await prisma.account.findMany({
      where: {
        OR: [
          { code: { startsWith: "3" } },
          { code: { startsWith: "5" } },
          { name: { contains: "مصروف" } }
        ]
      },
      orderBy: { code: 'asc' }
    });
  } catch (error) {
    return [];
  }
}