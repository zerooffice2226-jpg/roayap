// src/app/dashboard/page.tsx
"use client"
import React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { 
  Home, ShoppingCart, ShoppingBag, Landmark, Scale, Box, Users, Settings,
  FileText, PlusCircle, Zap, CreditCard, Wallet, FileCheck2, PackagePlus,
  ClipboardList, DollarSign, ArrowRight, Undo2, Warehouse, FileSpreadsheet, BookUser
} from "lucide-react"

// Updated and reordered MODULES_DATA
const MODULES_DATA: any = {
  inventory: {
    label: "إدارة الجرد والمستودعات",
    description: "بطاقات الأصناف، حركات الرفوف، والتسويات الجردية والتقارير المخزنية",
    subItems: [
      { href: "/dashboard/products/new", label: "إضافة بطاقة صنف وتوجيهه ماليًا", icon: PlusCircle },
      { href: "/dashboard/products/bulk-import", label: "رفع الأصناف بالإكسيل (Bulk Import)", icon: FileSpreadsheet },
      { href: "/dashboard/products/inventory-move", label: "تسجيل إذن حركة مخزن (جرد)", icon: PackagePlus },
      { href: "/dashboard/products/ledger", label: "بطاقة وحركة الصنف المخزni تفصيلي", icon: Box },
      { href: "/dashboard/products/warehouses", label: "إدارة وتأسيس الفروع والمخازن", icon: Warehouse } // تأكد من إضافة هذا السطر بدقة
    ]
  },
  customers: {
    label: "العملاء والمبيعات",
    description: "إدارة الفواتير، مبيعات الكاشير، المرتجع، وقاعدة بيانات العملاء",
    subItems: [
      { href: "/dashboard/invoicing", label: "قائمة فواتير المبيعات والتعميد", icon: FileText },
      { href: "/dashboard/invoicing/new", label: "إنشاء فاتورة مبيعات جديدة", icon: PlusCircle },
      { href: "/dashboard/pos", label: "شاشة الكاشير السريعة (POS)", icon: Zap, isSpecial: true },
      { href: "/dashboard/invoicing/sales-return", label: "مردودات ومسترجعات المبيعات", icon: Undo2 },
      { href: "/dashboard/partners", label: "إدارة وبطاقات العملاء (CRM)", icon: Users }, // Smart repetition
      { href: "/dashboard/partners/ledger", label: "تقرير حركة العملاء", icon: Users }
    ]
  },
  vendors: {
    label: "الموردين والمشتريات",
    description: "فواتير المشتريات، سداد الدائنين، مرتجع الموردين، وقاعدة الموردين",
    subItems: [
      { href: "/dashboard/invoicing/purchase", label: "تسجيل فاتورة مشتريات واردة", icon: PlusCircle },
      { href: "/dashboard/partners/vendor-ledger", label: "كشف حساب الموردين", icon: BookUser },
      { href: "/dashboard/invoicing/vendor-payments", label: "سداد وتسوية فواتير الموردين", icon: CreditCard },
      { href: "/dashboard/invoicing/purchase-return", label: "مردودات وإرجاع المشتريات", icon: Undo2 },
      { href: "/dashboard/partners", label: "إدارة وتصنيفات الموردين", icon: Users } // Smart repetition
    ]
  },
  cashBank: {
    label: "الخزائن والأوراق المالية",
    description: "سندات القبض والصرف، محفظة الشيكات، والتسوية البنكية وحركات الخزن",
    subItems: [
      { href: "/dashboard/accounting/cash-receipt", label: "سندات القبض والصرف (Wizard)", icon: CreditCard },
      { href: "/dashboard/receipts", label: "سندات الصرف والقبض المباشر", icon: Wallet },
      { href: "/dashboard/receipts/cheques", label: "حافظة الشيكات والمقاصة", icon: FileCheck2 },
      { href: "/dashboard/accounting/cash-register/new", label: "إضافة خزن وبنوك جديدة", icon: PlusCircle },
      { href: "/dashboard/receipts/bank-reconciliation", label: "تسوية ومطابقة البنوك", icon: Landmark },
      { href: "/dashboard/receipts/ledger", label: "دفتر أستاذ النقدية وحركة الخزن", icon: Wallet }
    ]
  },
  reports: {
    label: "التقارير الختامية والدفاتر",
    description: "الميزانية، الأستاذ العام، الأرباح والخسائر، وميزان المراجعة",
    subItems: [
      { href: "/dashboard/accounts", label: "دليل شجرة الحسابات (COA)", icon: ClipboardList },
      { href: "/dashboard/journal-entries", label: "دفتر الأستاذ العام والتدقيق المالي", icon: FileText },
      { href: "/dashboard/journal-entries/new", label: "إنشاء قيد يومية يدوي موزون", icon: PlusCircle },
      { href: "/dashboard/trial-balance", label: "ميزان المراجعة السنوي مجمع", icon: Scale },
      { href: "/dashboard/profit-loss", label: "قائمة الدخل والأرباح والخسائر P&L", icon: DollarSign },
      { href: "/dashboard/partners/ledger", label: "كشف حساب الشركاء التفصيلي", icon: Users }
    ]
  }
};

export default function DashboardMainPage() {
  const searchParams = useSearchParams();
  
  const activeKey = searchParams.get("view") || "inventory"; // Default to inventory
  const activeModule = MODULES_DATA[activeKey];

  if (!activeModule) {
    return <div className="p-8 text-center text-slate-500">القسم المطلوب غير معرّف.</div>;
  }

  return (
    <div className="p-8 bg-slate-50 min-h-screen font-sans animate-fade-in" dir="rtl">
      
      <div className="mb-8 border-b pb-5">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          {activeModule.label}
        </h1>
        <p className="text-slate-400 text-xs mt-1">
          {activeModule.description}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {activeModule.subItems.map((item: any, idx: number) => (
          <Link href={item.href} key={idx} legacyBehavior>
            <a className={`group bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col items-center justify-center text-center h-44 border-b-4 hover:border-slate-900 ${
              item.isSpecial ? 'bg-amber-50/30 border-amber-200 hover:border-amber-400' : 'hover:border-slate-900'
            }`}>
              <div className={`p-3.5 rounded-xl mb-4 ${
                item.isSpecial ? 'bg-amber-100 text-amber-600' : 'bg-slate-50 text-slate-700 group-hover:bg-slate-900 group-hover:text-white'
              } transition-colors shadow-sm`}>
                <item.icon size={22} />
              </div>
              <span className="font-bold text-slate-700 text-xs group-hover:text-slate-950 tracking-wide">{item.label}</span>
            </a>
          </Link>
        ))}
      </div>
    </div>
  );
}
