// src/app/dashboard/settings/cash-bank/page.tsx
"use client"
import React, { useState } from "react"
import { createCashBankJournal } from "@/app/actions/cash-bank-ops"
import { Landmark, Plus, Save, Wallet, Loader, ShieldAlert } from "lucide-react"

export default function NewCashBankPage() {
  const [name, setName] = useState("")
  const [code, setCode] = useState("")
  const [type, setType] = useState<"CASH" | "BANK">("CASH")
  const [accountCode, setAccountCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<{type: 'success' | 'error', message: string} | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);
    try {
      const result = await createCashBankJournal({ name, code, type, accountCode });
      if(result.success){
        setFeedback({type: 'success', message: `تم بنجاح إنشاء حساب ودفتـر (${name}) وربطه بالدورة المحاسبية!`});
        setName(""); setCode(""); setAccountCode("");
      } else {
        setFeedback({type: 'error', message: result.error || "حدث خطأ غير متوقع"});
      }
    } catch (err: any) {
      setFeedback({type: 'error', message: "فشل في الاتصال بالخادم. يرجى المحاولة مرة أخرى"});
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen font-sans" dir="rtl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 border-b pb-4">
        <div>
            <div className="flex items-center gap-3">
                <Landmark className="text-slate-900" size={28} />
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">إضافة الخزن وحسابات البنوك</h1>
            </div>
            <p className="text-slate-500 text-sm mt-1">تأسيس نقطة تدفق نقدي جديدة وربطها التلقائي بميزان المراجعة والأستاذ العام</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80 max-w-2xl mx-auto text-sm">
        
        {feedback && (
            <div className={`p-3 rounded-lg mb-5 text-center text-sm font-bold flex items-center justify-center gap-2 ${feedback.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                <ShieldAlert size={16}/>
                {feedback.message}
            </div>
        )}
        
        <div className="space-y-5">
          <div>
            <label className="block font-bold text-slate-700 mb-2">اسم الحساب (الصندوق / البنك) *</label>
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: خزينة المبيعات الفرعية - كاشير 1" className="w-full p-3 bg-slate-100 border-slate-200 border rounded-xl text-base font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-2">نوع الحساب</label>
              <select value={type} onChange={(e) => setType(e.target.value as any)} className="w-full p-3 bg-slate-100 border-slate-200 border rounded-xl text-base font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900">
                <option value="CASH">خزينة كاش / صندوق (Cash)</option>
                <option value="BANK">حساب بنكي جاري (Bank)</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-2">كود الحساب (في الشجرة) *</label>
              <input type="text" required value={accountCode} onChange={(e) => setAccountCode(e.target.value)} placeholder="مثال: 110103" className="w-full p-3 bg-slate-100 border-slate-200 border rounded-xl text-base font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 font-mono text-center" />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-2">كود دفتر اليومية *</label>
            <input type="text" required value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="مثال: CSH02 أو QNB01" className="w-full p-3 bg-slate-100 border-slate-200 border rounded-xl text-base font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 font-mono text-center" />
          </div>

          <button type="submit" disabled={loading} className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl shadow-md flex items-center justify-center gap-2 mt-4 transition-all disabled:opacity-60">
            {loading ? <Loader className="animate-spin" size={18}/> : <Save size={18} />}
            {loading ? "جاري الحفظ والربط..." : "اعتماد وتدشين الحساب النقدي"}
          </button>
        </div>
      </form>
    </div>
  );
}
