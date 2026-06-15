// src/app/dashboard/invoicing/page.tsx
"use client"
import React from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingCart, BookUser, ArrowLeft } from 'lucide-react';

const ActionCard = ({ icon: Icon, title, description, path, color }) => {
  const router = useRouter();
  return (
    <div
      onClick={() => router.push(path)}
      className={`bg-white p-6 rounded-2xl shadow-sm border-b-4 ${color} transition-all transform hover:-translate-y-1 hover:shadow-lg cursor-pointer group`}
    >
      <div className="flex justify-between items-center">
        <Icon className="w-10 h-10 text-slate-700" />
        <ArrowLeft className="w-6 h-6 text-slate-400 group-hover:text-slate-800 transition-colors" />
      </div>
      <h3 className="text-lg font-bold text-slate-900 mt-4">{title}</h3>
      <p className="text-xs text-slate-500 mt-1">{description}</p>
    </div>
  );
};

export default function InvoicingDashboardPage() {
  return (
    <div className="p-8 bg-slate-50 min-h-screen" dir="rtl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">مركز التحكم في المشتريات والموردين</h1>
        <p className="text-sm text-slate-500 mt-1">
          من هنا يمكنك إنشاء فواتير المشتريات ومراقبة حسابات الموردين بدقة.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <ActionCard
          icon={ShoppingCart}
          title="إنشاء فاتورة مشتريات"
          description="تسجيل فاتورة جديدة من مورد، وتحديث المخزون والقيود المحاسبية تلقائياً."
          path="/dashboard/invoicing/purchase"
          color="border-blue-500"
        />
        <ActionCard
          icon={BookUser}
          title="دفتر أستاذ الموردين"
          description="مراقبة أرصدة الموردين، عرض كشوفات الحساب التفصيلية، وتتبع المدفوعات والفواتير."
          path="/dashboard/partners/vendor-ledger"
          color="border-amber-500"
        />
      </div>
    </div>
  );
}
