// src/app/dashboard/settings/page.tsx
"use client"
import React, { useState, useEffect } from "react"
import { saveFinancialSettings, getFinancialSettings } from "@/app/actions/settings-ops"
import { getAccountTree } from "@/app/actions/accounts"
import { Settings, Sliders, ShieldCheck, Save, Info, Loader } from "lucide-react"

type Account = {
    id: string;
    name: string;
    code: string;
}

export default function FinancialSettingsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [settings, setSettings] = useState({
    defaultCustomerAccount: "",
    defaultVendorAccount: "",
    defaultInventoryAccount: "",
    defaultCashAccount: ""
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [accountsData, settingsData] = await Promise.all([
          getAccountTree(),
          getFinancialSettings()
        ]);
        setAccounts(accountsData as Account[]);
        setSettings(settingsData as any);
      } catch {
        setError("فشل في تحميل البيانات الأولية. يرجى إعادة تحميل الصفحة.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await saveFinancialSettings(settings);
      setSuccess("🎉 تم تحديث قنوات التوجيه والتهيئة المركزية لنظام الـ ERP بنجاح كامل!");
    } catch(err: any) {
      setError(err.message || "حدث خطأ غير متوقع أثناء حفظ الإعدادات.");
    } finally {
      setSaving(false);
    }
  };
  
  const handleSettingChange = (field: keyof typeof settings, value: string) => {
      setSettings(prev => ({...prev, [field]: value}))
  }
  
  if(loading) {
      return (
          <div className="p-8 bg-slate-50 min-h-screen font-sans flex justify-center items-center" dir="rtl">
              <div className="flex flex-col items-center gap-2 text-slate-500">
                  <Loader className="animate-spin" size={32}/>
                  <span>جاري تحميل الإعدادات ودليل الحسابات...</span>
              </div>
          </div>
      )
  }

  return (
    <div className="p-8 bg-slate-50 min-h-screen font-sans" dir="rtl">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 border-b pb-4">
        <div>
          <div className="flex items-center gap-3">
            <Settings className="text-slate-900" size={28} />
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">إعدادات التهيئة المالية</h1>
          </div>
          <p className="text-slate-500 text-sm mt-1">ضبط وتوجيه الحسابات التلقائية لعمليات المبيعات، المشتريات، والمخازن</p>
        </div>
      </div>
      
      {error && <div className="bg-rose-100 text-rose-700 text-sm font-bold p-3 rounded-xl my-4 text-center max-w-3xl mx-auto">{error}</div>}
      {success && <div className="bg-emerald-100 text-emerald-800 text-sm font-bold p-3 rounded-xl my-4 text-center max-w-3xl mx-auto">{success}</div>}

      <div className="bg-blue-50/80 border border-blue-200 text-blue-800 p-4 rounded-xl mb-8 flex items-start gap-3 text-sm max-w-3xl mx-auto leading-relaxed">
        <Info size={20} className="text-blue-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold block mb-1">ملاحظة أمان محاسبية:</span>
          تغيير هذه الحسابات سيقوم بتعديل وجهة القيود الآلية القادمة فقط. القيود القديمة والمرحّلة لن تتأثر بأي تعديل هنا لضمان سلامة السجلات المالية.
        </div>
      </div>

      <form onSubmit={handleSave} className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200/80 max-w-3xl mx-auto">
        <div className="space-y-8">
          
          <div className="flex items-center gap-2.5 text-slate-800 font-bold text-lg border-b pb-4">
            <Sliders size={20} className="text-slate-500" />
            <span>توجيه حسابات العمليات الافتراضية</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">حساب المبيعات (ذمم العملاء)</label>
              <select value={settings.defaultCustomerAccount} onChange={(e) => handleSettingChange('defaultCustomerAccount', e.target.value)} className="w-full p-3 bg-slate-100 border-slate-200 border rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-slate-900 transition">
                {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.code} - {acc.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">حساب المشتريات (ذمم الموردين)</label>
              <select value={settings.defaultVendorAccount} onChange={(e) => handleSettingChange('defaultVendorAccount', e.target.value)} className="w-full p-3 bg-slate-100 border-slate-200 border rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-slate-900 transition">
                {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.code} - {acc.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">حساب المخزون الرئيسي</label>
              <select value={settings.defaultInventoryAccount} onChange={(e) => handleSettingChange('defaultInventoryAccount', e.target.value)} className="w-full p-3 bg-slate-100 border-slate-200 border rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-slate-900 transition">
                {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.code} - {acc.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">حساب النقدية (الخزينة/البنك)</label>
              <select value={settings.defaultCashAccount} onChange={(e) => handleSettingChange('defaultCashAccount', e.target.value)} className="w-full p-3 bg-slate-100 border-slate-200 border rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-slate-900 transition">
                {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.code} - {acc.name}</option>)}
              </select>
            </div>
          </div>

          <div className="border-t pt-6">
            <button type="submit" disabled={saving || loading} className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-base rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed">
              {saving ? <Loader className="animate-spin" size={20}/> : <Save size={20} />}
              {saving ? "جاري الحفظ..." : "حفظ وتثبيت التهيئة المركزية"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
