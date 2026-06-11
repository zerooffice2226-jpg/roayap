// src/app/dashboard/receipts/page.tsx
"use client"
import React, { useState, useEffect } from "react"
import { createCashReceipt } from "@/app/actions/receipt-ops"
import { getPartners } from "@/app/actions/partner-ops"
import { Landmark, ArrowUpLeft, ArrowDownRight, Save, DollarSign } from "lucide-react"

// We will fetch accounts from a dedicated action in a real app
const accounts = {
    cashAndBanks: [
        { id: "acct_c8e7f12a-4d2b-4e6f-8a40-2b9a5e4a8b23", name: "حساب الصندوق / خزينة الكاش الرئيسية" },
        { id: "acct_d9f8e23b-5e7f-4c8a-9d6a-5e4a8b23c1d4", name: "حساب بنك مصر الجاري" }
    ],
    expenses: [
        { id: "acct_a7b6c5d4-3e2f-1a9b-8c7d-4e5f6a7b8c9d", name: "حساب مصروف الإيجارات العام" },
        { id: "acct_b8c7d6e5-4f3a-2b1c-9d8e-5f6a7b8c9d1e", name: "حساب مصروفات الكهرباء والمياه والطاقة" },
        { id: "acct_c9d8e7f6-5a4b-3c2d-1e9f-6a7b8c9d1e2f", name: "حساب مكافآت وأجور الموظفين والعمال" }
    ],
    revenues: [
        { id: "acct_d1e2f3a4-6b5c-4d3e-2f1a-7b8c9d1e2f3a", name: "حساب إيرادات الخدمات الاستشارية" },
        { id: "acct_e2f3a4b5-7c6d-5e4f-3a2b-8c9d1e2f3a4b", name: "حساب أرباح وفروقات فروق التقييم" }
    ]
}

export default function CashReceiptsPage() {
  const [type, setType] = useState<"PAYMENT" | "RECEIPT">("PAYMENT")
  const [amount, setAmount] = useState<number | string>("")
  const [bankAccountId, setBankAccountId] = useState("")
  const [oppositeAccountId, setOppositeAccountId] = useState("")
  const [description, setDescription] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof amount !== 'number' || amount <= 0 || !bankAccountId || !oppositeAccountId) {
      setError("يرجى ملء كافة الحقول وإدخال مبلغ صحيح");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await createCashReceipt({ type, amount, bankAccountId, oppositeAccountId, description });
      if (res.success) {
        setSuccess(`تم اعتماد السند بنجاح وتوليد القيد المالي المقفل برقم: ${res.sequenceName}`);
        setAmount(""); setDescription(""); setOppositeAccountId("");
      }
    } catch(err: any) {
      setError(err.message || "فشل في إنشاء السند. يرجى مراجعة البيانات.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen font-sans" dir="rtl">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Landmark className="text-slate-900" size={24} />
            <h1 className="text-2xl font-bold text-slate-900">سندات المعاملات النقدية والمصاريف</h1>
          </div>
          <p className="text-slate-500 text-xs mt-1">شاشة الصرف والقبض الفوري للمصاريف الإدارية والتحصيلات المباشرة الخزنية</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80 max-w-2xl mx-auto">
        <div className="space-y-6">
          
          {error && <div className="bg-rose-50 text-rose-700 text-sm font-bold p-4 rounded-xl">{error}</div>}
          {success && <div className="bg-emerald-50 text-emerald-700 text-sm font-bold p-4 rounded-xl">{success}</div>}

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-2">نوع السند المالي</label>
            <div className="grid grid-cols-2 gap-4">
              <label className={`p-4 border-2 rounded-xl flex items-center justify-center gap-2 cursor-pointer font-bold text-sm transition-all ${type === 'PAYMENT' ? 'border-rose-500 bg-rose-50 text-rose-600 shadow-sm' : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'}`}>
                <input type="radio" name="receipt_type" value="PAYMENT" checked={type === 'PAYMENT'} onChange={() => setType('PAYMENT')} className="hidden" />
                <ArrowDownRight size={16} />
                سند صرف / مصروفات
              </label>
              <label className={`p-4 border-2 rounded-xl flex items-center justify-center gap-2 cursor-pointer font-bold text-sm transition-all ${type === 'RECEIPT' ? 'border-emerald-500 bg-emerald-50 text-emerald-600 shadow-sm' : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'}`}>
                <input type="radio" name="receipt_type" value="RECEIPT" checked={type === 'RECEIPT'} onChange={() => setType('RECEIPT')} className="hidden" />
                <ArrowUpLeft size={16} />
                سند قبض / إيرادات
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-2">المبلغ المالي الصافي *</label>
                <div className="relative">
                  <input type="number" required min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value === '' ? '' : parseFloat(e.target.value))} placeholder="0.00" className="w-full p-3.5 bg-slate-50 border rounded-xl text-lg font-black font-mono text-left focus:ring-2 focus:ring-slate-900 pr-12" />
                  <div className="absolute right-4 top-3.5 text-slate-400 font-bold text-sm">ج.م</div>
                </div>
              </div>
                <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">حساب الكاش / الخزينة *</label>
                    <select required value={bankAccountId} onChange={(e) => setBankAccountId(e.target.value)} className="w-full p-3.5 bg-slate-50 border rounded-xl text-sm font-semibold text-slate-700 h-full">
                      <option value="">اختر حساب الكاش...</option>
                      {accounts.cashAndBanks.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                    </select>
                </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">الحساب المقابل للتوجيه *</label>
            <select required value={oppositeAccountId} onChange={(e) => setOppositeAccountId(e.target.value)} className="w-full p-3.5 bg-slate-50 border rounded-xl text-sm font-semibold text-slate-700">
              <option value="">اختر حساب التوجيه المقابل...</option>
              {(type === "PAYMENT" ? accounts.expenses : accounts.revenues).map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">شرح القيد والسند (البيان) *</label>
            <textarea required rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="مثال: سداد قيمة فاتورة الكهرباء لمقر الشركة الرئيسي عن شهر يونيو..." className="w-full p-3 bg-slate-50 border rounded-xl text-sm focus:ring-2 focus:ring-slate-900" />
          </div>

          <button type="submit" disabled={loading} className={`w-full py-3.5 rounded-xl font-bold text-sm text-white shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 ${type === 'PAYMENT' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
            <Save size={16} />
            {loading ? "جاري الاعتماد والترحيل..." : "اعتماد وترحيل السند النقدي"}
          </button>
        </div>
      </form>
    </div>
  );
}
