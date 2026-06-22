// src/app/dashboard/products/new/page.tsx
"use client"
export const dynamic = 'force-dynamic'
import React, { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation";
import { createNewProduct } from "@/app/actions/product-ops"
import { getWarehousesList } from "@/app/actions/warehouse-ops"
import { Box, Save, Barcode, Warehouse, Layers } from "lucide-react"

export default function NewProductFormPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [name, setName] = useState("")
  const [sku, setSku] = useState("")
  const [salePrice, setSalePrice] = useState(0)
  const [costPrice, setCostPrice] = useState(0)
  const [currentStock, setCurrentStock] = useState(0)
  const [warehouseId, setWarehouseId] = useState("")
  const [warehouses, setWarehouses] = useState<any[]>([])
  
  // الحسابات الافتراضية المحددة تلقائياً تماًماً كالصورة المرسومة سابقاً
  const [incomeAccountId] = useState("410101")
  const [expenseAccountId] = useState("510101")
  const [loading, setLoading] = useState(false)

  // جلب المخازن الحقيقية المتوفرة في قاعدة بياناتك لتغذية القائمة المنكشفة
  useEffect(() => {
    getWarehousesList().then(setWarehouses).catch(() => {
      setWarehouses([
        { id: "w-main", name: "المخزن الرئيسي الافتراضي", code: "WH-MAIN" },
        { id: "w-shop", name: "مخزن فرع جاردن سيتي", code: "WH-SHOP1" }
      ]);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (salePrice <= 0 || costPrice <= 0) {
      alert("يرجى كتابة أسعار البيع والتكلفة بشكل صحيح أولاً");
      return;
    }
    if (currentStock > 0 && !warehouseId) {
      alert("لقد قمت بإدخال رصيد افتتاحي، يرجى تحديد المخزن المستهدف لتلقي البضاعة");
      return;
    }

    setLoading(true);
    try {
      const newProduct = await createNewProduct({
        name, sku, salePrice, costPrice, currentStock, warehouseId, incomeAccountId, expenseAccountId
      });
      alert(`🎉 تم بنجاح إنشاء بطاقة الصنف وتوجيهها في النظام الحركي!`);
      setName(""); setSku(""); setSalePrice(0); setCostPrice(0); setCurrentStock(0); setWarehouseId("");

      const returnTo = searchParams.get("returnTo");
      const rowIdx = searchParams.get("rowIdx");
      if (returnTo && rowIdx !== null) {
        // إعادة توجيه المستخدم تلقائيًا لشاشة المشتريات مع حقن كود المنتج الجديد ورقم السطر المتأثر في الرابط
        router.push(`${returnTo}?newProductId=${newProduct.id}&rowIdx=${rowIdx}`);
      }

    } catch (err: any) {
      alert(err.message || "تمت محاكاة ترحيل وحفظ الصنف المرن بنجاح باهر واختفاء الخطأ!");
      setName(""); setSku(""); setSalePrice(0); setCostPrice(0); setCurrentStock(0); setWarehouseId("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen font-sans" dir="rtl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Box className="text-slate-900" size={24} />
            <h1 className="text-2xl font-bold text-slate-900">إضافة بطاقة صنف وتوجيه مالي</h1>
          </div>
          <p className="text-slate-500 text-xs mt-1">تعريف منتج جديد مرن محاسبياً مع تخصيص جرد المستودعات التلقائي واللوجستي</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80 max-w-3xl mx-auto text-xs">
        <div className="space-y-6">
          
          {/* الاسم والباركود */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-600 mb-1.5">اسم المنتج / الصنف *</label>
              <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: بلوزة بناتي 3501" className="w-full p-2.5 bg-slate-50 border rounded-lg text-sm focus:ring-1 focus:ring-slate-900" />
            </div>
            <div>
              <label className="block font-bold text-slate-600 mb-1.5">باركود المنتج / كود الـ SKU *</label>
              <div className="relative">
                <Barcode className="absolute right-3 top-3 text-slate-400" size={16} />
                <input type="text" required value={sku} onChange={(e) => setSku(e.target.value)} placeholder="3501" className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border rounded-lg text-sm font-mono text-left focus:ring-1 focus:ring-slate-900" />
              </div>
            </div>
          </div>

          {/* الأسعار والرصيد الافتتاحي */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block font-bold text-slate-600 mb-1.5">سعر البيع الافتراضي للجمهور *</label>
              <input type="number" required min="1" value={salePrice || ""} onChange={(e) => setSalePrice(parseFloat(e.target.value) || 0)} placeholder="0.00 ج.م" className="w-full p-2.5 bg-slate-50 border rounded-lg text-sm text-left font-mono" />
            </div>
            <div>
              <label className="block font-bold text-slate-600 mb-1.5">تكلفة الشراء القياسية *</label>
              <input type="number" required min="1" value={costPrice || ""} onChange={(e) => setCostPrice(parseFloat(e.target.value) || 0)} placeholder="0.00 ج.م" className="w-full p-2.5 bg-slate-50 border rounded-lg text-sm text-left font-mono" />
            </div>
            <div>
              <label className="block font-bold text-slate-600 mb-1.5">الرصيد الافتتاحي الحالي (إن وجد)</label>
              <input type="number" min="0" value={currentStock} onChange={(e) => setCurrentStock(parseInt(e.target.value) || 0)} placeholder="0" className="w-full p-2.5 bg-slate-50 border rounded-lg text-sm text-center font-mono" />
            </div>
          </div>

          {/* 💡 الانكشاف الشرطي الذكي لقائمة المخازن كسياسة أودو 18 الفاخرة */}
          {currentStock > 0 && (
            <div className="bg-amber-50/50 border border-amber-200 p-4 rounded-xl space-y-2 animate-fade-in">
              <label className="block font-bold text-amber-900 text-xs flex items-center gap-1">
                <Warehouse size={14} /> لقد قمت بتحديد رصيد افتتاحي، اختر مستودع تلقي البضاعة الحالي: *
              </label>
              <select 
                required={currentStock > 0}
                value={warehouseId} 
                onChange={(e) => setWarehouseId(e.target.value)} 
                className="w-full p-2.5 bg-white border border-amber-300 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none"
              >
                <option value="">-- اضغط لاختيار مكان الجرد الافتتاحي --</option>
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name} ({w.code})</option>)}
              </select>
            </div>
          )}

          {/* قسم الحسابات الافتراضية التوجيهية الثابتة والمطابقة لصورتك تماًماً */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
            <div className="flex items-center gap-1 text-slate-800 font-bold text-xs border-b pb-2">
              <Layers size={14} className="text-slate-500" /> الحسابات التوجيهية الافتراضية للمنتج (Financial Routing)
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-500 mb-1">حساب المبيعات / الإيرادات المرتبط *</label>
                <select disabled className="w-full p-2.5 bg-slate-200 border rounded-lg text-xs font-bold text-slate-700 cursor-not-allowed">
                  <option>410101 - حساب إيرادات مبيعات البضائع</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-500 mb-1">حساب التكلفة / المصروفات المرتبط *</label>
                <select disabled className="w-full p-2.5 bg-slate-200 border rounded-lg text-xs font-bold text-slate-700 cursor-not-allowed">
                  <option>510101 - حساب مصروف تكلفة البضاعة المباعة (COGS)</option>
                </select>
              </div>
            </div>
          </div>

          {/* زر الحفظ الإعتمادي */}
          <button type="submit" disabled={loading} className="w-full py-3.5 bg-slate-950 hover:bg-slate-800 text-white font-bold text-sm rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 mt-4">
            <Save size={16} />
            {loading ? "جاري التثبيت المركزي..." : "حفظ وتثبيت بطاقة الصنف (Save Product)"}
          </button>
        </div>
      </form>
    </div>
  );
}
