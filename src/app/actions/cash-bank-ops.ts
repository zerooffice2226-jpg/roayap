// src/app/actions/cash-bank-ops.ts
"use server"
import { prisma } from "@/lib/prisma"

interface NewCashBankInput {
  name: string;
  code: string; // مثل: CSH01 أو BNK01
  type: "CASH" | "BANK";
  accountCode: string; // كود الحساب في الشجرة مثل: 110103
}

export async function createCashBankJournal(data: NewCashBankInput) {
  try {
  return await prisma.$transaction(async (tx) => {
    // 1. التحقق من عدم تكرار كود الدفتر أو الحساب
    const existingJournal = await tx.journal.findUnique({ where: { code: data.code } });
    if (existingJournal) throw new Error("كود دفتر الخزينة/البنك مسجل مسبقاً");

    const existingAccount = await tx.account.findUnique({ where: { code: data.accountCode } });
    if (existingAccount) throw new Error("كود الحساب مسجل مسبقاً في شجرة الحسابات");


    // 2. إنشاء الحساب المالي المقابل في شجرة الحسابات (تحت حساب الأصول المتداولة)
    const assetsParent = await tx.account.findFirst({ where: { code: "110100" } }); // الاصول المتداولة -> النقدية وما يعادلها
    if (!assetsParent) throw new Error("لم يتم العثور على حساب الأصول الرئيسي")
    
    const newAccount = await tx.account.create({
      data: {
        code: data.accountCode,
        name: data.name,
        type: "ASSET",
        parentId: assetsParent?.id
      }
    });

    // 3. إنشاء دفتر اليومية المخصص للعمليات النقدية
    const journal = await tx.journal.create({
      data: {
        name: data.name,
        code: data.code,
        type: data.type,
        defaultAccountId: newAccount.id
      }
    });

    return { success: true, journalName: journal.name };
  });
} catch (e: any) {
    return { success: false, error: e.message };
}
}

// دالة جلب حركات دفتر الأستاذ التفصيلي للخزن والبنوك
export async function getCashBankLedgerReport(journalId: string) {
  
  const journal = await prisma.journal.findUnique({ where: { id: journalId }});
  if(!journal || !journal.defaultAccountId) throw new Error('دفتر اليومية غير موجود')
  
  // جلب كافة أسطر القيود المرتبطة بهذا الدفتر والمرحلة فقط
  const lines = await prisma.journalLine.findMany({
    where: {
        accountId: journal.defaultAccountId,
        move: {
            state: "POSTED"
        }
    },
    include: { move: true },
    orderBy: { move: { date: 'asc' } }
  });

  let runningBalance = 0;
  const rows = lines.map(line => {
      runningBalance += (line.debit - line.credit);
      return {
          id: line.id,
          date: line.move.date.toISOString().split('T')[0],
          moveName: line.move.name,
          label: line.name,
          debit: line.debit,
          credit: line.credit,
          balance: runningBalance
      }
  })

  return { rows, finalBalance: runningBalance };
}
