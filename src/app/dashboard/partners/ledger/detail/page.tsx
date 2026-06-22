// src/app/dashboard/partners/ledger/detail/page.tsx
"use client"
export const dynamic = 'force-dynamic'
import React, { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { getCustomerStatementDetail } from "@/app/actions/customer-ledger-ops"
import { ArrowRight, FileText, Printer, User, ArrowUpRight, CreditCard } from "lucide-react"

function CustomerLedgerDetailContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const partnerId = searchParams.get("partnerId")

  const [ledgerData, setLedgerData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!partnerId) return;
    setLoading(true);
    // 💡 الاتصال الفعلي القاطع بجدول الحركات التاريخية للعميل المختار
    getCustomerStatementDetail(partnerId)
      .then(setLedgerData)
      .catch((err) => {
        console.error(err);
        setLedgerData(null);
      })
      .finally(() => setLoading(false));
  }, [partnerId]);

  const getDocLink = (move: any) => {
    if (move.type === "PAYMENT") return `/dashboard/accounting/cash-receipt?viewReceipt=${move.reference}`;
    return `/dashboard/invoicing/new?viewInvoice=${move.reference}`;
  };

  if (loading) return <div className="p-8 text-center text-xs animate-pulse text-slate-400">جاري سحب كشف الحساب التاريخي للعميل سحابياً...</div>;
  if (!ledgerData || !ledgerData.ledgerMoves || ledgerData.ledgerMoves.length === 0) {
    return (
      <div className="p-8 text-center text-xs text-slate-500 font-sans font-bold space-y-3">
        <p>⚠️ لا توجد حركات تاريخية (فواتير أو مقبوضات) مسجلة لهذا العميل حالياً في قاعدة بيانات Supabase.</p>
        <button type="button" onClick={() => router.push("/dashboard/partners/ledger")} className="text-purple-600 underline cursor-pointer text-xs">العودة لدفتر الأرصدة المجمع</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4 print:hidden">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => router.push("/dashboard/partners/ledger")} className="p-2 hover:bg-slate-100 rounded-xl transition-colors border shadow-sm bg-white cursor-pointer"><ArrowRight size={16} /></button>
          <div>
            <h1 className="text-xl font-black text-slate-900">دفتر تدقيق كشف حساب العميل التفصيلي حياً</h1>
            <p className="text-slate-500 text-[11px] mt-0.5">القراءة الحية مئة بالمئة لمستندات العميل التاريخية الموثقة بـ Supabase</p>
          </div>
        </div>
        <button type="button" onClick={() => window.print()} className="flex items-center gap-1.5 bg-white border text-slate-700 font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm border-slate-300 cursor-pointer"><Printer size={14} /> طباعة كشف الحساب</button>
      </div>

      <div className="bg-white border p-5 rounded-2xl shadow-sm border-b-4 border-b-purple-600 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex items-center gap-2">
          <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl"><User size={16} /></div>
          <div><span className="text-[10px] text-slate-400 block font-bold">الاسم التجاري للعميل الشريك</span><h3 className="text-sm font-black text-slate-900">{ledgerData.customerName}</h3></div>
        </div>
        <div className="flex items-center gap-2 md:mr-auto">
          <div><span className="text-[10px] text-slate-400 block font-bold text-left md:text-right">هاتف الاتصال</span><h3 className="text-sm font-mono font-black text-slate-700">{ledgerData.phone}</h3></div>
        </div>
      </div>

      <div className="bg-white border rounded-2xl shadow-sm overflow-hidden text-xs">
        <table className="w-full text-right border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b text-slate-500 font-bold">
              <th className="p-4">تاريخ المعاملة</th>
              <th className="p-4">الوثيقة المرجعية</th>
              <th className="p-4">بيان الحركة المستندية</th>
              <th className="p-4 text-left text-rose-800">حركة Mبيعات (مدين +)</th>
              <th className="p-4 text-left text-emerald-800">حركة المقبوضات (دائن -)</th>
              <th className="p-4 text-center bg-purple-50/40 text-purple-900 font-black">رصيد مديونية العميل المتراكم</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700 font-medium font-mono">
            {ledgerData.ledgerMoves.map((move: any) => (
              <tr key={move.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="p-4 font-sans text-slate-400">{move.date}</td>
                <td className="p-4 font-black text-slate-900">
                  <Link href={getDocLink(move)} className="flex items-center gap-1 hover:text-blue-600 cursor-pointer group-hover:underline">
                    {move.type === 'PAYMENT' ? <CreditCard size={12} className="text-slate-400" /> : <FileText size={12} className="text-slate-400" />}
                    <span>{move.reference}</span>
                  </Link>
                </td>
                <td className="p-4 font-sans text-slate-600 text-xs font-bold">{move.label}</td>
                <td className="p-4 text-left text-rose-600 font-bold">{move.debit > 0 ? `+${move.debit.toLocaleString()} ج.م` : "—"}</td>
                <td className="p-4 text-left text-emerald-600 font-bold">{move.credit > 0 ? `-${move.credit.toLocaleString()} ج.م` : "—"}</td>
                <td className="p-4 text-center font-black text-blue-600 bg-purple-50/10 text-sm">{move.runningBalance.toLocaleString()} ج.م</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function CustomerStatementDetailPage() {
  return (
    <div className="p-8 bg-slate-50 min-h-screen font-sans" dir="rtl">
      <Suspense fallback={<div className="p-8 text-center text-xs animate-pulse text-slate-400">جاري بناء كشف الأستاذ التفصيلي للعميل الشريك...</div>}>
        <CustomerLedgerDetailContent />
      </Suspense>
    </div>
  );
}