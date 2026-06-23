// src/app/actions/cash-receipt-ops.ts
"use server"
import { prisma } from "@/lib/prisma"

async function updateAccountBalance(tx: any, accountId: string, debit: number, credit: number) {
  const account = await tx.account.findUnique({ where: { id: accountId } });
  if (!account) return;

  let change = 0;
  if (account.type === 'ASSET' || account.type === 'EXPENSE') {
    change = debit - credit;
  } else {
    change = credit - debit;
  }

  await tx.account.update({
    where: { id: accountId },
    data: { currentBalance: { increment: change } }
  });

  if (account.parentId) {
    await updateParentAccountBalances(tx, account.parentId);
  }
}

async function updateParentAccountBalances(tx: any, accountId: string) {
  const account = await tx.account.findUnique({ 
    where: { id: accountId },
    include: { 
      children: {
        select: { 
          id: true, 
          currentBalance: true, 
          type: true,
          children: {
            select: {
              id: true,
              currentBalance: true,
              type: true
            }
          }
        }
      }
    }
  });
  
  if (!account || !account.parentId) return;

  // ✅ حساب المجموع من الأبناء (مش increment!)
  let totalBalance = 0;
  for (const child of account.children) {
    totalBalance += child.currentBalance || 0;
    
    if (child.children && child.children.length > 0) {
      for (const grandchild of child.children) {
        totalBalance += grandchild.currentBalance || 0;
      }
    }
  }

  // ✅ استبدال الرصيد بالكامل (مش increment)
  await tx.account.update({
    where: { id: account.parentId },
    data: { currentBalance: totalBalance }  // ← مهم: مش increment
  });

  await updateParentAccountBalances(tx, account.parentId);
}

export async function getNextAccountCode(type: "CASH" | "BANK") {
  try {
    const prefix = type === "CASH" ? "1101" : "1102";
    const lastAccount = await prisma.account.findFirst({
      where: { code: { startsWith: prefix } },
      orderBy: { code: 'desc' }
    });
    if (!lastAccount) return `${prefix}01`;
    const lastSequence = parseInt(lastAccount.code.replace(prefix, ""));
    return `${prefix}${String(lastSequence + 1).padStart(2, '0')}`;
  } catch (error) {
    return type === "CASH" ? "110105" : "110205";
  }
}

export async function createLiquidAccount(data: { name: string, type: "CASH" | "BANK", manualJournalCode?: string }) {
  return await prisma.$transaction(async (tx) => {
    const autoCode = await getNextAccountCode(data.type);

    await tx.account.create({
      data: {
        code: autoCode,
        name: data.name,
        type: "ASSET"
      }
    });

    const journalPrefix = data.type === "CASH" ? "CSH" : "BNK";
    const randomId = Math.floor(100 + Math.random() * 900);
    const autoJournalCode = data.manualJournalCode || `${journalPrefix}${randomId}`;

    await tx.journal.create({
      data: {
        name: `دفتر ${data.name}`,
        code: autoJournalCode.toUpperCase(),
        type: data.type === "CASH" ? "CASH" : "BANK"
      }
    });

    return { success: true, accountCode: autoCode };
  });
}

// 🌟 الدالة المصححة لسداد الموردين أو تحصيل العملاء
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
        if (!isNaN(lastNum)) nextNum = lastNum + 1;
      }
    }
    const sequenceCode = `${prefix}${String(nextNum).padStart(4, '0')}`;

    const paymentAmount = Number(data.amount) || 0;

    // 1. إنشاء القيد اليومي
    const journalMove = await tx.journalMove.create({
      data: {
        name: sequenceCode,
        journalId: journal.id,
        state: "POSTED",
        date: today,
        ref: `${data.transType === "RECEIPT" ? "تحصيل" : "سداد"} - ${data.statement || "عملية نقدية"}`
      }
    });

    // 2. تحديد الحساب المقابل
    let counterpartAccountId: string | null = null;
    
    if (data.counterpartAccountId) {
      counterpartAccountId = data.counterpartAccountId;
    } else if (data.accountType === "VENDOR" || data.accountType === "LIABILITY") {
      // سداد مورد → الحساب المقابل هو الذمم الدائنة (210200)
      const apAccount = await tx.account.findUnique({ where: { code: "210200" } });
      if (apAccount) counterpartAccountId = apAccount.id;
    } else if (data.accountType === "CUSTOMER" || data.accountType === "ASSET") {
      // تحصيل من عميل → الحساب المقابل هو الذمم المدينة (110200)
      const arAccount = await tx.account.findUnique({ where: { code: "110200" } });
      if (arAccount) counterpartAccountId = arAccount.id;
    } else if (data.accountType === "EXPENSE") {
      // مصروف → الحساب المقابل هو حساب المصروف المحدد
      if (data.expenseAccountId) counterpartAccountId = data.expenseAccountId;
    }

    // 3. إنشاء سطور القيد
    if (data.transType === "PAYMENT") {
      // سداد (خروج نقدية)
      // مدين: الحساب المقابل (مورد/مصروف)
      if (counterpartAccountId) {
        await tx.journalLine.create({
          data: {
            name: `سداد - ${data.statement || "عملية"}`,
            accountId: counterpartAccountId,
            debit: paymentAmount,
            credit: 0,
            moveId: journalMove.id,
            partnerId: data.subEntityId || null
          }
        });
        await updateAccountBalance(tx, counterpartAccountId, paymentAmount, 0);
      }

      // دائن: الخزينة
      if (data.liquidAccountId) {
        await tx.journalLine.create({
          data: {
            name: `سداد من ${data.liquidAccountName || "الخزينة"}`,
            accountId: data.liquidAccountId,
            debit: 0,
            credit: paymentAmount,
            moveId: journalMove.id
          }
        });
        await updateAccountBalance(tx, data.liquidAccountId, 0, paymentAmount);
      }
    } else {
      // تحصيل (دخول نقدية)
      // مدين: الخزينة
      if (data.liquidAccountId) {
        await tx.journalLine.create({
          data: {
            name: `تحصيل في ${data.liquidAccountName || "الخزينة"}`,
            accountId: data.liquidAccountId,
            debit: paymentAmount,
            credit: 0,
            moveId: journalMove.id
          }
        });
        await updateAccountBalance(tx, data.liquidAccountId, paymentAmount, 0);
      }

      // دائن: الحساب المقابل (عميل/إيراد)
      if (counterpartAccountId) {
        await tx.journalLine.create({
          data: {
            name: `تحصيل - ${data.statement || "عملية"}`,
            accountId: counterpartAccountId,
            debit: 0,
            credit: paymentAmount,
            moveId: journalMove.id,
            partnerId: data.subEntityId || null
          }
        });
        await updateAccountBalance(tx, counterpartAccountId, 0, paymentAmount);
      }
    }

    return { success: true, reference: sequenceCode };
  });
}

export async function getLiquidAccounts() {
  try {
    return await prisma.account.findMany({
      where: {
        OR: [
          { code: { startsWith: "1101" } },
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