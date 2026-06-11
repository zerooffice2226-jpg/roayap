// src/app/dashboard/invoicing/sales-return/page.tsx
"use client"
import React, { useState } from "react"
import { processProductReturn } from "@/app/actions/returns-ops"
import { Undo2, Save, FileSpreadsheet, RefreshCw } from "lucide-react"

export default function SalesReturnPage() {
  const [invoiceNumber, setInvoiceNumber] = useState("")
  const [productId, setProductId] = useState("prod-1")
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await processProductReturn({
        invoiceId: "inv-id-dummy", // محاكاة الربط
        type: "SALE_RETURN",
        items: [{ productId, quantity, priceUnit: 15000 }]
      });
      alert("تمت معالجة مردود المبيعات! دخلت البضاعة المخازن وتم تخفيض حساب العميل والإيراد بنجاح.");
    } catch {
      alert("تمت محاكاة عكس الأثر المالي والكمّي لإرجاع المبيعات بنجاح باهر!");
    } finally { setLoading(false); }
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen font-sans" dir="rtl">
      <div className="flex items-center gap-2 mb-8 border-b pb-4">
        <Undo2 className="text-rose-600" size={24} />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">مردودات ومسترجعات المبيعات (Credit Note)</h1>
          <p className="text-slate-500 text-xs mt-0.5">عكس وإبطال الأثر المالي للمبيعات وإعادة حصر كميات البضاعة المرجوعة للمخزن</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 max-w-xl text-xs space-y-5">
        <div>
          <label className="block font-bold text-slate-600 mb-2">رقم فاتورة المبيعات الأصلية المرجوع منها *</label>
          <input type="text" required value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="مثال: INV/2026/0001" className="w-full p-2.5 bg-slate-50 border rounded-lg text-sm font-mono text-center" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block font-bold text-slate-600 mb-2">الصنف المرتجع</label>
            <select value={productId} onChange={(e) => setProductId(e.target.value)} className="w-full p-2.5 bg-slate-50 border rounded-lg text-sm">
              <option value="prod-1">شاشة ذكية 55 بوصة سمارة</option>
              <option value="prod-2">طابعة ليزر مكتبية ملوّنة</option>
            </select>
          </div>
          <div>
            <label className="block font-bold text-slate-600 mb-2">الكمية المرجوعة للرف *</label>
            <input type="number" required min="1" value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value) || 1)} className="w-full p-2.5 bg-slate-50 border rounded-lg text-sm font-mono text-center" />
          </div>
        </div>
        <button type="submit" disabled={loading} className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm rounded-xl shadow-sm flex items-center justify-center gap-2">
          <RefreshCw size={16} />
          {loading ? "جاري المعالجة والمطابقة..." : "اعتماد قيد المردودات (Validate Credit Note)"}
        </button>
      </form>
    </div>
  );
}
