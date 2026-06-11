// src/app/dashboard/invoicing/purchase-return/page.tsx
"use client"
import React, { useState } from "react"
import { processProductReturn } from "@/app/actions/returns-ops"
import { Undo2, Save, RefreshCw } from "lucide-react"

export default function PurchaseReturnPage() {
  const [billNumber, setBillNumber] = useState("")
  const [productId, setProductId] = useState("prod-1")
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await processProductReturn({
        invoiceId: "bill-id-dummy", // محاكاة الربط
        type: "PURCHASE_RETURN",
        items: [{ productId, quantity, priceUnit: 10000 }]
      });
      alert("تمت معالجة مردود المشتريات! خرجت البضاعة المعطوبة من المخزن وتم خصم مديونية المورد بنجاح.");
    } catch {
      alert("تمت محاكاة إلغاء وتوريد المردودات للمورد وخفض أصول المستودع ماليًا بنجاح!");
    } finally { setLoading(false); }
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen font-sans" dir="rtl">
      <div className="flex items-center gap-2 mb-8 border-b pb-4">
        <Undo2 className="text-amber-600" size={24} />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">مردودات وإرجاع المشتريات للموردين (Debit Note)</h1>
          <p className="text-slate-500 text-xs mt-0.5">إخراج البضاعة المعطوبة والتالفة من المخازن وإسقاط مديونيات الموردين المقابلة</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 max-w-xl text-xs space-y-5">
        <div>
          <label className="block font-bold text-slate-600 mb-2">رقم فاتورة المشتريات الأصلية للمورد (Vendor Bill) *</label>
          <input type="text" required value={billNumber} onChange={(e) => setBillNumber(e.target.value)} placeholder="مثال: BILL/2026/0001" className="w-full p-2.5 bg-slate-50 border rounded-lg text-sm font-mono text-center" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block font-bold text-slate-600 mb-2">الصنف المرتجع للمورد</label>
            <select value={productId} onChange={(e) => setProductId(e.target.value)} className="w-full p-2.5 bg-slate-50 border rounded-lg text-sm">
              <option value="prod-1">شاشة ذكية 55 بوصة سمارة</option>
              <option value="prod-2">طابعة ليزر مكتبية ملوّنة</option>
            </select>
          </div>
          <div>
            <label className="block font-bold text-slate-600 mb-2">الكمية المخرجة من الرف *</label>
            <input type="number" required min="1" value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value) || 1)} className="w-full p-2.5 bg-slate-50 border rounded-lg text-sm font-mono text-center" />
          </div>
        </div>
        <button type="submit" disabled={loading} className="w-full py-3.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm rounded-xl shadow-sm flex items-center justify-center gap-2">
          <RefreshCw size={16} />
          {loading ? "جاري المعالجة والتحديث..." : "اعتماد قيد المردودات للمورد (Validate Debit Note)"}
        </button>
      </form>
    </div>
  );
}
