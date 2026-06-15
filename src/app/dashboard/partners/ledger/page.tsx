// src/app/dashboard/partners/ledger/page.tsx
"use client"
import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getCustomersSummaryReport } from "@/app/actions/customer-ledger-ops"
import { Users, Search, ChevronLeft, Barcode } from "lucide-react"

export default function CustomersSummaryLedgerPage() {
  const router = useRouter()
  const [reportData, setReportData] = useState<any[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true);
    // 💡 الاتصال الحقيقي القاطع: جلب الأرصدة وتصفير الداتا الوهمية تماماً
    getCustomersSummaryReport()
      .then(res => {
        setReportData(res.reportData || []);
      })
      .catch((err) => {
        console.error("فشل الاتصال بجداول العملاء السحابية:", err);
        setReportData([]); // تفريغ الجدول تماماً في حالة المسح ليعكس الحقيقة
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredData = reportData.filter(c => 
    c.name?.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search)
  );

  return (
    <div className="p-8 bg-slate-50 min-h-screen font-sans" dir="rtl">
      <div className="flex justify-between items-center mb-8 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="text-purple-600" size={24} />
            دفتر أستاذ أرصدة ومطابقات العملاء المجمع حياً
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">النظام متصل حياً بـ Supabase: قراءة الأرصدة والمديونيات الفعلية المحدثة للشركاء [Odoo 18]</p>
        </div>
      </div>

      <div className="bg-white border rounded-xl p-3 flex items-center gap-2 max-w-md text-xs mb-6 shadow-sm">
        <Search size={14} className="text-slate-400" />
        <input type="text" placeholder="ابحث بكتابة اسم العميل أو الهاتف لفرز الأرصدة..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-transparent focus:outline-none font-semibold text-slate-700" />
      </div>

      <div className="bg-white border rounded-2xl shadow-sm overflow-hidden text-xs">
        <table className="w-full text-right border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b text-slate-500 font-bold">
              <th className="p-4">اسم العميل / الشريك التجاري</th>
              <th className="p-4">رقم الهاتف</th>
              <th className="p-4 text-left text-slate-900 bg-rose-50/20">إجمالي مبيعاته (مدين +)</th>
              <th className="p-4 text-left text-emerald-800 bg-emerald-50/20">إجمالي مدفوعاته (دائن -)</th>
              <th className="p-4 text-center">الرصيد الصافي الجاري</th>
              <th className="p-4 text-center">طبيعة الرصيد</th>
              <th className="p-4 text-center">الإجراء</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700 font-semibold font-mono">
            {loading ? (
              <tr><td colSpan={7} className="p-12 text-center text-slate-400 font-sans animate-pulse">جاري سحب مطابقات أرصدة العملاء الحية من قاعدة البيانات...</td></tr>
            ) : filteredData.length > 0 ? (
              filteredData.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-4 text-sm font-black text-slate-800 font-sans">{item.name}</td>
                  <td className="p-4 text-slate-500 font-sans">{item.phone}</td>
                  <td className="p-4 text-left text-rose-600 bg-rose-50/10">{item.debit.toLocaleString()} ج.م</td>
                  <td className="p-4 text-left text-emerald-600 bg-emerald-50/10">{item.credit.toLocaleString()} ج.م</td>
                  <td className="p-4 text-center text-slate-900 font-black text-sm">{item.balance.toLocaleString()} ج.م</td>
                  <td className="p-4 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                      item.balanceType === 'مدين' ? 'bg-rose-50 text-rose-700' : item.balanceType === 'دائن' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                    }`}>{item.balanceType}</span>
                  </td>
                  <td className="p-4 text-center">
                    <button 
                      type="button"
                      onClick={() => router.push(`/dashboard/partners/ledger/detail?partnerId=${item.id}`)}
                      className="text-[10px] font-black bg-slate-950 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-purple-600 mx-auto transition-colors font-sans cursor-pointer shadow-sm"
                    >
                      كشف الحساب التفصيلي <ChevronLeft size={10} />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="p-12 text-center text-slate-400 font-sans font-bold">
                  ⚠️ قاعدة البيانات فارغة تماماً؛ لا توجد أرصدة أو حسابات عملاء مسجلة حالياً بالمنظومة السحابية.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}