'use client'

import React, { useState, useEffect } from "react"
import { getAccountTree } from "@/app/actions/accounts"
import { Folder, FolderOpen, FileText, ChevronLeft, ChevronDown, Plus } from "lucide-react"
import { Account } from "@/lib/definitions";

// مكون فرعي لعرض كل عقدة في الشجرة بشكل متداخل
const AccountNode = ({ account }: { account: Account }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const hasChildren = account.children && account.children.length > 0;

  return (
    <div className="border-b border-slate-100/80 last:border-0 font-sans">
      {/* سطر الحساب الرئيسي */}
      <div 
        className={`flex items-center justify-between py-3.5 px-4 hover:bg-slate-50/80 transition-colors cursor-pointer ${isOpen ? 'bg-slate-50/40' : ''}`}
        onClick={() => hasChildren && setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3">
          {/* سهم فتح وإغلاق المجلد */}
          {hasChildren ? (
            isOpen ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronLeft size={16} className="text-slate-400" />
          ) : (
            <div className="w-4" /> // مساحة فارغة للحسابات الفرعية الأخيرة
          )}
          
          {/* أيقونات أودو الذكية للتمييز بين الحساب الرئيسي والتحليلي */}
          {hasChildren ? (
            isOpen ? <FolderOpen size={18} className="text-amber-500 fill-amber-100" /> : <Folder size={18} className="text-amber-500 fill-amber-500/10" />
          ) : (
            <FileText size={18} className="text-blue-500" />
          )}

          {/* كود واسم الحساب */}
          <span className="font-mono text-xs font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
            {account.code}
          </span>
          <span className={`text-sm ${hasChildren ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>
            {account.name}
          </span>
        </div>

        {/* نوع الحساب والرصيد المالي */}
        <div className="flex items-center gap-8">
          <span className="text-xs font-medium text-slate-400 bg-slate-50 border px-2 py-0.5 rounded-full">
            {account.type}
          </span>
          <span className={`text-sm font-bold font-mono tracking-tight ${account.currentBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {account.currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })} ج.م
          </span>
        </div>
      </div>

      {/* عرض الأبناء بالتداخل عند الفتح */}
      {hasChildren && isOpen && (
        <div className="pr-6 bg-slate-50/20 border-r-2 border-slate-100 mr-4">
          {account.children?.map((child: any) => (
            <AccountNode key={child.id} account={child} />
          ))}
        </div>
      )}
    </div>
  );
};

export default function AccountTreeView() {
  const [treeData, setTreeData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    // جلب البيانات مرة واحدة فقط لحظر التكرار اللانهائي
    getAccountTree().then((data) => {
      if (isMounted) {
        setTreeData(data);
        setLoading(false);
      }
    }).catch(() => {
      if (isMounted) setLoading(false);
    });

    return () => { isMounted = false; };
  }, []); // مصفوفة فارغة لضمان عدم التكرار نهائياً

  if (loading) return <div className="p-8 text-center text-slate-500 text-sm animate-pulse">جاري بناء شجرة الحسابات الهرمية...</div>;

  return (
    <div className="p-8 bg-slate-50 min-h-screen" dir="rtl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">دليل الحسابات (Chart of Accounts)</h1>
          <p className="text-slate-500 text-xs mt-1">الهيكلة الشجرية الكاملة للأصول واللتزامات والمصروفات</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
        <div className="flex justify-between items-center bg-slate-50 px-4 py-3 border-b border-slate-200/60 text-xs font-bold text-slate-500">
          <span>الحساب المالي</span>
          <div className="flex items-center gap-16 pl-4">
            <span>النوع</span>
            <span>الرصيد الحالي</span>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {treeData && treeData.length > 0 ? (
            treeData.map((account) => (
              <AccountNode key={account.id} account={account} />
            ))
          ) : (
            <div className="p-8 text-center text-slate-400 text-sm">لا توجد بيانات حسابات حالياً. تأكد من تشغيل الـ Seed.</div>
          )}
        </div>
      </div>
    </div>
  );
}
