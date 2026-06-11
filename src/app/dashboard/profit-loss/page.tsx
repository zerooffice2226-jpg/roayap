// src/app/dashboard/profit-loss/page.tsx
"use client"
import React, { useEffect, useState } from "react"
import { getProfitAndLossReport } from "@/app/actions/pl-ops"
import { TrendingUp, TrendingDown, FileText, Printer, ArrowUpRight, ArrowDownRight, Loader } from "lucide-react"

type ReportData = {
  incomeAccounts: { code: string; name: string; balance: number }[];
  expenseAccounts: { code: string; name: string; balance: number }[];
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  isProfit: boolean;
}

export default function ProfitAndLossPage() {
  const [report, setReport] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getProfitAndLossReport().then(res => {
      setReport(res as ReportData);
      setLoading(false);
    });
  }, [])

  if (loading) {
      return (
          <div className="p-8 flex justify-center items-center min-h-[80vh] text-slate-500 text-sm">
              <div className="flex flex-col items-center gap-2">
                <Loader className="animate-spin" size={32} />
                <span className="font-bold">جاري احتساب وإعداد تقرير الأرباح والخسائر...</span>
              </div>
          </div>
      );
  }

  if (!report) return <div className="p-8 text-center text-rose-500 font-bold">فشل تحميل التقرير.</div>;

  return (
    <div className="p-8 bg-slate-50 min-h-screen font-sans" dir="rtl">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="text-slate-900" size={24} />
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">قائمة الدخل - الأرباح والخسائر (P&L)</h1>
          </div>
          <p className="text-slate-500 text-xs mt-1">التقرير الإداري الختامي لتحليل صافي الأداء المالي للشركة عن الفترة الحالية</p>
        </div>
        <button onClick={() => window.print()} className="flex items-center gap-1.5 bg-white border text-slate-700 font-semibold text-xs px-4 py-2 rounded-xl shadow-sm hover:bg-slate-50 transition-colors">
          <Printer size={14} />
          طباعة قائمة الدخل (PDF)
        </button>
      </div>

      <div className={`p-6 rounded-2xl border mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-lg ${
        report.isProfit ? 'bg-emerald-600/10 border-emerald-300' : 'bg-rose-600/10 border-rose-300'
      }`}>
        <div>
          <span className={`text-xs font-bold uppercase tracking-wider block mb-1 ${report.isProfit ? 'text-emerald-800' : 'text-rose-800'}`}>صافي النتيجة التشغيلية لجميع الأقسام</span>
          <h2 className={`text-4xl font-black font-mono ${report.isProfit ? 'text-emerald-700' : 'text-rose-700'}`}>
            {report.netProfit.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}
          </h2>
        </div>
        <div className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold border-2 ${
          report.isProfit ? 'bg-emerald-600 text-white border-emerald-700/50' : 'bg-rose-600 text-white border-rose-700/50'
        }`}>
          {report.isProfit ? (
            <>
              <TrendingUp size={18} />
              صافي أرباح (Net Profit)
            </>
          ) : (
            <>
              <TrendingDown size={18} />
              صافي خسائر (Net Loss)
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
          <div className="bg-emerald-50/70 px-5 py-4 border-b border-emerald-200/80 flex justify-between items-center text-emerald-800 font-bold">
            <span className="text-sm flex items-center gap-2"><ArrowUpRight size={18}/> بنود الإيرادات التشغيلية</span>
            <span className="font-mono text-lg">{report.totalIncome.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</span>
          </div>
          <div className="divide-y divide-slate-100 p-3 text-xs text-slate-700">
            {report.incomeAccounts.map((acc, i) => (
              <div key={i} className="flex justify-between items-center py-3 px-2 hover:bg-slate-50 rounded-md">
                <span className="font-medium"><span className="font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded ml-2">{acc.code}</span>{acc.name}</span>
                <span className="font-mono font-bold text-slate-900 text-sm">{acc.balance.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
          <div className="bg-rose-50/70 px-5 py-4 border-b border-rose-200/80 flex justify-between items-center text-rose-800 font-bold">
            <span className="text-sm flex items-center gap-2"><ArrowDownRight size={18}/> بنود المصروفات والتكاليف</span>
            <span className="font-mono text-lg">{report.totalExpense.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</span>
          </div>
          <div className="divide-y divide-slate-100 p-3 text-xs text-slate-700">
            {report.expenseAccounts.map((acc, i) => (
              <div key={i} className="flex justify-between items-center py-3 px-2 hover:bg-slate-50 rounded-md">
                <span className="font-medium"><span className="font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded ml-2">{acc.code}</span>{acc.name}</span>
                <span className="font-mono font-bold text-slate-900 text-sm">{acc.balance.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
