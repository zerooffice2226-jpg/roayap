// src/app/dashboard/products/warehouses/page.tsx
"use client"
import React, { useState, useEffect } from "react"
import { createWarehouse, getWarehousesList } from "@/app/actions/warehouse-ops"
import { PlusCircle, Save, MapPin, Barcode, Warehouse } from "lucide-react"

export default function WarehousesManagementPage() {
  const [warehouses, setWarehouses] = useState<any[]>([])
  const [name, setName] = useState("")
  const [code, setCode] = useState("")
  const [location, setLocation] = useState("")
  const [loading, setLoading] = useState(false)

  const loadWarehouses = () => {
    getWarehousesList()
      .then(setWarehouses)
      .catch((err) => {
        console.error("Failed to load warehouses:", err);
        alert("فشل في جلب قائمة المستودعات.");
      });
  }

  useEffect(() => { 
    loadWarehouses(); 
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createWarehouse({ name, code, location });
      alert("تم تسجيل وتدشين المستودع الجديد بنجاح في قاعدة البيانات!");
      setName(""); setCode(""); setLocation("");
      loadWarehouses();
    } catch (err: any) {
      alert(`فشل في إضافة المستودع: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen font-sans" dir="rtl">
      
      {/* الهيدر */}
      <div className="flex items-center gap-2 mb-8 border-b pb-4">
        <Warehouse className="text-slate-900" size={24} />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">إدارة وتهيئة المستودعات (Warehouses)</h1>
          <p className="text-slate-500 text-xs mt-0.5">تعريف مخازن وفروع الشركة وتحديد مراكز التوزيع اللوجستية كـ أودو</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-xs">
        
        {/* فورم إضافة مخزن جديد */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-1.5 font-bold text-slate-800 border-b pb-3 mb-4 text-sm">
            <PlusCircle size={16} /> تسجيل مستودع فرعي جديد
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block font-bold text-slate-600 mb-1">اسم المستودع مفرداً *</label>
              <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: مخزن فرع الإسكندرية" className="w-full p-2.5 bg-slate-50 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block font-bold text-slate-600 mb-1">كود المستودع الفريد (Warehouse Code) *</label>
              <div className="relative">
                <Barcode className="absolute right-3 top-3 text-slate-400" size={16} />
                <input type="text" required value={code} onChange={(e) => setCode(e.target.value)} placeholder="مثال: WH-ALEX" className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border rounded-lg text-sm font-mono text-left uppercase" />
              </div>
            </div>
            <div>
              <label className="block font-bold text-slate-600 mb-1">العنوان الجغرافي / الوصف</label>
              <div className="relative">
                <MapPin className="absolute right-3 top-3 text-slate-400" size={16} />
                <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="مثال: شارع كورنيش الإسكندرية، بجوار الفرع" className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border rounded-lg text-sm" />
              </div>
            </div>
            <button type="submit" disabled={loading} className="w-full py-3 bg-slate-950 hover:bg-slate-800 text-white font-bold rounded-xl mt-4 transition-all flex items-center justify-center gap-1.5 text-xs">
              <Save size={14} />
              {loading ? "جاري الحفظ والتدشين..." : "تفعيل وتأسيس المخزن"}
            </button>
          </form>
        </div>

        {/* جدول استعراض المخازن الفعليّة */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                <th className="p-4">كود المخزن</th>
                <th className="p-4">اسم المستودع بالكامل</th>
                <th className="p-4">الموقع الجغرافي</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {warehouses && warehouses.length > 0 ? (
                warehouses.map((wh: any) => (
                  <tr key={wh.id} className="hover:bg-slate-50/40 transition-colors">
                    <td className="p-4 font-mono font-bold text-slate-900">
                      <span className="bg-slate-100 border px-2 py-0.5 rounded text-xs font-black tracking-wide text-slate-700">{wh.code}</span>
                    </td>
                    <td className="p-4 font-semibold text-slate-800 text-sm">{wh.name}</td>
                    <td className="p-4 text-slate-500 font-medium">{wh.location || <span className="text-slate-200">—</span>}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-slate-400 text-xs">جاري جلب المستودعات من قاعدة البيانات...</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
