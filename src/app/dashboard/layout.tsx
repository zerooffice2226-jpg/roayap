// src/app/dashboard/layout.tsx
"use client"
export const dynamic = 'force-dynamic'
import React, { useState, useEffect } from "react"
import SideNav from "@/app/components/SideNav"
import { motion } from "framer-motion"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  // حالة الطي الافتراضية الموحدة لشركتك لتبدأ مطوية لراحة العين كما استقرينا
  const [isCollapsed, setIsCollapsed] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("sidenav_collapsed");
    if (saved === "false") setIsCollapsed(false);
  }, []);

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      localStorage.setItem("sidenav_collapsed", String(!prev));
      return !prev;
    });
  };

  return (
    <div className="min-h-screen bg-slate-900 flex" dir="rtl">
      
      {/* 1. حقن وتمرير الحالات والتحكم داخل السايد بار المطور الفخم */}
      <SideNav isCollapsed={isCollapsed} toggleCollapse={toggleCollapse} />

      {/* 2. 💡 هيدروليك الإفساح التلقائي: الشاشة الكبيرة تتزحزح لليسار وتفسح المجال آلياً مع حركة تمدد الشريط */}
      <motion.main 
        animate={{ marginRight: isCollapsed ? "5rem" : "16rem" }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
        className="flex-1 min-h-screen bg-slate-950 p-4 overflow-x-hidden"
      >
        <div className="bg-slate-900/40 border border-slate-800/40 rounded-3xl min-h-[94vh] shadow-inner p-2">
          {children}
        </div>
      </motion.main>

    </div>
  );
}