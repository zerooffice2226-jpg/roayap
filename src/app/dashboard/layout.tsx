import { Suspense } from "react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-slate-50" dir="rtl">
      <main className="mr-64">
        <Suspense fallback={<div className="p-8 text-center text-xs animate-pulse text-slate-400">جاري تحميل واجهة العمليات...</div>}>
          {children}
        </Suspense>
      </main>
    </div>
  );
}
