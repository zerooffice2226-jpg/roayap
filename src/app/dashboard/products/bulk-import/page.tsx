// src/app/dashboard/products/bulk-import/page.tsx
"use client"
import React, { useState, useEffect } from "react"
import { importProductsBulk } from "@/app/actions/product-bulk-ops"
import { getWarehousesList } from "@/app/actions/warehouse-ops"
import { FileSpreadsheet, Download, UploadCloud, CheckCircle2, AlertTriangle, Layers, Warehouse } from "lucide-react"
import * as XLSX from "xlsx" // تأكد من إخبار المساعد بتثبيت المكتبة: npm i xlsx

export default function BulkImportProductsPage() {
  const [warehouses, setWarehouses] = useState<any[]>([])
  const [warehouseId, setWarehouseId] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  useEffect(() => {
    getWarehousesList().then(setWarehouses).catch(() => {
      setWarehouses([{ id: "w-main", name: "المخزن الرئيسي الافتراضي", code: "WH-MAIN" }]);
    });
  }, []);

  // 💡 1. دالة توليد وتحميل ملف الإكسيل الاسترشادي (Template) بلمسة واحدة
  const downloadTemplate = () => {
    const templateData = [
      { "اسم المنتج (name)": "بلوزة بناتي كود 4000", "الباركود (sku)": "4000", "سعر البيع (salePrice)": 350, "تكلفة الشراء (costPrice)": 250, "الرصيد الافتتاحي (currentStock)": 50 },
      { "اسم المنتج (name)": "جيبة جينز أطفال", "الباركود (sku)": "4001", "سعر البيع (salePrice)": 450, "تكلفة الشراء (costPrice)": 300, "الرصيد الافتتاحي (currentStock)": 0 }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "الأصناف");
    
    // تحميل الملف مباشرة لمتصفح المستخدم
    XLSX.writeFile(workbook, "Odoo_Products_Template.xlsx");
  };

  // 💡 2. دالة قراءة وتحليل ملف الإكسيل المرفوع ومطابقته للسيرفر
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setResult(null);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawData = XLSX.utils.sheet_to_json(worksheet) as any[];

        // خريطة تحويل أسماء الأعمدة العربية للأسماء البرمجية المعتمدة سحابياً
        const mappedItems = rawData.map(row => ({
          name: row["اسم المنتج (name)"],
          sku: String(row["الباركود (sku)"] || ""),
          salePrice: parseFloat(row["سعر البيع (salePrice)"]) || 0,
          costPrice: parseFloat(row["تكلفة الشراء (costPrice)"]) || 0,
          currentStock: parseInt(row["الرصيد الافتتاحي (currentStock)"]) || 0,
        }));

        // إرسال البيانات المجهزة دفعة واحدة للمحرك السحابي
        const res = await importProductsBulk(mappedItems, warehouseId || undefined);
        setResult(res);
        alert(`🎉 تمت العملية بنجاح! تم استيراد ${res.importedCount} صنف وتخطي ${res.skippedCount} صنف مكرر.`);
      } catch (err: any) {
        alert("فشل تحليل الملف، تأكد من مطابقة أعمدة ملف الإكسيل للنموذج الاسترشادي المعتمد.");
      } finally {
        setLoading(false);
        if (e.target) e.target.value = ""; // تصفير حقل الرفع
      }    
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen font-sans" dir="rtl">
      
      {/* الهيدر */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="text-slate-900" size={24} />
            <h1 className="text-2xl font-bold text-slate-900">رفع الأصناف بالجملة عبر الإكسيل</h1>
          </div>
          <p className="text-slate-500 text-xs mt-1">تأسيس وحقن مئات بطاقات المنتجات وتوجيهها المالي والمخزني دفعة واحدة كـ أودو</p>
        </div>

        {/* زر تحميل النموذج الاسترشادي الفاخر */}
        <button 
          onClick={downloadTemplate}
          className="flex items-center gap-2 bg-white border text-slate-700 font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm hover:bg-slate-50 transition-all border-slate-300"
        >
          <Download size={14} className="text-blue-600" />
          تحميل النموذج الاسترشادي (Template)
        </button>
      </div>

      <div className="max-w-2xl mx-auto space-y-6 text-xs">
        
        {/* اختيار مستودع تلقي الأرصدة الافتتاحية إن وجدت */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80">
          <label className="block font-bold text-slate-600 mb-2 flex items-center gap-1">
            <Warehouse size={14} /> مستودع إثبات الأرصدة الافتتاحية للأصناف المرفوعة (اختياري)
          </label>
          <select 
            value={warehouseId} 
            onChange={(e) => setWarehouseId(e.target.value)} 
            className="w-full p-3 bg-slate-50 border rounded-xl text-sm font-semibold text-slate-700 focus:outline-none"
          >
            <option value="">-- بدون رصيد افتتاحي (سيتم الشراء لاحقاً بالفواتير) --</option>
            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name} ({w.code})</option>)}
          </select>
        </div>

        {/* منطقة السحب والإسقاط ورفع ملف الإكسيل الفاخرة */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border-2 border-dashed border-slate-300 hover:border-slate-500 transition-all text-center relative flex flex-col items-center justify-center min-h-[240px] group">
          <input 
            type="file" 
            accept=".xlsx, .xls" 
            disabled={loading}
            onChange={handleFileUpload} 
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" 
          />
          <div className="p-4 bg-slate-50 rounded-2xl text-slate-400 group-hover:text-slate-600 group-hover:bg-slate-100 transition-all mb-4 border shadow-sm">
            <UploadCloud size={36} />
          </div>
          <h3 className="text-sm font-black text-slate-800 mb-1">
            {loading ? "جاري قراءة وتحليل ملف الأصناف..." : "اضغط هنا أو اسحب ملف الإكسيل لرفعه فوراً"}
          </h3>
          <p className="text-slate-400 text-[11px]">يدعم صيغ الـ .xlsx والـ .xls المتوافقة مع هيكلة الجدول المعتمد</p>
        </div>

        {/* كارت عرض النتائج والفرز بعد الرفع الناجح */}
        {result && (
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3 animate-fade-in">
            <div className="flex items-center gap-2 text-emerald-800 font-bold border-b pb-2 text-sm">
              <CheckCircle2 size={16} className="text-emerald-600" /> نتيجة معالجة وحقن الملف السحابي:
            </div>
            <div className="grid grid-cols-2 gap-4 text-center font-mono">
              <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100 text-emerald-700">
                <span className="text-[10px] block font-sans font-bold text-slate-400 mb-0.5">أصناف تم تأسيسها وتوجيهها</span>
                <span className="text-lg font-black">{result.importedCount}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border text-slate-600">
                <span className="text-[10px] block font-sans font-bold text-slate-400 mb-0.5">أصناف تم تخطيها (مكررة الباركود)</span>
                <span className="text-lg font-black">{result.skippedCount}</span>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
