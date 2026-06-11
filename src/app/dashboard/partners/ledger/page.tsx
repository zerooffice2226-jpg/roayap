// src/app/dashboard/partners/ledger/page.tsx
"use client"
import React, { useState, useEffect } from "react"
import { getPartnerDetailedLedger } from "@/app/actions/partner-ledger-ops"
import { getPartners } from "@/app/actions/partner-ops"
import { FileSpreadsheet, Printer, UserCheck, ArrowLeftRight, CreditCard, Loader } from "lucide-react"

type Partner = {
    id: string;
    name: string;
    type: 'CUSTOMER' | 'VENDOR';
}

type LedgerData = {
    partnerName: string;
    partnerType: 'CUSTOMER' | 'VENDOR';
    totalDebit: number;
    totalCredit: number;
    finalBalance: number;
    rows: { 
        id: string; 
        date: string; 
        moveName: string; 
        label: string; 
        debit: number; 
        credit: number; 
        cumulativeBalance: number 
    }[];
}

export default function PartnerLedgerPage() {
  const [partners, setPartners] = useState<Partner[]>([])
  const [selectedPartnerId, setSelectedPartnerId] = useState("")
  const [ledgerData, setLedgerData] = useState<LedgerData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPartners()
      .then(setPartners)
      .catch(() => {
        setError("فشل في تحميل قائمة الشركاء. قد تكون هناك مشكلة في الاتصال.");
      });
  }, []);

  useEffect(() => {
    if (!selectedPartnerId) {
      setLedgerData(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    setLedgerData(null);
    getPartnerDetailedLedger(selectedPartnerId)
      .then(res => setLedgerData(res as LedgerData))
      .catch(err => setError(err.message || "حدث خطأ غير متوقع أثناء جلب كشف الحساب."))
      .finally(() => setLoading(false));
  }, [selectedPartnerId]);
  
  const isCustomerAndOwing = ledgerData?.partnerType === 'CUSTOMER' && ledgerData?.finalBalance > 0;
  const isVendorAndOwed = ledgerData?.partnerType === 'VENDOR' && ledgerData?.finalBalance > 0;

  return (
    <div className="p-8 bg-slate-50 min-h-screen font-sans" dir="rtl">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="text-slate-900" size={24} />
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">كشف حساب الشركاء (Partner Ledger)</h1>
          </div>
          <p className="text-slate-500 text-xs mt-1">تتبع كشوفات الحركات المالية التاريخية والرصيد المتحرك لكل عميل أو مورد</p>
        </div>
        {ledgerData && (
          <button onClick={() => window.print()} className="flex items-center gap-1.5 bg-white border text-slate-700 font-semibold text-xs px-4 py-2 rounded-xl shadow-sm hover:bg-slate-50 transition-colors">
            <Printer size={14} />
            طباعة كشف الحساب (PDF)
          </button>
        )}
      </div>

      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/60 mb-6 max-w-xl mx-auto">
        <label className="block text-sm font-bold text-slate-700 mb-2 text-center">اختر العميل أو المورد لعرض كشف حسابه</label>
        <select 
          value={selectedPartnerId} 
          onChange={(e) => setSelectedPartnerId(e.target.value)} 
          className="w-full p-3 bg-slate-100 border-slate-200 border rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
        >
          <option value="">--- اختر من القائمة ---</option>
          {partners.map(p => (
            <option key={p.id} value={p.id}>{p.name} ({p.type === 'CUSTOMER' ? 'عميل' : 'مورد'})</option>
          ))}
        </select>
      </div>

      {loading && (
          <div className="text-center p-12 text-slate-500 text-sm">
              <div className="flex flex-col items-center gap-2">
                  <Loader className="animate-spin" size={28} />
                  <span>جاري احتساب السجل التاريخي للحركات...</span>
              </div>
          </div>
      )}
      {error && <div className="bg-rose-100 text-rose-700 text-sm font-bold p-4 rounded-xl text-center max-w-xl mx-auto">{error}</div>}

      {ledgerData && !loading && (
        <div className="space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 border rounded-xl shadow-sm flex items-center justify-between">
                <div>
                    <span className="text-xs font-bold text-slate-500 block mb-0.5">إجمالي حركات مدين (+)</span>
                    <span className="font-mono text-lg font-black text-slate-900">{ledgerData.totalDebit.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</span>
                </div>
                <div className="p-3 bg-slate-100 text-slate-600 rounded-lg"><ArrowLeftRight size={18} /></div>
            </div>
            <div className="bg-white p-4 border rounded-xl shadow-sm flex items-center justify-between">
                <div>
                    <span className="text-xs font-bold text-slate-500 block mb-0.5">إجمالي حركات دائن (-)</span>
                    <span className="font-mono text-lg font-black text-slate-900">{ledgerData.totalCredit.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</span>
                </div>
                <div className="p-3 bg-slate-100 text-slate-600 rounded-lg"><CreditCard size={18} /></div>
            </div>
            <div className={`p-4 border-2 rounded-xl shadow-lg flex items-center justify-between ${isCustomerAndOwing ? 'bg-blue-600/10 border-blue-300' : isVendorAndOwed ? 'bg-amber-600/10 border-amber-300' : 'bg-emerald-600/10 border-emerald-300'}`}>
                <div>
                    <span className={`text-xs font-bold block mb-0.5 ${isCustomerAndOwing ? 'text-blue-800' : isVendorAndOwed ? 'text-amber-800' : 'text-emerald-800'}`}>
                        {isCustomerAndOwing ? 'رصيد مستحق على العميل' : isVendorAndOwed ? 'رصيد مستحق للمورد' : 'الرصيد الختامي'}
                    </span>
                    <span className={`font-mono text-lg font-black ${isCustomerAndOwing ? 'text-blue-700' : isVendorAndOwed ? 'text-amber-700' : 'text-emerald-700'}`}>
                        {ledgerData.finalBalance.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}
                    </span>
                </div>
                <div className="p-3 bg-white rounded-lg border text-slate-700"><UserCheck size={18} /></div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200/80 text-xs font-bold text-slate-600 uppercase tracking-wider">
                  <th className="p-4">التاريخ</th>
                  <th className="p-4">رقم الحركة</th>
                  <th className="p-4">البيان</th>
                  <th className="p-4 text-left">مدين</th>
                  <th className="p-4 text-left">دائن</th>
                  <th className="p-4 text-left bg-slate-200/70 border-r">الرصيد المتحرك</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {ledgerData.rows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-4 font-mono text-slate-500 whitespace-nowrap">{row.date}</td>
                    <td className="p-4 font-mono font-bold text-slate-800">{row.moveName}</td>
                    <td className="p-4 font-medium text-slate-600 max-w-xs truncate">{row.label}</td>
                    <td className="p-4 font-mono font-bold text-left text-emerald-600 whitespace-nowrap">
                      {row.debit > 0 ? row.debit.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' }) : "—"}
                    </td>
                    <td className="p-4 font-mono font-bold text-left text-rose-500 whitespace-nowrap">
                      {row.credit > 0 ? row.credit.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' }) : "—"}
                    </td>
                    <td className={`p-4 font-mono font-black text-left border-r bg-slate-100/50 whitespace-nowrap ${row.cumulativeBalance >= 0 ? 'text-blue-700' : 'text-amber-700'}`}>
                      {row.cumulativeBalance.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
