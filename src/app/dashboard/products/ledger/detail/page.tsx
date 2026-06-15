// src/app/dashboard/products/ledger/detail/page.tsx
"use client"
import React, { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { getProductLedgerDetail } from "@/app/actions/product-ledger-ops" // الاستدعاء الحقيقي
import { FileText, Printer, Box, Barcode, User, ArrowRight, ArrowUpRight } from "lucide-react"

function ProductLedgerDetailContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const productId = searchParams.get("productId")

  const [ledgerData, setLedgerData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!productId) return;
    setLoading(true);
    
    // جلب البيانات الحقيقية الصادرة من محرك السيرفر الموزون
    getProductLedgerDetail(productId)
      .then(setLedgerData)
      .catch((err) => alert(err.message))
      .finally(() => setLoading(false));
  }, [productId]);

  const getInvoiceLink = (reference: string) => {
    if (reference.startsWith("BILL")) {
      return `/dashboard/invoicing/purchase?viewBill=${reference}`;
    }
    return `/dashboard/invoicing/new?viewInvoice=${reference}`;
  };

  if (loading) return <div className="p-8 text-center text-xs animate-pulse text-slate-400">جاري جلب دفتر كشف حركة الصنف الحية من قاعدة البيانات...</div>;
  if (!ledgerData) return <div className="p-8 text-center text-xs text-slate-500">لم يتم العثور على حركات مخزنية مسجلة لهذا الصنف بالدفاتر.</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4 print:hidden">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => router.push("/dashboard/products/ledger")} className="p-2 hover:bg-slate-100 rounded-xl transition-colors ml-1 border shadow-sm bg-white"><ArrowRight size={16} /></button>
          <div>
            <h1 className="text-xl font-black text-slate-900">تقرير حركة الصنف وعمر المخزون تفصيلياً</h1>
            <p className="text-slate-500 text-[11px] mt-0.5">بطاقة تدقيق الصنف المباشرة والقراءة الحية الموزونة للأرصدة من Supabase</p>
          </div>
        </div>
        <button type="button" onClick={() => window.print()} className="flex items-center gap-1.5 bg-white border text-slate-700 font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm border-slate-300"><Printer size={14} /> طباعة بطاقة الصنف</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold">
        <div className="bg-white border p-5 rounded-2xl shadow-sm flex items-center justify-between border-l-4 border-l-blue-600">
          <div className="space-y-1">
            <span className="text-slate-400 block font-semibold text-[11px]">الرصيد الفعلي الحالي بالمستودعات</span>
            <h2 className="text-xl font-black text-blue-600 font-mono">{ledgerData.currentRunningStock} وحدة</h2>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Box size={18} /></div>
        </div>
        <div className="bg-white border p-5 rounded-2xl shadow-sm flex items-center justify-between border-l-4 border-l-slate-800">
          <div className="space-y-1">
            <span className="text-slate-400 block font-semibold text-[11px]">باركود الصنف المرجعي</span>
            <h2 className="text-lg font-black text-slate-800 font-mono tracking-wider bg-slate-100 px-3 py-1 border rounded-lg w-fit mt-1">{ledgerData.sku}</h2>
          </div>
          <div className="p-3 bg-slate-100 text-slate-600 rounded-xl"><Barcode size={18} /></div>
        </div>
      </div>

      <div className="bg-white border p-4 rounded-xl shadow-sm text-center border-b-4 border-b-purple-600">
        <span className="text-slate-400 font-bold text-[10px] block mb-1">اسم المنتج الخاضع للمعالجة الجارية حالياً</span>
        <h3 className="text-base font-black text-purple-700">{ledgerData.productName}</h3>
      </div>

      <div className="bg-white border rounded-2xl shadow-sm overflow-hidden text-xs">
        <table className="w-full text-right border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b text-slate-500 font-bold">
              <th className="p-4">التاريخ</th>
              <th className="p-4">الوثيقة المرجعية</th>
              <th className="p-4">اسم المورد / العميل الشريك</th>
              <th className="p-4">نوع الحركة</th>
              <th className="p-4 text-left">الكمية</th>
              <th className="p-4 text-left">تكلفة الوحدة</th>
              <th className="p-4 text-center">رصيد المخزن المتراكم</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700 font-medium font-mono">
            {ledgerData.stockMoves.map((move: any) => (
              <tr key={move.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="p-4 font-sans text-slate-400">{move.date}</td>
                <td className="p-4 font-black text-slate-900 tracking-wide">
                  <Link href={getInvoiceLink(move.reference)} className="flex items-center gap-1 text-slate-900 hover:text-blue-600 transition-colors group-hover:underline cursor-pointer">
                    <FileText size={12} className="text-slate-400" />
                    <span>{move.reference}</span> <ArrowUpRight size={10} className="text-slate-300 opacity-0 group-hover:opacity-100" />
                  </Link>
                </td>
                {/* 💡 عرض اسم الشريك الفعلي المجلوب حياً من علاقات سوبابيز لمنع التزييف البصري */}
                <td className="p-4 font-sans font-bold text-slate-800 text-xs">
                  <span className="flex items-center gap-1.5"><User size={12} className="text-slate-400" />{move.partnerName}</span>
                </td>
                <td className="p-4 font-sans">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black inline-flex items-center gap-1 ${
                    move.type === "INCOMING" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                  }`}>
                    {move.type === "INCOMING" ? "↗ وارد للمخزن" : "↘ منصرف من المخزن"}
                  </span>
                </td>
                {/* الكميات الصحيحة الموزونة إدارياً ولونياً */}
                <td className={`p-4 text-left font-bold text-sm ${move.type === "INCOMING" ? "text-emerald-600" : "text-rose-600"}`}>
                  {move.type === "INCOMING" ? `+${move.quantity}` : `-${move.quantity}`}
                </td>
                <td className="p-4 text-left font-sans text-slate-400">{move.unitCost.toLocaleString()} ج.م</td>
                {/* الرصيد التراكمي الموزون تصاعدياً بشكل سليم مئة بالمئة كأنظمة المحاسبة الفاخرة */}
                <td className="p-4 text-center font-black text-blue-600 text-sm">{move.runningStock} وحدة</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function InventoryProductLedgerDetailPage() {
  return (
    <div className="p-8 bg-slate-50 min-h-screen font-sans" dir="rtl">
      <Suspense fallback={<div className="p-8 text-center text-xs animate-pulse text-slate-400">جاري تحميل بطاقة تدقيق حركات الصنف...</div>}>
        <ProductLedgerDetailContent />
      </Suspense>
    </div>
  );
}
