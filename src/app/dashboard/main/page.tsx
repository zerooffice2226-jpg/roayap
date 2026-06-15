// src/app/dashboard/main/page.tsx
"use client"
import React, { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { 
  ShoppingCart, FileText, Landmark, Warehouse, Layers,
  FilePlus2, Receipt, History, PlusCircle, Download,
  Scale, FileSpreadsheet, Percent, Wallet, CheckSquare, Settings, Box, Users,
  BarChart2, ShieldAlert
} from "lucide-react"
import { getLiveExecutiveSummary } from "@/app/actions/summary-ops"

export default function DashboardMainLaunchpad() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeModule, setActiveModule] = useState<string | null>(null)

  // 💡 التحديث الفولاذي: التقاط النص الصريح بدلالة [0] لفك تجميد مربعات التاريخ بالمتصفح
  const todayString = new Date().toISOString().split('T')[0]; // تزويد الـ [0] صراحة لمنع المصفوفة المكسورة
  
  const [startDate, setStartDate] = useState(todayString);
  const [endDate, setEndDate] = useState(todayString);
  const [summaryData, setSummaryData] = useState<any>({ totalSales: 0, totalCash: 0, totalStockQty: 0, zeroProductsCount: 0 });


  useEffect(() => {
    setActiveModule(searchParams.get("mod"));
  }, [searchParams]);

  // 💡 تحديث وإنعاش الرياضيات التراكمية سحابياً فوراً ولحظياً عند تغيير أي تاريخ بالمتصفح
  useEffect(() => {
    if (activeModule === "summaries") {
      getLiveExecutiveSummary(startDate, endDate)
        .then((res) => {
          if (res && res.success) {
            setSummaryData(res);
          }
        })
        .catch((err) => console.error("خطأ في تحديث البيانات التاريخية:", err));
    }
  }, [startDate, endDate, activeModule]); // 💡 مستشعرات المراقبة الحية عند التغيير

  const subModulesMap: { [key: string]: { label: string, desc: string, href: string, icon: any, color: string, badge?: string }[] } = {
    sales: [
      { label: "فاتورة مبيعات جديدة", desc: "كاونتر الكاشير السريع بحاسبة المدفوع والمتبقي", href: "/dashboard/invoicing/new", icon: FilePlus2, color: "text-blue-400 border-blue-500/40" },
      { label: "مرتجع مبيعات", desc: "إصدار إذن إرجاع بضائع وتصحيح الصناديق", href: "/dashboard/invoicing/sales-return", icon: Receipt, color: "text-cyan-400 border-cyan-500/40" },
      { label: "حركة مطابقات العملاء", desc: "الأستاذ المجمع لمراقبة المديونيات وحركات منير", href: "/dashboard/partners/ledger", icon: Users, color: "text-indigo-400 border-indigo-500/40" },
      { label: "نقطة البيع (POS)", desc: "واجهة البيع الفوري المباشر للمجزأ", href: "/dashboard/pos", icon: Landmark, color: "text-purple-400 border-purple-500/40" }
    ],
    purchase: [
      { label: "فاتورة مشتريات واردة", desc: "إدخال يدوي أو رفع هجين جماعي من إكسيل", href: "/dashboard/invoicing/purchase", icon: PlusCircle, color: "text-amber-400 border-amber-500/40" },
      { label: "مرتجع مشتريات", desc: "إذن رد بضائع تالفة وسحب قيمتها المالية", href: "/dashboard/invoicing/purchase-return", icon: History, color: "text-orange-400 border-orange-500/40" },
      { label: "تسوية مستحقات الموردين", desc: "صرف النقدية الجزئية ومراجعة كشف الـ History", href: "/dashboard/invoicing/vendor-payments", icon: Landmark, color: "text-yellow-400 border-yellow-500/40" },
      { label: "حركة مطابقات الموردين", desc: "كشف مطابقات ذمم الموردين والالتزامات الجارية", href: "/dashboard/partners/vendor-ledger", icon: Users, color: "text-red-400 border-red-500/40" }
    ],
    inventory: [
      { label: "محضر حركة المخزن", desc: "أذونات الوارد والمنصرف وتسوية رفوف المستودع", href: "/dashboard/products/inventory-move", icon: Warehouse, color: "text-purple-400 border-purple-500/40" },
      { label: "جرد الأرصدة المجمعة", desc: "الأرصدة الكلية للبضائع وتقييم رأس المال الجاري", href: "/dashboard/products/ledger", icon: Layers, color: "text-pink-400 border-pink-500/40" },
      { label: "تأسيس صنف جديد", desc: "ربط وتكويد منتج فردي جديد بشجرة البضائع", href: "/dashboard/products/new", icon: PlusCircle, color: "text-fuchsia-400 border-fuchsia-500/40" },
      { label: "الرفع الجماعي من إكسيل", desc: "تحميل النموذج ورفع وتكويد آلاف المنتجات مجمعاً", href: "/dashboard/products/import-excel", icon: Download, color: "text-violet-400 border-violet-500/40" },
      { label: "المستودعات", desc: "إدارة الفروع ومخازن استلام وصرف المؤسسة", href: "/dashboard/products/warehouses", icon: Box, color: "text-slate-400 border-slate-500/40" }
    ],
    accounting: [
      { label: "سندات الصرف والقبض", desc: "التوجيه الحر للمصاريف وزيادة الـ currentBalance", href: "/dashboard/accounting/cash-receipt", icon: Wallet, color: "text-emerald-400 border-emerald-500/40" },
      { label: "تأسيس خزينة جديدة", desc: "تدشين الصناديق والبنك بنوع ASSET الصريح المحمي", href: "/dashboard/accounting/cash-register/new", icon: PlusCircle, color: "text-teal-400 border-teal-500/40" },
      { label: "شجرة الحسابات", desc: "الدليل المحاسبي العام والكامل لكافة أصول الشركة", href: "/dashboard/accounts", icon: Scale, color: "text-green-400 border-green-500/40" },
      { label: "قيود اليومية", desc: "استعراض ومراجعة القيود المزدوجة المرحلة بالدفاتر", href: "/dashboard/journal-entries", icon: FileSpreadsheet, color: "text-lime-400 border-lime-500/40" },
      { label: "قيد يومية جديد", desc: "إدخل قيد تسوية يدوي متوازن الطرفين بدقة", href: "/dashboard/journal-entries/new", icon: PlusCircle, color: "text-sky-400 border-sky-500/40" },
      { label: "ميزان المراجعة", desc: "التقرير المالي العام لتوازن الحسابات قبل الإغلاق", href: "/dashboard/trial-balance", icon: Scale, color: "text-blue-400 border-blue-500/40" },
      { label: "قائمة الدخل", desc: "كشف صافي أرباح ومصاريف مواسم التشغيل حياً", href: "/dashboard/profit-loss", icon: Percent, color: "text-indigo-400 border-indigo-500/40" }
    ],
    receipts: [
      { label: "الإيصالات", desc: "دفتر جرد ومتابعة إيصالات القبض المعتمدة", href: "/dashboard/receipts", icon: Receipt, color: "text-teal-400 border-teal-500/40" },
      { label: "تسوية بنكية", desc: "مطابقة كشف حساب البنك الفعلي مع الدفاتر", href: "/dashboard/receipts/bank-reconciliation", icon: CheckSquare, color: "text-cyan-400 border-cyan-500/40" },
      { label: "الشيكات", desc: "إدارة حركات الشيكات الواردة وتحت التحصيل", href: "/dashboard/receipts/cheques", icon: Landmark, color: "text-sky-400 border-sky-500/40" },
      { label: "دفتر الإيصالات", desc: "الأرشيف الرقابي الشامل لتسلسل دفاتر الإيصالات", href: "/dashboard/receipts/ledger", icon: Layers, color: "text-blue-400 border-blue-500/40" }
    ],
    data: [
      { label: "قاعدة الشركاء", desc: "الملف المركزي لإضافة وتعديل بيانات العملاء والموردين", href: "/dashboard/partners", icon: Users, color: "text-slate-400 border-slate-500/40" },
      { label: "الإعدادات العامة", desc: "تهيئة معلومات المؤسسة والفترات الضريبية الحاكمة", href: "/dashboard/settings", icon: Settings, color: "text-gray-400 border-gray-500/40" },
      { label: "إعدادات الخزائن", desc: "تحديد الخزن الافتراضية وصلاحيات كاشير الفروع", href: "/dashboard/settings/cash-bank", icon: Wallet, color: "text-zinc-400 border-zinc-500/40" }
    ],
    summaries: [
      { label: `ملخص المبيعات`, desc: `إجمالي مبيعاتك المحققة بالفترة المحددة`, href: "/dashboard/partners/ledger", icon: FileText, color: "text-blue-400 border-blue-500/40", badge: `${summaryData.totalSales?.toLocaleString()} ج.م` },
      { label: `الصناديق والعهد`, desc: `السيولة التراكمية الحالية بالخزائن الحية`, href: "/dashboard/accounting/cash-receipt", icon: Wallet, color: "text-emerald-400 border-emerald-500/40", badge: `${summaryData.totalCash?.toLocaleString()} ج.م` },
      { label: `المخزن والمستودع`, desc: `إجمالي عدد قطع البضائع الحالية على الرفوف`, href: "/dashboard/products/ledger", icon: Warehouse, color: "text-amber-400 border-amber-500/40", badge: `${summaryData.totalStockQty?.toLocaleString()} قطعة` },
      { label: `منتجات مطلوبة (رصيدها صفر)`, desc: `الأصناف النافدة تماماً وتتطلب إعادة طلب شراء فوري`, href: "/dashboard/products/ledger", icon: ShieldAlert, color: "text-rose-400 border-rose-500/40", badge: `${summaryData.zeroProductsCount} صنف نافد` }
    ]
  };

  const mainModules = [
    { id: "inventory", label: "المخزون", icon: Warehouse, color: "text-purple-400 border-purple-500" },
    { id: "purchase", label: "المشتريات", icon: ShoppingCart, color: "text-amber-400 border-amber-500" },
    { id: "sales", label: "المبيعات", icon: FileText, color: "text-blue-400 border-blue-500" },
    { id: "accounting", label: "المحاسبة", icon: Scale, color: "text-emerald-400 border-emerald-500" },
    { id: "receipts", label: "الإيصالات", icon: Landmark, color: "text-teal-400 border-teal-500" },
    { id: "data", label: "الإعدادات", icon: Settings, color: "text-slate-400 border-slate-500" },
    { id: "summaries", label: "ملخصات وتقارير رصد", icon: BarChart2, color: "text-purple-500 border-purple-500" },
  ];

  const getModuleTitle = () => {
    const found = mainModules.find(m => m.id === activeModule);
    return found ? found.label : "لوحة التحكم الرئيسية";
  };
  
  const getActiveModuleData = () => {
    return mainModules.find(m => m.id === activeModule);
  }

  const currentSubItems = activeModule ? subModulesMap[activeModule] : [];

  return (
    <div className="p-4 md:p-8 min-h-screen text-right select-none font-sans bg-slate-950 text-slate-100" dir="rtl">
      
      {/* 💡 التثبيت الهندسي: نقل شريط فلاتر التواريخ بالكامل لأعلى الجانب الأيمن مفروداً وبحرية مطلقة */}
<div className="w-full flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-gray-800 pb-5 mb-8" dir="rtl">
  
  {/* الجانب الأيمن الشامل: المسمى وعناصر الفلترة اللحظية الحرة */}
  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 text-right w-full md:w-auto">
    <div>
      <h1 className="text-xl font-black text-white tracking-tight">{getModuleTitle()}</h1>
      <p className="text-gray-500 text-[10px] mt-0.5 font-medium">منظومة modoo ERP المتكاملة حية وسحابية [Odoo 18]</p>
    </div>

    {/* 💡 نقل وتثبيت فلاتر التاريخ بحرية كاملة أعلى اليمين في حالة موديول الملخصات */}
    {activeModule === "summaries" && (
      <div className="flex flex-wrap items-center gap-4 bg-slate-900/50 border border-slate-800/80 p-2 px-4 rounded-2xl shadow-inner animate-fade-in">
        
        {/* من تاريخ حر ومباشر */}
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-[11px] font-bold">من:</span>
          <input 
            type="date" 
            id="filter_start_date_v2"
            name="filter_start_date_v2"
            value={startDate} 
            onChange={(e) => {
              const val = e.target.value;
              if (val) setStartDate(val); // 💡 تحرير كامل لتغيير التاريخ بحرية
            }}
            className="bg-slate-950 text-white p-1.5 px-2.5 rounded-xl border border-slate-800 text-center font-mono font-black text-xs focus:outline-none focus:ring-1 focus:ring-purple-600 cursor-pointer" 
          />
        </div>

        {/* إلى تاريخ حر ومباشر */}
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-[11px] font-bold">إلى:</span>
          <input 
            type="date" 
            id="filter_end_date_v2"
            name="filter_end_date_v2"
            value={endDate} 
            onChange={(e) => {
              const val = e.target.value;
              if (val) setEndDate(val); // 💡 تحرير كامل لتغيير التاريخ بحرية
            }}
            className="bg-slate-950 text-white p-1.5 px-2.5 rounded-xl border border-slate-800 text-center font-mono font-black text-xs focus:outline-none focus:ring-1 focus:ring-purple-600 cursor-pointer" 
          />
        </div>

      </div>
    )}
  </div>

  {/* الجانب الأيسر: أزرار التحكم وشارات الرصد */}
  <div className="flex items-center gap-2 mr-auto md:mr-0">
    {activeModule && (
      <button 
        type="button" 
        onClick={() => router.push("/dashboard/main")} 
        className="text-[10px] font-black bg-gray-900 border border-gray-800 hover:bg-purple-600 text-white px-3 py-2 rounded-xl shadow-md transition-all flex items-center gap-1 cursor-pointer"
      >
        ← العودة للرئيسية
      </button>
    )}
  </div>

</div>

      <AnimatePresence mode="wait">
        {!activeModule ? (
          <motion.div 
            key="main-modules"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="flex flex-col items-center justify-center min-h-[72vh] relative"
          >
            <div className="w-28 h-28 bg-gradient-to-tr from-purple-600 to-indigo-600 text-white rounded-full flex items-center justify-center font-sans font-black text-base tracking-widest shadow-2xl border border-purple-400/20 z-30 pointer-events-none">
              modoo
            </div>

            <div className="absolute w-[500px] h-[500px] flex items-center justify-center">
              {mainModules.map((module, idx) => {
                  const totalItems = mainModules.length;
                  const angle = (idx * (360 / totalItems) - 90) * (Math.PI / 180);
                  const radius = 190;
                  const x = Math.round(radius * Math.cos(angle));
                  const y = Math.round(radius * Math.sin(angle));
                  const MainIcon = module.icon;

                  return (
                    <div
                      key={module.id}
                      onClick={() => router.push(`/dashboard/main?mod=${module.id}`)}
                      style={{ transform: `translate(${x}px, ${y}px)` }}
                      className={`category-circle absolute bg-slate-900/90 border border-slate-800 hover:${module.color.split(' ')[1]} `}
                    >
                        <MainIcon size={22} className={`mb-1 ${module.color.split(' ')[0]}`} />
                        <span className="text-[11px] font-black text-white">{module.label}</span>
                    </div>
                  );
              })}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="sub-modules"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="flex flex-col items-center justify-center min-h-[72vh] relative"
          >
            <div className={`w-36 h-36 rounded-full flex items-center justify-center font-sans font-black text-lg tracking-widest shadow-2xl z-30 pointer-events-none p-4 text-center leading-tight bg-slate-900 border ${getActiveModuleData()?.color.split(' ')[1]}`}>
              <div className='flex flex-col items-center justify-center'>
                 {activeModule && React.createElement(getActiveModuleData()!.icon, { size: 32, className: getActiveModuleData()?.color.split(' ')[0] })}
                 <span className='text-sm mt-2 text-white'>{getModuleTitle()}</span>
              </div>
            </div>

            <div className="absolute w-full h-full flex items-center justify-center">
              {currentSubItems?.map((sub, idx) => {
                const SubIcon = sub.icon;
                const totalItems = currentSubItems.length;
                const angle = (idx * (360 / totalItems) - 90) * (Math.PI / 180);
                const radius = 210;
                const x = Math.round(radius * Math.cos(angle));
                const y = Math.round(radius * Math.sin(angle));

                return (
                  <div
                    key={idx}
                    onClick={() => router.push(sub.href)}
                    style={{ transform: `translate(${x}px, ${y}px)` }}
                    className={`category-circle absolute bg-slate-900/90 border ${sub.color.split(' ')[1]} hover:bg-purple-950/20 p-2 text-center transition-all group`}
                  >
                    <div className="scale-100 group-hover:scale-105 transition-transform duration-200 flex flex-col items-center justify-center h-full">
                      <SubIcon size={20} className={`transition-colors duration-200 ${sub.color.split(' ')[0]}`} />
                      <span className="text-[10px] font-bold text-white leading-tight mt-1 whitespace-nowrap">{sub.label.split('(')[0]}</span>
                      {sub.badge && (
                        <span className={`mt-1.5 text-[11px] font-mono font-bold tracking-tighter text-white/90`}>{sub.badge}</span>
                      )}
                    </div>
                    
                    <div className="absolute bottom-full mb-2 w-48 p-3 bg-slate-950 border border-slate-700 rounded-lg text-xs text-center shadow-xl opacity-0 group-hover:opacity-100 group-hover:z-50 transition-opacity duration-200 pointer-events-none">
                      <p className="font-bold text-slate-200">{sub.label}</p>
                      <p className="text-slate-400 text-[10px] mt-1">{sub.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        .category-circle { 
          width: 110px; 
          height: 110px; 
          border-radius: 50%; 
          display: flex; 
          flex-direction: column; 
          justify-content: center; 
          align-items: center; 
          cursor: pointer; 
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1); 
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.6); 
          z-index: 10;
          backdrop-filter: blur(8px);
        } 
        .category-circle:hover { 
          box-shadow: 0 18px 28px -8px rgba(147, 51, 234, 0.45); 
          z-index: 25; 
        }
        .animate-fade-in {
            animation: fadeIn 0.5s ease-in-out;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
