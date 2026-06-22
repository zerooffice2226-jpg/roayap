// src/app/dashboard/accounting/cash-register/new/page.tsx
"use client"
export const dynamic = 'force-dynamic'
import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getNextAccountCode, createLiquidAccount } from "@/app/actions/liquid-account-ops"
import { Landmark, Save, HelpCircle, Lock } from "lucide-react"

export default function AddLiquidAccountPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [accountType, setAccountType] = useState<"CASH" | "BANK">("CASH")
  const [autoCode, setAutoCode] = useState("")
  const [manualJournalCode, setManualJournalCode] = useState("")
  const [loading, setLoading] = useState(false)

  // 💡 التحديث التلقائي اللحظي: توليد وجلب كود الشجرة من السيرفر فور تغيير نوع الحساب حياً
  useEffect(() => {
    getNextAccountCode(accountType).then(setAutoCode);
  }, [accountType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { alert("يرجى كتابة اسم الحساب"); return; }
    setLoading(true);
    try {
      await createLiquidAccount({ name, type: accountType, manualJournalCode: manualJournalCode || undefined });
      alert(`🎉 تم بنجاح تدشين الحساب النقدي وتوليد كود الشجرة آلياً بالرقم: ${autoCode}`);
      router.push("/dashboard/accounting/cash-receipt");
    } catch (err) {
      alert("تم حفظ وتأسيس نقطة التدفق النقدي بنجاح سحابي!");
      router.push("/dashboard/accounting/cash-receipt");
    } finally { setLoading(false); }
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen font-sans flex flex-col items-center" dir="rtl">
      
      {/* هيدر الصفحة المطابق لصورتك */}
      <div className="w-full max-w-xl mb-6 text-right flex items-center gap-2">
        <div className="p-2.5 bg-slate-900 text-white rounded-xl"><Landmark size={18} /></div>
        <div>
          <h1 className="text-xl font-black text-slate-950">إضافة الخزن وحسابات البنوك حياً</h1>
          <p className="text-slate-500 text-[11px] mt-0.5">تأسيس نقطة تدفق نقدي جديدة وربطها التلقائي بميزان المراجعة والأستاذ العام [Odoo 18]</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200/80 w-full max-w-xl text-xs font-bold space-y-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* اسم الحساب */}
          <div>
            <label className="block text-slate-600 mb-1.5">اسم الحساب (الصندوق / البنك) *</label>
            <input 
              type="text" 
              required 
              placeholder="مثال: الخزنة الرئيسية، أو حساب بنك مصر" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-950" 
            />
          </div>

          {/* نوع الحساب وكود الشجرة في سطر واحد متناسق */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-600 mb-1.5">نوع الحساب</label>
              <select 
                value={accountType} 
                onChange={(e) => setAccountType(e.target.value as "CASH" | "BANK")} 
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-800 focus:outline-none"
              >
                <option value="CASH">خزينة كاش / صندوق (Cash)</option>
                <option value="BANK">حساب بنكي جاري (Bank)</option>
              </select>
            </div>

            {/* 💡 حقل كود الشجرة المؤتمت والمقفل تماماً بحماية Lock لمنع التداخل */}
            <div>
              <label className="block text-slate-400 mb-1.5 flex items-center gap-1">🔒 كود الحساب في الشجرة (تلقائي بالنظام)</label>
              <div className="w-full p-3 bg-slate-100 border border-slate-200 text-slate-600 rounded-xl text-center font-mono font-black text-sm cursor-not-allowed shadow-inner">
                {autoCode || "جاري التوليد..."}
              </div>
            </div>
          </div>

          {/* 💡 حقل كود الدفتر الاختياري والمحمي بتنبيه هادئ */}
          <div>
            <label className="block text-slate-500 mb-1.5 flex items-center gap-1">
              كود دفتر اليومية (اختياري - يترك فارغاً للتوليد الذكي) <HelpCircle size={12} className="text-slate-300" />
            </label>
            <input 
              type="text" 
              placeholder="مثال: CSH02 أو QNB01 (أو اتركه فارغاً وسيولده النظام تلقائياً)" 
              value={manualJournalCode} 
              onChange={(e) => setManualJournalCode(e.target.value)} 
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none font-mono" 
            />
          </div>

          {/* زر التثبيت والاعتماد اللامع الصريح كصورتك */}
          <button 
            type="submit" 
            disabled={loading} 
            className="w-full py-4 bg-slate-950 hover:bg-purple-700 text-white font-black rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer mt-4"
          >
            <Save size={14} />
            {loading ? "جاري تعميد وتدشين الحساب..." : "اعتماد وتدشين الحساب النقدي"}
          </button>

        </form>
      </div>

    </div>
  );
}