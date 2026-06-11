// src/app/actions/manual-move-ops.ts
"use server"
import { prisma } from "@/lib/prisma"

interface ManualLineInput {
  accountId: string;
  name: string;
  debit: number;
  credit: number;
}

interface ManualMoveInput {
  ref: string;
  lines: ManualLineInput[];
}

export async function createManualJournalMove(data: ManualMoveInput) {
  return await prisma.$transaction(async (tx) => {
    const currentYear = new Date().getFullYear();

    if (data.lines.length < 2) throw new Error("يجب أن يحتوي القيد على سطرين على الأقل");

    // 1. التحقق الصارم من التوازن: مجموع المدين يجب أن يساوي مجموع الدائن
    const totalDebit = data.lines.reduce((sum, l) => sum + l.debit, 0);
    const totalCredit = data.lines.reduce((sum, l) => sum + l.credit, 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) { // Allow for small floating point differences
      throw new Error(`القيد غير متوازن محاسبياً! مجموع المدين (${totalDebit}) لا يساوي مجموع الدائن (${totalCredit})`);
    }
    if (totalDebit === 0) {
        throw new Error("لا يمكن إنشاء قيد بصفر.");
    }

    // 2. جلب دفتر العمليات العامة الافتراضي (MISC / GEN)
    const journal = await tx.journal.findFirst({ where: { type: "GENERAL" } });
    if (!journal) throw new Error("دفتر العمليات العامة (GENERAL) غير معرف بالنظام");

    // 3. توليد رقم تسلسلي فريد للقيد اليدوي (مثال: MISC/2026/0001)
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

    // 4. إنشاء رأس القيد في الداتا بيز
    const journalMove = await tx.journalMove.create({
      data: {
        name: sequenceName,
        journalId: journal.id,
        state: "POSTED", // القيود اليدوية المعتمدة ترحل فوراً
        ref: data.ref
      }
    });

    // 5. إنشاء أسطر القيد وتحديث أرصدة الحسابات لحظياً في شجرة الحسابات
    for (const line of data.lines) {
      if(line.debit === 0 && line.credit === 0) continue; // Skip empty lines
      
      const netBalance = line.debit - line.credit;

      await tx.journalLine.create({
        data: {
          name: line.name,
          debit: line.debit,
          credit: line.credit,
          balance: netBalance,
          moveId: journalMove.id,
          accountId: line.accountId
        }
      });

      // تحديث رصيد الحساب الجاري فوراً لتغذية ميزان المراجعة والتقارير
      await tx.account.update({
        where: { id: line.accountId },
        data: { currentBalance: { increment: netBalance } }
      });
    }

    return { success: true, sequenceName };
  });
}
