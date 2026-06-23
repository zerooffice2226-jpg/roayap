// src/app/actions/vendor-payment-ops.ts
"use server"
import { prisma } from "@/lib/prisma"

// 🌟 دالة مساعدة لتحديث رصيد حساب
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

// 🌟 دالة لتحديث الحسابات الأبوية (بتجميع الأرصدة)
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

// 1. جلب الفواتير مع حساب المبلغ المدفوع من القيود
export async function getUnpaidVendorBills() {
  try {
    const bills = await prisma.invoice.findMany({
      where: {
        type: "IN_INVOICE",
        state: "POSTED",
        totalAmount: { gt: 0 }
      },
      include: {
        partner: true,
        journalMove: {
          include: {
            lines: {
              include: { account: true }
            }
          }
        }
      },
      orderBy: { date: 'desc' }
    });

    // جلب كل قيود الصرف للموردين
    const allPaymentMoves = await prisma.journalMove.findMany({
      where: { 
        OR: [
          { name: { startsWith: "PAY/" } },
          { ref: { contains: "سداد مورد" } }
        ]
      },
      include: {
        lines: true
      }
    });

    return bills.map(b => {
      // حساب المبلغ المدفوع من القيود المحاسبية
      let paidAmount = 0;
      
      // ابحث عن كل القيود التي تخص هذه الفاتورة
      for (const move of allPaymentMoves) {
        if (move.ref?.includes(b.number)) {
          // اجمع المبالغ المدينة (التي تخصم من ذمم المورد)
          for (const line of move.lines) {
            if (line.debit > 0) {
              paidAmount += line.debit;
            }
          }
        }
      }

      const amountDue = b.totalAmount - paidAmount;
      const isPartialPaid = paidAmount > 0 && amountDue > 0;
      const isFullyPaid = amountDue <= 0;

      return {
        id: b.id,
        number: b.number,
        partnerName: b.partner?.name || "مورد نقدي معتمد",
        partnerId: b.partnerId,
        date: b.date ? b.date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        totalAmount: b.totalAmount,
        paidAmount: paidAmount,
        amountDue: Math.max(0, amountDue),
        isPartialPaid: isPartialPaid,
        isFullyPaid: isFullyPaid
      };
    }).filter(b => b.amountDue > 0); // فقط الفواتير اللي فيها متبقي
  } catch (error) {
    console.error("Error fetching unpaid bills:", error);
    throw new Error("فشل في جلب مستندات مديونيات الموردين");
  }
}

// 2. 🌟 معالجة السداد بقيد محاسبي كامل
export async function processVendorPayment(data: { 
  billId: string, 
  paymentAmount: number, 
  accountCode: string 
}) {
  return await prisma.$transaction(async (tx) => {
    // جلب الفاتورة كاملة
    const bill = await tx.invoice.findUnique({ 
      where: { id: data.billId },
      include: { 
        partner: true,
        journalMove: {
          include: {
            lines: true
          }
        }
      }
    });
    
    if (!bill) throw new Error("الفاتورة غير موجودة بالدفاتر");

    // حساب المبلغ المدفوع سابقاً
    const allPaymentMoves = await prisma.journalMove.findMany({
      where: { 
        OR: [
          { name: { startsWith: "PAY/" } },
          { ref: { contains: "سداد مورد" } }
        ]
      },
      include: { lines: true }
    });

    let paidAmount = 0;
    for (const move of allPaymentMoves) {
      if (move.ref?.includes(bill.number)) {
        for (const line of move.lines) {
          if (line.debit > 0) paidAmount += line.debit;
        }
      }
    }

    const currentDue = bill.totalAmount - paidAmount;
    if (data.paymentAmount > currentDue + 0.01) {
      throw new Error(`المبلغ المدخل (${data.paymentAmount}) أكبر من المستحق (${currentDue})`);
    }

    // جلب الحسابات
    const cashAccount = await tx.account.findUnique({ 
      where: { code: data.accountCode } 
    });
    if (!cashAccount) throw new Error(`حساب الخزينة ${data.accountCode} غير موجود`);

    const apAccount = await tx.account.findUnique({ 
      where: { code: "210200" } 
    });
    if (!apAccount) throw new Error("حساب الذمم الدائنة (210200) غير موجود");

    // جلب دفتر اليومية
    let journal = await tx.journal.findFirst({ where: { type: "BANK" } });
    if (!journal) {
      journal = await tx.journal.create({ 
        data: { name: "دفتر صرف النقدية", code: "PAY", type: "BANK" } 
      });
    }

    // توليد الرقم التسلسلي
    const prefix = `PAY/${new Date().getFullYear()}/`;
    const lastMove = await tx.journalMove.findFirst({
      where: { journalId: journal.id, name: { startsWith: prefix } },
      orderBy: { name: 'desc' }
    });
    
    let nextNum = 1;
    if (lastMove) {
      const parts = lastMove.name.split('/');
      const lastNum = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastNum)) nextNum = lastNum + 1;
    }
    const sequenceCode = `${prefix}${String(nextNum).padStart(4, '0')}`;

    // 🌟 إنشاء القيد المحاسبي الكامل
    const journalMove = await tx.journalMove.create({
      data: {
        name: sequenceCode,
        journalId: journal.id,
        state: "POSTED",
        date: new Date(),
        ref: `سداد مورد - فاتورة ${bill.number}`
      }
    });

    // ✅ سطر مدين: الذمم الدائنة (تقليل الالتزام)
    await tx.journalLine.create({
      data: {
        name: `سداد فاتورة ${bill.number} - ${bill.partner?.name || "مورد"}`,
        accountId: apAccount.id,
        debit: data.paymentAmount,
        credit: 0,
        moveId: journalMove.id,
        partnerId: bill.partnerId
      }
    });

    // ✅ سطر دائن: الخزينة/البنك (تقليل الأصول)
    await tx.journalLine.create({
      data: {
        name: `صرف من ${cashAccount.name} - فاتورة ${bill.number}`,
        accountId: cashAccount.id,
        debit: 0,
        credit: data.paymentAmount,
        moveId: journalMove.id
      }
    });

    // ✅ تحديث الأرصدة
    await updateAccountBalance(tx, apAccount.id, data.paymentAmount, 0);
    await updateAccountBalance(tx, cashAccount.id, 0, data.paymentAmount);

    // حساب المتبقي الجديد
    const newDue = currentDue - data.paymentAmount;

    return { 
      success: true, 
      remaining: Math.max(0, newDue),
      reference: sequenceCode
    };
  });
}

// 3. سجل الدفعات التاريخية
export async function getBillPaymentHistory(billNumber: string) {
  try {
    const moves = await prisma.journalMove.findMany({
      where: {
        OR: [
          { name: { startsWith: "PAY/" }, ref: { contains: billNumber } },
          { ref: { contains: `فاتورة ${billNumber}` } }
        ]
      },
      include: {
        lines: {
          include: {
            account: true
          }
        }
      },
      orderBy: { date: 'desc' }
    });

    return moves.map(m => {
      // ابحث عن سطر الخزينة/البنك
      const cashLine = m.lines.find(l => l.credit > 0);
      const amount = cashLine?.credit || 0;
      const accountName = cashLine?.account?.name || "حساب غير معروف";

      return {
        id: m.id,
        code: m.name,
        date: m.date.toISOString().split('T')[0],
        amount: amount,
        account: accountName
      };
    });
  } catch (error) {
    console.error("Error fetching payment history:", error);
    return [];
  }
}