// src/app/components/SideNav.tsx
"use client"
import React from "react"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { 
  BarChart2, ShoppingCart, FileText, Landmark, Warehouse, Users, Settings, Scale, CreditCard, GitMerge,
  ChevronRight, ChevronLeft
} from "lucide-react"

interface SideNavProps {
  isCollapsed: boolean;
  toggleCollapse: () => void;
}

export default function SideNav({ isCollapsed, toggleCollapse }: SideNavProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const currentMod = searchParams.get("mod")

  const mainTabs = [
    { id: "main", href: "/dashboard/main", label: "لوحة التحكم", icon: BarChart2 },
    { id: "summaries", href: "/dashboard/main?mod=summaries", label: "ملخصات النظام", icon: BarChart2 },
    { id: "sales", href: "/dashboard/main?mod=sales", label: "المبيعات والعملاء", icon: FileText },
    { id: "purchase", href: "/dashboard/main?mod=purchase", label: "المشتريات والموردين", icon: ShoppingCart },
    { id: "inventory", href: "/dashboard/main?mod=inventory", label: "المخزون والمنتجات", icon: Warehouse },
    { id: "accounting", href: "/dashboard/main?mod=accounting", label: "الحسابات والخزينة", icon: Scale },
    { id: "receipts", href: "/dashboard/main?mod=receipts", label: "الإيصالات والبنوك", icon: CreditCard },
    { id: "data", href: "/dashboard/partners", label: "بيانات وإعدادات", icon: Settings },
  ];

  const navVariants = {
    collapsed: { width: "5rem" },
    expanded: { width: "16rem" },
  };

  const labelVariants = {
    initial: { opacity: 0, x: 20, width: 0 },
    animate: { opacity: 1, x: 0, width: "auto", marginRight: '0.75rem', transition: { duration: 0.15, delay: 0.05 } },
    exit: { opacity: 0, x: 20, width: 0, marginRight: 0, transition: { duration: 0.1 } }
  }

  return (
    <motion.div 
      animate={isCollapsed ? "collapsed" : "expanded"}
      variants={navVariants}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className="h-screen bg-gray-900/95 backdrop-blur-lg text-gray-100 flex flex-col fixed top-0 right-0 border-l border-gray-800/60 shadow-2xl print:hidden z-50 select-none"
      dir="rtl"
    >
      {/* الهيدر العلوي للسايد بار مع حماية خروج السهم خارج الـ overflow */}
      <div className="p-5 border-b border-gray-800/40 flex items-center gap-3 h-[65px] relative">
        <div className="bg-gradient-to-tr from-purple-600 to-indigo-500 p-2 rounded-lg flex-shrink-0">
          <GitMerge size={18} className="text-white" />
        </div>
        
        <AnimatePresence mode="wait">
          {!isCollapsed && (
            <motion.span
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.15 }}
              className="font-black text-sm text-white tracking-wide whitespace-nowrap"
            >
              منظومة modoo ERP
            </motion.span>
          )}
        </AnimatePresence>

        {/* 💡 التثبيت الهندسي القاطع لموضع وحجم زر السهم العائم ليكون بارزاً على الحافة دائماً وبدون بتر بصري */}
        <button 
          type="button"
          onClick={toggleCollapse} 
          className="absolute left-[-12px] top-1/2 -translate-y-1/2 bg-gray-800 hover:bg-purple-600 text-white rounded-full p-1.5 shadow-xl border border-gray-700/60 transition-colors z-[60] cursor-pointer flex items-center justify-center"
        >
          {isCollapsed ? <ChevronLeft size={13} /> : <ChevronRight size={13} />}
        </button>
      </div>

      {/* الروابط والشارات الإدارية */}
      <nav className="p-3 flex-grow mt-4 space-y-1">
        {mainTabs.map((item) => {
          const Icon = item.icon;
          const isActive = (item.id === "main" && pathname === "/dashboard/main" && !currentMod) || (currentMod === item.id);

          return (
            <Link
              key={item.id}
              href={item.href}
              className={`relative flex items-center h-11 rounded-xl text-xs font-bold transition-all group ${
                isActive ? "text-white" : "text-gray-400 hover:bg-gray-800/40 hover:text-white"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="active-pill"
                  className="absolute inset-0 bg-gradient-to-r from-purple-600 to-indigo-500 rounded-xl shadow-md shadow-purple-600/20"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <div className={`relative z-10 w-full flex items-center ${isCollapsed ? 'justify-center' : 'px-3'}`}>
                <Icon size={16} className={isActive ? "text-white" : "text-gray-400 group-hover:text-gray-200"} />
                <AnimatePresence mode="wait">
                  {!isCollapsed && (
                    <motion.span
                      variants={labelVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      className="whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            </Link>
          );
        })}
      </nav>
      
      <div className="p-4 border-t border-gray-800/40 text-center font-mono text-gray-600 text-[10px]">
        v2.0 Modern
      </div>
    </motion.div>
  );
}