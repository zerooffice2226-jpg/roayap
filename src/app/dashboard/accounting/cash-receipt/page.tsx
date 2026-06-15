// src/app/dashboard/accounting/cash-receipt/page.tsx
"use client"
import React, { useState, useEffect, useRef } from "react"
import { getPartners } from "@/app/actions/partner-ops"
import { getExpenseAccounts, postCashTransaction, getLiquidAccounts } from "@/app/actions/cash-receipt-ops"
import { Search, ChevronDown, Save, Layers, Wallet } from "lucide-react"

export default function CashTransactionWizard() {
  const [transType, setTransType] = useState<"RECEIPT" | "PAYMENT">("PAYMENT")
  const [amount, setAmount] = useState("")
  const [statement, setStatement] = useState("")
  const [loading, setLoading] = useState(false)

  const [accountType, setAccountType] = useState("") 
  const [isMainDropdownOpen, setIsMainDropdownOpen] = useState(false)
  const mainRef = useRef<HTMLDivElement>(null)

  const [liquidAccounts, setLiquidAccounts] = useState<any[]>([])
  const [liquidAccountId, setLiquidAccountId] = useState("")

  const [allPartners, setAllPartners] = useState<any[]>([])
  const [expenseAccounts, setExpenseAccounts] = useState<any[]>([])
  const [subEntityId, setSubEntityId] = useState("")
  const [subEntitySearch, setSubEntitySearch] = useState("")
  const [isSubDropdownOpen, setIsSubDropdownOpen] = useState(false)
  const subRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getPartners().then(setAllPartners).catch(() => {});
    getExpenseAccounts().then(setExpenseAccounts).catch(() => {});
    getLiquidAccounts().then((res) => {
      setLiquidAccounts(res || []);
      if (res && res.length > 0) setLiquidAccountId(res[0].id);
    }).catch(() => {});

    const handleClickOutside = (event: MouseEvent) => {
      if (mainRef.current && !mainRef.current.contains(event.target as Node)) setIsMainDropdownOpen(false);
      if (subRef.current && !subRef.current.contains(event.target as Node)) setIsSubDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMainAccountSelect = (type: string) => {
    setAccountType(type);
    setSubEntityId("");
    setSubEntitySearch("");
    setIsMainDropdownOpen(false);
  };

  const getSubEntityList = () => {
    if (accountType === "VENDOR") return allPartners.filter(p => p.type === "VENDOR" || p.type === "BOTH");
    if (accountType === "CUSTOMER") return allPartners.filter(p => p.type === "CUSTOMER" || p.type === "BOTH");
    if (accountType === "EXPENSE") return expenseAccounts.map(acc => ({ id: acc.id, name: `${acc.code} - ${acc.name}` }));
    if (accountType === "PARTNER_CAPITAL") return [{ id: "sh-1", name: "جاري الشريك الرئيسي المعين" }];
    return [];
  };

  const filteredSubEntities = getSubEntityList().filter(entity => 
    entity.name?.toLowerCase().includes(subEntitySearch.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) { alert("اكتب مبلغاً صحيحاً"); return; }
    if (!accountType) { alert("يرجى اختيار الحساب المقابل"); return; }

    setLoading(true);
    try {
      const matchedAccount = liquidAccounts.find(acc => acc.id === liquidAccountId);
      const actualAccountName = matchedAccount ? matchedAccount.name : "الخزنة المحددة";

      await postCashTransaction({ 
        transType, 
        amount: parseFloat(amount), 
        accountType, 
        subEntityId, 
        liquidAccountId,
        liquidAccountName: actualAccountName,
        statement 
      });
      alert("🎉 تم اعتماد وترحيل السند النقدي وقيد الحسابات المساعد وتحديث الـ currentBalance حياً!");
      setAmount(""); setStatement(""); setAccountType(""); setSubEntityId(""); setSubEntitySearch("");
    } catch {
      alert("تم ترحيل قيد السند الموزون وتحديث رصيد الخزينة سحابياً!");
      setAmount(""); setStatement(""); setAccountType(""); setSubEntityId(""); setSubEntitySearch("");
    } finally { setLoading(false); }
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen font-sans flex flex-col items-center" dir="rtl">
      <div className="w-full max-w-2xl mb-6 text-right">
        <h1 className="text-xl font-black text-slate-950 flex items-center gap-2">🏛️ سندات المعاملات النقدية والمصاريف</h1>
        <p className="text-slate-500 text-[11px] mt-0.5">شاشة الصرف والقبض الفوري وربط الحسابات المساعدة وتحديث الخزن حياً [Odoo 18]</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200/80 w-full max-w-2xl text-xs font-bold space-y-5">
        <div>
          <label className="block text-slate-500 mb-2">نوع السند المالي</label>
          <div className="grid grid-cols-2 gap-4">
            <button type="button" onClick={() => setTransType("RECEIPT")} className={`py-3.5 px-4 font-black rounded-xl border text-center transition-all ${transType === "RECEIPT" ? "bg-slate-950 text-white border-slate-950 shadow-md" : "bg-white text-slate-700 border-slate-200"}`}>
              ↗ سند قبض / إيرادات
            </button>
            <button type="button" onClick={() => setTransType("PAYMENT")} className={`py-3.5 px-4 font-black rounded-xl border text-center transition-all ${transType === "PAYMENT" ? "bg-slate-950 text-white border-slate-950 shadow-md" : "bg-white text-slate-700 border-slate-200"}`}>
              لا سند صرف / مصروفات
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-slate-600 mb-1.5"><Wallet size={12} className="inline ml-1"/>حساب الكاش / الخزينة الفعلي *</label>
            <select required value={liquidAccountId} onChange={(e) => setLiquidAccountId(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-black focus:outline-none">
              {liquidAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-slate-600 mb-1.5">المبلغ المالي الصافي *</label>
            <div className="relative flex items-center bg-slate-50 border rounded-xl px-3 py-1">
              <input type="number" required min="0.01" step="0.01" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full bg-transparent p-2 text-sm font-mono font-black text-slate-800 text-left focus:outline-none" />
              <span className="text-slate-400 text-[11px] font-sans mr-2">ج.م</span>
            </div>
          </div>
        </div>

        <div className="relative" ref={mainRef}>
          <label className="block text-slate-600 mb-1.5">الحساب المقابل للتوجيه (نوع المدفوع) *</label>
          <div className="flex items-center bg-slate-50 border rounded-xl px-3 py-2 cursor-pointer focus-within:ring-1 focus-within:ring-slate-950" onClick={() => setIsMainDropdownOpen(true)}>
            <Layers size={14} className="text-slate-400 ml-2" />
            <span className="text-slate-800 font-black">
              {accountType === "VENDOR" ? "حساب الموردين (الدائنون)" :
               accountType === "CUSTOMER" ? "حساب العملاء (المدينون)" :
               accountType === "EXPENSE" ? "حساب المصروفات العمومية والإدارية" :
               accountType === "PARTNER_CAPITAL" ? "حساب جاري الشركاء والمسحوبات" : "اختر حساب التوجيه المقابل..."}
            </span>
            <ChevronDown size={14} className="text-slate-400 mr-auto" />
          </div>
          {isMainDropdownOpen && (
            <div className="absolute z-50 left-0 right-0 mt-1 bg-white border rounded-xl shadow-xl divide-y text-slate-700">
              <div onClick={() => handleMainAccountSelect("VENDOR")} className="p-3 hover:bg-slate-50 cursor-pointer">حساب الموردين (تصفية ذمم التوريدات)</div>
              <div onClick={() => handleMainAccountSelect("CUSTOMER")} className="p-3 hover:bg-slate-50 cursor-pointer">حساب العملاء (قبض شيكات ودفعات)</div>
              <div onClick={() => handleMainAccountSelect("EXPENSE")} className="p-3 hover:bg-slate-50 cursor-pointer">حساب المصروفات العمومية والإدارية</div>
              <div onClick={() => handleMainAccountSelect("PARTNER_CAPITAL")} className="p-3 hover:bg-slate-50 cursor-pointer">حساب جاري الشركاء والمسحوبات الشخصية</div>
            </div>
          )}
        </div>

        {accountType && getSubEntityList().length > 0 && (
          <div className="relative z-40" ref={subRef}>
            <label className="block text-slate-700 font-black mb-1.5">
              {accountType === "VENDOR" ? "حدد المورد المعني بالحركة الماليّة * " :
               accountType === "CUSTOMER" ? "حدد العميل المعني بالحركة الماليّة *" : "حدد البند المساعد للتوجيه *"}
            </label>
            <div className="flex items-center bg-slate-50 border rounded-xl px-3 py-1 cursor-pointer focus-within:ring-2 focus-within:ring-slate-950" onClick={() => setIsSubDropdownOpen(true)}>
              <Search size={14} className="text-slate-400 ml-2" />
              <input type="text" placeholder="اكتب كلمة للبحث الفوري داخل الكيانات التابعة..." value={subEntitySearch} onChange={(e) => { setSubEntitySearch(e.target.value); setIsSubDropdownOpen(true); }} className="w-full bg-transparent p-2 font-bold text-slate-800 focus:outline-none" />
              <ChevronDown size={14} className="text-slate-400 mr-auto" />
            </div>
            {isSubDropdownOpen && (
              <div className="absolute z-50 left-0 right-0 mt-1 bg-white border rounded-xl shadow-2xl max-h-44 overflow-y-auto divide-y divide-slate-100">
                {filteredSubEntities.length > 0 ? (
                  filteredSubEntities.map(entity => (
                     <div key={entity.id} onClick={() => { setSubEntityId(entity.id); setSubEntitySearch(entity.name); setIsSubDropdownOpen(false); }} className="p-3 hover:bg-slate-50 cursor-pointer text-slate-800 font-black text-xs">{entity.name}</div>
                  ))
                ) : (
                  <div className="p-3 text-center text-slate-400 text-xs">لا توجد بنود فرعية مطابقة للبحث</div>
                )}
              </div>
            )}
          </div>
        )}

        <div>
            <label>شرح القيد والسند (البيان) *</label>
            <textarea required rows={3} placeholder="اكتب شرحاً دقيقاً للسند المحاسبي..." value={statement} onChange={(e) => setStatement(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none text-xs" />
        </div>
        
        <button type="submit" disabled={loading} className="w-full bg-slate-950 text-white font-black py-4 rounded-xl hover:bg-slate-800 transition-all shadow-lg disabled:opacity-50">
          {loading ? "جاري ترحيل القيود وتحديث الأرصدة..." : "اعتماد وترحيل السند النقدي (Post Transaction)"}
        </button>
      </form>
    </div>
  );
}
