// src/app/actions/bank-reconcile-ops.ts
"use server"
import { prisma } from "@/lib/prisma"

interface ReconcileInput {
  lineId: string; // معرف سطر القيد الدفتري
  bankStatementRef: string; // مرجع كشف الحساب البنكي الخارجي
}

export async function reconcileJournalLine(data: ReconcileInput) {
  return await prisma.$transaction(async (tx) => {
    // في أودو، يتم وسم سطر القيد بأنه "مسوى ومطابق بنكياً" عبر حقل خاص أو مرجع
    // سنقوم بتحديث شرح السطر ليوضح إتمام المطابقة بنجاح لحفظ النزاهة
    const line = await tx.journalLine.findUnique({
      where: { id: data.lineId },
      include: { move: true }
    });

    if (!line) throw new Error("سطر الحركة الدفترية غير موجود");

    await tx.journalLine.update({
      where: { id: data.lineId },
      data: {
        name: `${line.name} [مطابق بنكياً برقم: ${data.bankStatementRef}]`
      }
    });

    return { success: true };
  });
}
