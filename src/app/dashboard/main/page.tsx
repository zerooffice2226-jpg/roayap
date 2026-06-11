
"use client";
import Link from 'next/link';
import {
  Users,
  FileText,
  Package,
  Home,
  Settings,
  BarChart2,
  Book,
  FilePlus,
  ArrowRightLeft,
  Briefcase,
  DollarSign,
  ShoppingCart,
  CreditCard,
  ClipboardList,
  Zap
} from 'lucide-react';

const navItems = [
    { href: '/dashboard', label: 'شاشة المؤشرات العامة', icon: Home },
    { href: '/dashboard/accounts', label: 'دليل شجرة الحسابات (COA)', icon: Book },
    { href: '/dashboard/journal-entries', label: 'دفتر الأستاذ العام والتدقيق', icon: FilePlus },
    { href: '/dashboard/invoicing', label: 'إدارة فواتير المبيعات', icon: FileText },
    { href: '/dashboard/invoicing/purchase', label: 'فواتير المشتريات والتوريد', icon: ShoppingCart },
    { href: '/dashboard/partners', label: 'قاعدة الشركاء والموردين', icon: Users },
    { href: '/dashboard/pos', label: 'شاشة الكاشير السريعة (POS)', icon: Zap },
    { href: '/dashboard/receipts', label: 'سندات الصرف والقبض النقدي', icon: Briefcase },
    { href: '/dashboard/receipts/cheques', label: 'حافظة الشيكات والمقاصة', icon: CreditCard },
    { href: '/dashboard/trial-balance', label: 'ميزان المراجعة السنوي', icon: BarChart2 },
    { href: '/dashboard/profit-loss', label: 'قائمة الدخل والأرباح والخسائر', icon: DollarSign },
    { href: '/dashboard/settings', label: 'إعدادات التهيئة المالية', icon: Settings },
  ];

export default function MainPage() {
  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">لوحة التحكم الرئيسية</h1>
      <p className="text-gray-600 mb-8">وصول سريع لجميع وحدات النظام.</p>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {navItems.map((item) => (
          <Link href={item.href} key={item.href}>
            <div className="group bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 flex flex-col items-center justify-center p-6 text-center h-48 border-b-4 border-transparent hover:border-slate-800">
              <item.icon className="w-12 h-12 text-slate-800 mb-4 transition-transform duration-300 group-hover:scale-110" />
              <span className="font-semibold text-slate-700 text-sm">{item.label}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
