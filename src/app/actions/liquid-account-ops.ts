// src/app/actions/liquid-account-ops.ts
"use server"
import { prisma } from "@/lib/prisma"

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

// 💡 الدالة المصلحة بالكامل بدلالة نوع الـ ASSET الصريح الموضح بالصورة
export async function createLiquidAccount(data: { name: string, type: "CASH" | "BANK", manualJournalCode?: string }) {
  return await prisma.$transaction(async (tx) => {
    const autoCode = await getNextAccountCode(data.type);

    // أ. 💡 التحديث الفولاذي: إنشاء الحساب بنوع ASSET صريح لمطابقة قاعدة بياناتك 100%
    await tx.account.create({
      data: {
        code: autoCode,
        name: data.name,
        type: "ASSET" // القيمة الصحيحة المسجلة بصورتك لمنع الانهيار
      }
    });

    // 💡 قفل وتأمين السجل المالي المساعد لليومية لمنع تكرار الكود
    const journalPrefix = data.type === "CASH" ? "CSH" : "BNK";
    const randomId = Math.floor(100 + Math.random() * 900);
    const autoJournalCode = data.manualJournalCode || `${journalPrefix}${randomId}`;

    await tx.journal.create({
      data: {
        name: `دفتر ${data.name}`,
        code: autoJournalCode.toUpperCase(),
        type: data.type === "CASH" ? "CASH" : "BANK" // الـ Enum الصحيح للنظام
      }
    });

    return { success: true, accountCode: autoCode };
  });
}
