// src/app/components/SideNav.tsx
"use client"
import React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { 
  ShoppingCart, ShoppingBag, Landmark, Box, Scale, Settings, Users, Layers 
} from "lucide-react"

export default function SideNav() {
  const searchParams = useSearchParams();
  // Default view is now 'inventory'
  const currentView = searchParams.get("view") || "inventory"; 

  const isSelected = (viewKey: string) => currentView === viewKey;

  // Reordered menuItems array
  const menuItems = [
    { key: "inventory", label: "إدارة الجرد والمستودعات", icon: Box, color: "bg-purple-600 shadow-purple-600/50" },
    { key: "customers", label: "العملاء والمبيعات", icon: ShoppingCart, color: "bg-blue-600 shadow-blue-600/50" },
    { key: "vendors", label: "الموردين والمشتريات", icon: ShoppingBag, color: "bg-amber-500 shadow-amber-500/50" },
    { key: "cashBank", label: "الخزائن والأوراق المالية", icon: Landmark, color: "bg-emerald-500 shadow-emerald-500/50" },
    { key: "reports", label: "التقارير الختامية والدفاتر", icon: Scale, color: "bg-teal-500 shadow-teal-500/50" },
  ];

  return (
    <aside className="w-68 bg-slate-950 text-slate-300 h-screen sticky top-0 right-0 flex flex-col border-l border-slate-900 font-sans shadow-2xl" dir="rtl">
      
      <div className="p-5 border-b border-slate-900/60 flex items-center gap-3 bg-slate-950/80 backdrop-blur-md">
        <div className="bg-gradient-to-tr from-indigo-600 to-violet-500 p-2.5 rounded-xl text-white shadow-lg shadow-indigo-600/30 ring-1 ring-white/10">
          <Layers size={18} className="animate-spin-slow" />
        </div>
        <div>
          <h2 className="text-xs font-black text-white tracking-wider uppercase">منظومة أودو ERP</h2>
          <p className="text-[10px] text-slate-500 font-bold mt-0.5 tracking-tight">الجيل الجديد الذكي • 2026</p>
        </div>
      </div>

      <div className="px-4 pt-5 pb-2">
        <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-3 flex items-center justify-between text-[11px] font-bold text-slate-400">
          <span>حالة قفل الفترات</span>
          <span className="flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full ring-1 ring-emerald-500/20">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
            مفتوحة ومستقرة
          </span>
        </div>
      </div>

      <nav className="p-4 space-y-2 text-xs font-bold flex-grow overflow-y-auto">
        {menuItems.map((item) => {
          const active = isSelected(item.key);
          return (
            <Link 
              key={item.key}
              href={`/dashboard?view=${item.key}`} 
              className={`relative flex items-center justify-between w-full px-4 py-3.5 rounded-xl transition-all duration-300 group overflow-hidden ${active 
                  ? 'bg-slate-900 text-white shadow-inner border border-slate-800/60 font-black' 
                  : 'hover:bg-slate-900/40 text-slate-400 hover:text-slate-200 border border-transparent'
              }`}>
              {active && (
                <div className={`absolute right-0 top-0 bottom-0 w-1.5 rounded-l ${item.color} shadow-lg`} />
              )}
              <div className="flex items-center gap-3.5 z-10">
                <div className={`p-1.5 rounded-lg transition-colors duration-300 ${active ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'
                }`}>
                  <item.icon size={16} />
                </div>
                <span className="tracking-wide text-xs">{item.label}</span>
              </div>
            </Link>
          );
        })}

        <div className="pt-3 pb-2">
          <div className="border-t border-slate-800/50 -mx-4"></div>
        </div>

        <Link 
          href="/dashboard/partners" 
          className="flex items-center gap-3.5 px-4 py-3.5 rounded-xl hover:bg-slate-900/60 text-slate-400 hover:text-slate-200 transition-all border border-transparent hover:border-slate-800/60"
        >
          <div className="p-1.5 rounded-lg text-slate-500"><Users size={16} /></div>
          <span className="tracking-wide">قاعدة الشركاء والموردين</span>
        </Link>

        <Link 
          href="/dashboard/settings" 
          className="flex items-center gap-3.5 px-4 py-3.5 rounded-xl hover:bg-slate-900/60 text-slate-400 hover:text-slate-200 transition-all border border-transparent hover:border-slate-800/60 group"
        >
          <div className="p-1.5 rounded-lg text-slate-500"><Settings size={16} className="group-hover:rotate-45 transition-transform duration-500"/></div>
          <span className="tracking-wide">التهيئة والإعدادات العامة</span>
        </Link>

      </nav>
    </aside>
  )
}
