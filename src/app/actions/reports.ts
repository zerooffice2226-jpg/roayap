'use server'
import { prisma } from "@/lib/prisma"

export async function getFinancialSummary() {
  // جلب كافة الأسطر المرحّلة فقط (طريقة أودو)
  const lines = await prisma.journalLine.findMany({
    where: { move: { state: "POSTED" } },
    include: { account: true }
  });

  let totalIncome = 0;
  let totalExpense = 0;

  // حساب الإجماليات بناءً على نوع الحساب
  lines.forEach(line => {
    if (line.account.type === "INCOME") {
      totalIncome += (line.credit - line.debit); // الإيراد دائن بطبيعته
    } else if (line.account.type === "EXPENSE") {
      totalExpense += (line.debit - line.credit); // المصروف مدين بطبيعته
    }
  });

  const netProfit = totalIncome - totalExpense;

  // إحصائيات افتراضية مجمعة للأشهر (يمكنك تطويرها لجلبها ديناميكياً حسب التاريخ)
  const monthlyData = [
    { name: "يناير", الإيرادات: totalIncome * 0.4, المصروفات: totalExpense * 0.3 },
    { name: "فبراير", الإيرادات: totalIncome * 0.6, المصروفات: totalExpense * 0.4 },
    { name: "مارس", الإيرادات: totalIncome, المصروفات: totalExpense },
  ];

  return {
    cards: [
      { title: "إجمالي الإيرادات", value: `${totalIncome.toLocaleString()} ج.م`, description: "+12% عن الشهر الماضي", type: "income" },
      { title: "إجمالي المصروفات", value: `${totalExpense.toLocaleString()} ج.م`, description: "-4% عن الشهر الماضي", type: "expense" },
      { title: "صافي الأرباح", value: `${netProfit.toLocaleString()} ج.م`, description: "+18% نمو مستمر", type: "profit" },
    ],
    chartData: monthlyData
  };
}
