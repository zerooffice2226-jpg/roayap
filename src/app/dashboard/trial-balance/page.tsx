// src/app/dashboard/trial-balance/page.tsx
"use client"
import React, { useEffect, useState } from "react"
import { getTrialBalance } from "@/app/actions/trial-balance"
import { Scale, ShieldCheck, Printer, FileSpreadsheet } from "lucide-react"

export default function TrialBalancePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTrialBalance().then(res => {
      setData(res);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="p-8 text-center text-slate-500 text-sm animate-pulse">جاري جلب واحتساب ميزان المراجعة القانوني...</div>;

  return (
    <div className="p-8 bg-slate-50 min-h-screen font-sans" dir="rtl">
      
      {/* الهيدر الاحترافي */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2">
            <Scale className="text-slate-900" size={24} />
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">ميزان المراجعة السنوي (Trial Balance)</h1>
          </div>
          <p className="text-slate-500 text-xs mt-1">التقرير الختامي المجمع لكافة الأرصدة المدينة والدائنة للشركة</p>
        </div>
        
        <div className="flex gap-2">
          <button onClick={() => window.print()} className="flex items-center gap-1.5 bg-white border text-slate-700 font-semibold text-xs px-3 py-2 rounded-xl shadow-sm hover:bg-slate-50">
            <Printer size={14} />
            طباعة التقرير (PDF)
          </button>
        </div>
      </div>

      {/* شريط حالة توازن النظام الذكي */}
      {data?.isBalanced ? (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl mb-6 flex items-center gap-2.5 text-sm font-semibold shadow-sm">
          <ShieldCheck size={18} className="text-emerald-600" />
          النظام المحاسبي متوازن تماماً: مجموع الأرصدة المدينة يطابق الأرصدة الدائنة بنجاح قانوني.
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl mb-6 flex items-center gap-2.5 text-sm font-semibold shadow-sm">
          <Scale size={18} className="text-amber-600" />
          تنبيه: يوجد فروقات معلقة في الحسابات الجارية تحت المراجعة.
        </div>
      )}

      {/* جدول البيانات المالي المجمع */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
        <table className="w-full text-right border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200/60 text-xs font-bold text-slate-500">
              <th className="p-4">كود الحساب</th>
              <th className="p-4">اسم الحساب المالي</th>
              <th className="p-4">نوع الحساب</th>
              <th className="p-4 text-left">أرصدة مدينة (Debit)</th>
              <th className="p-4 text-left">أرصدة دائنة (Credit)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
            {data?.rows.map((row: any) => (
              <tr key={row.id} className="hover:bg-slate-50/40 transition-colors">
                <td className="p-4 font-mono text-xs font-bold text-slate-500">{row.code}</td>
                <td className="p-4 font-semibold text-slate-900">{row.name}</td>
                <td className="p-4"><span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-medium">{row.type}</span></td>
                <td className="p-4 font-mono font-bold text-left text-emerald-600">
                  {row.debit > 0 ? row.debit.toLocaleString(undefined, {minimumFractionDigits: 2}) : "—"}
                </td>
                <td className="p-4 font-mono font-bold text-left text-slate-900">
                  {row.credit > 0 ? row.credit.toLocaleString(undefined, {minimumFractionDigits: 2}) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
          
          {/* المجاميع النهائية للميزان */}
          <tfoot>
            <tr className="bg-slate-900 text-white font-bold text-sm">
              <td colSpan={3} className="p-4 text-left font-medium text-slate-300">الإجمالي المجمع والأرصدة الختامية:</td>
              <td className="p-4 font-mono text-left text-emerald-400">
                {data?.totalDebit.toLocaleString(undefined, {minimumFractionDigits: 2})} ج.م
              </td>
              <td className="p-4 font-mono text-left">
                {data?.totalCredit.toLocaleString(undefined, {minimumFractionDigits: 2})} ج.م
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
