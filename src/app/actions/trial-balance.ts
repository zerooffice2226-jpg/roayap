// src/app/actions/trial-balance.ts
"use server"
import { prisma } from "@/lib/prisma"

export async function getTrialBalance() {
  // جلب كافة الحسابات التي تحتوي على حركات ماليّة مرحّلة
  const accounts = await prisma.account.findMany({
    orderBy: { code: 'asc' }
  });

  let totalDebitBalance = 0;
  let totalCreditBalance = 0;

  const rows = accounts.map(account => {
    let debit = 0;
    let credit = 0;

    // تحديد مكان رصيد الحساب بناءً على طبيعته المحاسبية المستوحاة من أودو
    // Accounts with positive balances
    if (account.currentBalance > 0) {
        if (["ASSET", "EXPENSE"].includes(account.type)) {
            debit = account.currentBalance;
            totalDebitBalance += debit;
        } else { // LIABILITY, EQUITY, INCOME
            credit = account.currentBalance;
            totalCreditBalance += credit;
        }
    // Accounts with negative balances (handle reversed nature)
    } else if (account.currentBalance < 0) {
        const absValue = Math.abs(account.currentBalance);
        if (["ASSET", "EXPENSE"].includes(account.type)) {
            credit = absValue;
            totalCreditBalance += credit;
        } else { // LIABILITY, EQUITY, INCOME
            debit = absValue;
            totalDebitBalance += debit;
        }
    }

    return {
      id: account.id,
      code: account.code,
      name: account.name,
      type: account.type,
      debit: debit,
      credit: credit
    };
  });

  return {
    rows,
    totalDebit: totalDebitBalance,
    totalCredit: totalCreditBalance,
    isBalanced: Math.abs(totalDebitBalance - totalCreditBalance) < 0.01
  };
}
