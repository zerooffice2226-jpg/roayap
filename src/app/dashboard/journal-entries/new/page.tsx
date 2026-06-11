// src/app/dashboard/journal-entries/new/page.tsx
"use client"
import React, { useState, useEffect } from "react"
import { createManualJournalMove } from "@/app/actions/manual-move-ops"
import { getAccountTree } from "@/app/actions/accounts"
import { FileEdit, Plus, Trash2, Scale, AlertTriangle, CheckCircle2, Loader, Save } from "lucide-react"
import { useRouter } from 'next/navigation'

type Account = {
    id: string;
    name: string;
    code: string;
    type: string;
}

type Line = {
    accountId: string;
    name: string;
    debit: number;
    credit: number;
}

export default function NewJournalMovePage() {
  const [ref, setRef] = useState("")
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [lines, setLines] = useState<Line[]>([
    { accountId: "", name: "", debit: 0, credit: 0 },
    { accountId: "", name: "", debit: 0, credit: 0 }
  ])
  const router = useRouter();

  useEffect(() => {
    getAccountTree().then(setAccounts).catch(() => {
      setError("فشل في تحميل شجرة الحسابات. لا يمكن إنشاء قيد.")
    });
  }, []);

  const updateLine = (index: number, field: keyof Line, value: any) => {
    const newLines = [...lines];
    const line = newLines[index] as any;
    line[field] = value;

    if (field === "debit" && value > 0) line.credit = 0;
    if (field === "credit" && value > 0) line.debit = 0;

    setLines(newLines);
  }

  const addLineRow = () => setLines([...lines, { accountId: "", name: "", debit: 0, credit: 0 }])
  const removeLineRow = (index: number) => setLines(lines.filter((_, i) => i !== index))

  const totalDebit = lines.reduce((sum, l) => sum + (l.debit || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (l.credit || 0), 0);
  const difference = totalDebit - totalCredit;
  const isBalanced = Math.abs(difference) < 0.01 && totalDebit > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isBalanced) {
      setError("لا يمكن حفظ القيد! مجموع الحركات المدينة يجب أن يساوي الدائنة تماماً.");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await createManualJournalMove({ ref, lines: lines.filter(l => l.accountId && (l.debit > 0 || l.credit > 0)) });
      if (res.success) {
        setSuccess(`تم اعتماد وترحيل القيد اليدوي الموزون بنجاح تحت رقم: ${res.sequenceName}`);
        setRef("");
        setLines([{ accountId: "", name: "", debit: 0, credit: 0 }, { accountId: "", name: "", debit: 0, credit: 0 }]);
        setTimeout(() => router.push('/dashboard/journal-entries'), 2000);
      }
    } catch (err: any) {
      setError(err.message || "حدث خطأ غير متوقع أثناء ترحيل القيد.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen font-sans" dir="rtl">
      
      <div className="flex items-center gap-3 mb-8 border-b pb-4">
        <FileEdit className="text-slate-900" size={28} />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">إنشاء قيد يومية يدوي</h1>
          <p className="text-slate-500 text-xs mt-0.5">شاشة العمليات لتوثيق التسويات الجارية والأرصدة الافتتاحية</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80 max-w-6xl mx-auto">
        
        <div className="mb-6 max-w-2xl text-sm">
          <label className="block font-bold text-slate-700 mb-2">وصف المعاملة العام (البيان) *</label>
          <input type="text" required value={ref} onChange={(e) => setRef(e.target.value)} placeholder="مثال: قيد تسوية إهلاك الأصول الثابتة عن الفترة الحالية..." className="w-full p-3 bg-slate-100 border-slate-200 border rounded-xl focus:ring-2 focus:ring-slate-900 transition" />
        </div>

        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base font-bold text-slate-800">أسطر حركة القيد المزدوج</h3>
            {isBalanced ? (
              <span className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-100/70 border border-emerald-200 px-3 py-1.5 rounded-full shadow-sm">
                <CheckCircle2 size={14} /> القيد متوازن وجاهز للترحيل
              </span>
            ) : (
              <span className="flex items-center gap-2 text-xs font-bold text-rose-700 bg-rose-100/70 border border-rose-200 px-3 py-1.5 rounded-full shadow-sm">
                <AlertTriangle size={14} /> القيد غير متوازن (الفرق: {difference.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })})
              </span>
            )}
          </div>

          <div className="space-y-3">
            {lines.map((line, index) => (
              <div key={index} className="flex flex-wrap md:flex-nowrap gap-3 items-center bg-slate-50/60 p-3 rounded-xl border">
                <div className="w-full md:w-4/12">
                  <select required value={line.accountId} onChange={(e) => updateLine(index, "accountId", e.target.value)} className="w-full p-2.5 bg-white border rounded-lg text-sm font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400">
                    <option value="">اختر الحساب...</option>
                    {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.code} - {acc.name}</option>)}
                  </select>
                </div>
                <div className="flex-1 min-w-[200px]">
                  <input type="text" required value={line.name} onChange={(e) => updateLine(index, "name", e.target.value)} placeholder="البيان التفصيلي للسطر..." className="w-full p-2.5 bg-white border rounded-lg text-sm" />
                </div>
                <div className="w-32">
                  <input type="number" min="0" step="any" value={line.debit || ""} onChange={(e) => updateLine(index, "debit", parseFloat(e.target.value) || 0)} placeholder="مدين" className="w-full p-2.5 bg-white border rounded-lg text-sm font-mono text-center text-emerald-600 font-bold focus:outline-none focus:ring-1 focus:ring-emerald-400" />
                </div>
                <div className="w-32">
                  <input type="number" min="0" step="any" value={line.credit || ""} onChange={(e) => updateLine(index, "credit", parseFloat(e.target.value) || 0)} placeholder="دائن" className="w-full p-2.5 bg-white border rounded-lg text-sm font-mono text-center text-rose-600 font-bold focus:outline-none focus:ring-1 focus:ring-rose-400" />
                </div>
                {lines.length > 2 && (
                  <button type="button" onClick={() => removeLineRow(index)} className="p-2 text-rose-500 hover:bg-rose-100 rounded-lg transition-colors">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <button type="button" onClick={addLineRow} className="flex items-center gap-1.5 text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-lg mt-4 shadow-sm transition-all">
            <Plus size={14} />
            إضافة سطر
          </button>
        </div>

        {error && <div className="bg-rose-100 text-rose-700 text-sm font-bold p-3 rounded-xl my-4 text-center">{error}</div>}
        {success && <div className="bg-emerald-100 text-emerald-800 text-sm font-bold p-3 rounded-xl my-4 text-center">{success}</div>}

        <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-6 border-t mt-8 bg-slate-50/50 p-4 rounded-xl border-t-slate-200">
          <div className="flex gap-6 text-center text-sm font-bold text-slate-500">
            <div>
              <span className="text-xs uppercase">إجمالي المدين</span>
              <h3 className="text-lg font-mono font-black text-emerald-600 mt-1">{totalDebit.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</h3>
            </div>
            <div>
              <span className="text-xs uppercase">إجمالي الدائن</span>
              <h3 className="text-lg font-mono font-black text-rose-600 mt-1">{totalCredit.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</h3>
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading || !isBalanced}
            className={`flex items-center gap-2.5 font-bold text-base px-8 py-3.5 rounded-xl shadow-lg transition-all w-full md:w-auto justify-center disabled:opacity-50 disabled:cursor-not-allowed ${
              isBalanced ? 'bg-slate-900 text-white hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-400' : 'bg-slate-200 text-slate-500'
            }`}>
            {loading ? <Loader className="animate-spin" size={20}/> : <Save size={20} />}
            {loading ? "جاري الترحيل..." : "اعتماد وترحيل القيد"}
          </button>
        </div>
      </form>
    </div>
  );
}
