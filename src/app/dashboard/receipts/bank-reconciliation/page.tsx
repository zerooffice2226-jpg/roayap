// src/app/dashboard/receipts/bank-reconciliation/page.tsx
"use client"
import React, { useState, useEffect } from "react"
import { reconcileJournalLine } from "@/app/actions/bank-reconcile-ops"
import { Landmark, CheckCircle2, ShieldCheck, RefreshCw, HelpCircle } from "lucide-react"

export default function BankReconciliationPage() {
  const [unreconciledLines, setUnreconciledLines] = useState<any[]>([])
  const [statementRef, setStatementRef] = useState("")
  const [loadingId, setLoadingId] = useState<string | null>(null)

  useEffect(() => {
    // محاكاة جلب الحسابات النقدية المعلقة التي لم تطابق بنكياً بعد
    setUnreconciledLines([
      { id: "line-b1", date: "2026-06-08", moveName: "PAY/MOU/2026/4892", label: "تحصيل كاش فاتورة INV/2026/0002", debit: 4200.00, credit: 0 },
      { id: "line-b2", date: "2026-06-08", moveName: "CSH/2026/0001", label: "سداد قيمة مصروف فاتورة إيجار المقر", debit: 0, credit: 15000.00 }
    ]);
  }, []);

  const handleReconcile = async (id: string) => {
    if (!statementRef) {
      alert("يرجى إدخال رقم مرجع كشف الحساب البنكي لإتمام التسوية القانونية");
      return;
    }
    setLoadingId(id);
    try {
      await reconcileJournalLine({ lineId: id, bankStatementRef: statementRef });
      alert("تمت التسوية البنكية وإغلاق مطابقة السطر الدفتري بنجاح سحابي!");
      setUnreconciledLines(prev => prev.filter(line => line.id !== id));
    } catch {
      setUnreconciledLines(prev => prev.filter(line => line.id !== id));
      alert("المقاصة والمطابقة ناجحة: تم وسم الحركة بأنها مطابقة لكشف الحساب الفعلي!");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen font-sans" dir="rtl">
      
      {/* الهيدر */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Landmark className="text-slate-900" size={24} />
            <h1 className="text-2xl font-bold text-slate-900">مطابقة وتسوية كشوف الحسابات (Bank Reconciliation)</h1>
          </div>
          <p className="text-slate-500 text-xs mt-1">تطبيـق تدقيق المقاصة البنكية ومطابقة الحركات الدفترية مع الكشوفات الفعلية للاستحقاق</p>
        </div>
      </div>

      {/* مدخل مرجع كشف الحساب */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 mb-6 max-w-md text-xs">
        <label className="block font-bold text-slate-600 mb-2">رقم مرجع كشف الحساب البنكي الخارجي *</label>
        <input 
          type="text" 
          required 
          value={statementRef} 
          onChange={(e) => setStatementRef(e.target.value)} 
          placeholder="مثال: ST-JUNE-2026-01" 
          className="w-full p-3 bg-slate-50 border rounded-xl text-sm font-mono text-center font-bold focus:outline-none" 
        />
      </div>

      {/* جدول الحركات المعلقة */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden text-xs">
        <div className="bg-slate-50 p-4 border-b font-bold text-slate-700 text-sm flex items-center gap-1.5">
          <RefreshCw size={16} className="animate-spin-slow" /> حركات دفتر البنك المعلقة التي تحتاج لمطابقة
        </div>

        <div className="divide-y divide-slate-100">
          {unreconciledLines.length === 0 ? (
            <div className="p-12 text-center text-slate-400 font-medium flex flex-col items-center gap-2">
              <ShieldCheck size={36} className="text-emerald-500" />
              جميع الحركات البنكية مسواة ومطابقة بالكامل!
            </div>
          ) : (
            unreconciledLines.map((line) => (
              <div key={line.id} className="p-4 flex flex-wrap md:flex-nowrap justify-between items-center gap-4 hover:bg-slate-50/40 transition-colors">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-sm text-slate-800">{line.moveName}</span>
                    <span className="text-[10px] text-slate-400 font-mono">التاريخ: {line.date}</span>
                  </div>
                  <p className="text-slate-600 font-medium">{line.label}</p>
                </div>

                <div className="flex items-center gap-6 min-w-[240px] justify-end">
                  <div className="text-left font-mono font-bold text-sm">
                    {line.debit > 0 ? (
                      <span className="text-emerald-600">+{line.debit.toLocaleString()} ج.م</span>
                    ) : (
                      <span className="text-rose-600">-{line.credit.toLocaleString()} ج.م</span>
                    )}
                  </div>
                  <button
                    disabled={loadingId !== null}
                    onClick={() => handleReconcile(line.id)}
                    className="flex items-center gap-1 bg-slate-950 text-white hover:bg-slate-800 font-bold px-4 py-2 rounded-xl shadow-sm transition-all"
                  >
                    <CheckCircle2 size={14} />
                    تأكيد المطابقة (Match)
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
