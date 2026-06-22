// src/app/dashboard/invoicing/purchase/page.tsx
"use client"
export const dynamic = 'force-dynamic'
import React, { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createAndPostPurchaseBill, getBillByNumber, deleteBillByNumber } from "@/app/actions/purchase-ops"
import { getWarehousesList } from "@/app/actions/warehouse-ops"
import { getPartners } from "@/app/actions/partner-ops"
import { getProducts } from "@/app/actions/product-ops"
import { ShoppingCart, Plus, Trash2, Warehouse, Search, UserPlus, ChevronDown, PlusCircle, Barcode, Printer, Copy, Edit3, Upload, Download } from "lucide-react"
import * as XLSX from "xlsx"

export default function NewPurchaseBillPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isViewMode = searchParams.get("viewBill") 

  // 1. الموردين والمستودعات
  const [partners, setPartners] = useState<any[]>([])
  const [vendorId, setVendorId] = useState("")
  const [vendorSearch, setVendorSearch] = useState("")
  const [isVendorDropdownOpen, setIsVendorDropdownOpen] = useState(false)
  const vendorRef = useRef<HTMLDivElement>(null)

  const todayString = new Date().toISOString().split('T')[0];
  const [dueDate, setDueDate] = useState(todayString) 
  const [warehouseId, setWarehouseId] = useState("")
  const [warehouses, setWarehouses] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [isEditable, setIsEditable] = useState(false) 
  
  // 2. المنتجات والبحث داخل السطور
  const [products, setProducts] = useState<any[]>([])
  const [activeRowIndex, setActiveRowIndex] = useState<number | null>(null)
  const [manualQueries, setManualQueries] = useState<{[key: number]: string}>({})
  const productDropdownRef = useRef<HTMLDivElement>(null)

  const [items, setItems] = useState<any[]>([
    { productId: "", sku: "—", quantity: 1, priceUnit: 0, subtotal: 0 }
  ])
  const inputRefs = useRef<any[]>([])

  useEffect(() => {
    getPartners().then(res => {
      const vendorsOnly = res.filter((p: any) => p.type === "VENDOR" || p.type === "BOTH");
      setPartners(vendorsOnly);
      
      const newVendId = searchParams.get("newVendorId");
      if (newVendId) {
        setVendorId(newVendId);
        const createdVendor = vendorsOnly.find((v: any) => v.id === newVendId);
        if (createdVendor) setVendorSearch(createdVendor.name);
      }
    });

    getWarehousesList().then(res => {
      setWarehouses(res);
      const savedWh = localStorage.getItem("erp_purchase_default_warehouse");
      if (savedWh && res.some((w: any) => w.id === savedWh)) setWarehouseId(savedWh);
    });

    getProducts().then(res => {
      setProducts(res);
      const newProdId = searchParams.get("newProductId");
      const targetRow = searchParams.get("rowIdx");
      if (newProdId && targetRow !== null) {
        const idx = parseInt(targetRow);
        const createdProd = res.find((p: any) => p.id === newProdId);
        if (createdProd) handleSelectProduct(idx, createdProd);
      }
    });

    const viewBill = searchParams.get("viewBill");
    if (viewBill) {
      getBillByNumber(viewBill).then(bill => {
        if (bill && bill.lines) {
          setVendorId(bill.partnerId);
          setVendorSearch(bill.partner?.name || "");
          setDueDate(bill.dueDate.toISOString().split('T')[0]);
          
          // 💡 الحل القاطع لتجاوز اعتراض التايب سكريبت ومزامنة المستودع بالسطر 79
          setWarehouseId((bill as any).lines?.[0]?.product?.stockBalances?.[0]?.warehouseId || (bill as any).warehouseId || "");
          
          setItems(bill.lines.map((line: any) => ({ productId: line.productId, sku: line.product?.sku || "—", quantity: line.quantity, priceUnit: line.priceUnit, subtotal: line.subtotal })));
          const q: any = {}; bill.lines.forEach((l: any, i: number) => { q[i] = l.product?.name || ""; }); setManualQueries(q);
        }
      });
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (vendorRef.current && !vendorRef.current.contains(event.target as Node)) setIsVendorDropdownOpen(false);
      if (productDropdownRef.current && !productDropdownRef.current.contains(event.target as Node)) setActiveRowIndex(null);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [searchParams]);

    // 💡 دالة تحميل نموذج أسطر المشتريات الجاهز
    const downloadLinesTemplate = () => {
        const templateData = [
          { "الباركود (sku)": "3501", "الكمية المطلوبة (quantity)": 10, "سعر الشراء الفعلي (priceUnit)": 450 }
        ];
        const worksheet = XLSX.utils.json_to_sheet(templateData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "بنود الفاتورة");
        XLSX.writeFile(workbook, "Purchase_Items_Template.xlsx");
      };
    
      // 💡 محرك قراءة الإكسيل وحقن الأصناف النواقص آلياً في الجدول بالأسماء
      const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
    
        const reader = new FileReader();
        reader.onload = (evt) => {
          try {
            const bstr = evt.target?.result;
            const workbook = XLSX.read(bstr, { type: "binary" });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const rawData = XLSX.utils.sheet_to_json(worksheet) as any[];
    
            if (rawData.length === 0) { alert("ملف الإكسيل فارغ"); return; }
            const importedItems: any[] = [];
            const loadedQueries: any = {};
    
            rawData.forEach((row, idx) => {
              const barcode = String(row["الباركود (sku)"] || row["الباركود"] || row["sku"] || "").trim();
              const qty = parseInt(row["الكمية المطلوبة (quantity)"] || row["الكمية"] || row["quantity"]) || 1;
              const price = parseFloat(row["سعر الشراء الفعلي (priceUnit)"] || row["السعر"] || row["priceUnit"]) || 0;
    
              const matchedProd = products.find(p => p.sku === barcode);
              if (matchedProd) {
                importedItems.push({
                  productId: matchedProd.id,
                  sku: matchedProd.sku,
                  quantity: qty,
                  priceUnit: price || matchedProd.costPrice,
                  subtotal: qty * (price || matchedProd.costPrice)
                });
                loadedQueries[idx] = matchedProd.name;
              }
            });
    
            if (importedItems.length > 0) {
              setItems(importedItems);
              setManualQueries(loadedQueries);
              alert(`🎉 نجح الرفع! تم تعبئة الفاتورة بـ ${importedItems.length} صنف حياً.`);
            } else {
              alert("فشل العثور على باركود مطابق في قاعدة البيانات.");
            }
          } catch { alert("خطأ في قراءة وتحليل ملف الإكسيل."); }
          if (e.target) e.target.value = "";
        };
        reader.readAsBinaryString(file);
      };

  // 💡 التعديل القاطع: التوجيه للمسار الحقيقي الحركي المعتمد في نظامك
  const handleRedirectToCreateVendor = () => {
    router.push("/dashboard/partners?returnTo=/dashboard/invoicing/purchase");
  };

  const handleRedirectToCreateProduct = (rowIndex: number) => {
    router.push(`/dashboard/products/new?returnTo=/dashboard/invoicing/purchase&rowIdx=${rowIndex}`);
  };

  const handleWarehouseChange = (id: string) => { setWarehouseId(id); localStorage.setItem("erp_purchase_default_warehouse", id); };
  const handleDuplicateBill = () => { if (window.confirm("نسخ الفاتورة؟")) { setVendorId(""); setVendorSearch(""); router.push("/dashboard/invoicing/purchase"); } };
  const handleEnableEdit = () => { if (window.confirm("تعديل مستند معتمد؟")) setIsEditable(true); };

  const handleCancelAndDelete = async () => {
    const viewBill = searchParams.get("viewBill");
    if (viewBill && window.confirm("إلغاء وحذف نهائي؟")) {
      setLoading(true);
      try { await deleteBillByNumber(viewBill); alert("🎉 تم الحذف!"); router.push("/dashboard/products/ledger"); } catch { router.push("/dashboard/products/ledger"); } finally { setLoading(false); }
    }
  };

  const handleSelectProduct = (index: number, product: any) => {
    const existingRowIndex = items.findIndex((item, idx) => item.productId === product.id && idx !== index);
    if (existingRowIndex !== -1) {
      const updatedItems = [...items];
      updatedItems[existingRowIndex].quantity += updatedItems[index].quantity || 1;
      updatedItems[existingRowIndex].subtotal = updatedItems[existingRowIndex].quantity * updatedItems[existingRowIndex].priceUnit;
      setItems(updatedItems.filter((_, idx) => idx !== index));
      alert(`💡 تم دمج الصنف المكرر تلقائياً.`);
    } else {
      const updatedItems = [...items];
      updatedItems[index].productId = product.id;
      updatedItems[index].sku = product.sku;
      updatedItems[index].priceUnit = product.costPrice;
      updatedItems[index].subtotal = updatedItems[index].quantity * product.costPrice;
      setItems(updatedItems);
      setManualQueries({ ...manualQueries, [index]: product.name });
    }
    setActiveRowIndex(null);
  };

  const handleProductKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    const query = manualQueries[index] || "";
    const filtered = products.filter(p => p.name.toLowerCase().includes(query.toLowerCase()) || p.sku.includes(query));
    if (e.key === "Enter" && filtered.length === 1) { e.preventDefault(); handleSelectProduct(index, filtered[0]); }
    if (e.key === "ArrowDown" && items[index].productId && index === items.length - 1) {
      e.preventDefault();
      setItems([...items, { productId: "", sku: "—", quantity: 1, priceUnit: 0, subtotal: 0 }]);
      setTimeout(() => { inputRefs.current[index + 1]?.focus(); setActiveRowIndex(index + 1); }, 60);
    }
  };

  const handleNumberFieldKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (e.key === "ArrowDown" && items[index].productId && index === items.length - 1) {
        setItems([...items, { productId: "", sku: "—", quantity: 1, priceUnit: 0, subtotal: 0 }]);
        setTimeout(() => { inputRefs.current[index + 1]?.focus(); setActiveRowIndex(index + 1); }, 60);
      }
    }
  };

  const updateItemField = (index: number, field: string, value: any) => {
    const newItems = [...items] as any;
    newItems[index][field] = value;
    if (field === "quantity" || field === "priceUnit") newItems[index].subtotal = newItems[index].quantity * newItems[index].priceUnit;
    setItems(newItems);
  }

  const removeItemRow = (index: number) => setItems(items.filter((_, i) => i !== index));
  const totalAmount = items.reduce((sum, item) => sum + item.subtotal, 0);
  const isFieldsFrozen = !!isViewMode && !isEditable;

  // 💡 منقح ومفلتر بحث الموردين المنضبط مئة بالمئة لمنع اللخبطة
  const filteredVendors = partners.filter(p => 
    p.name.toLowerCase().includes(vendorSearch.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorId) { alert("اختر موردًا مسجلًا"); return; }
    setLoading(true);
    try {
      await createAndPostPurchaseBill({ partnerId: vendorId, dueDate, warehouseId, items, existingNumber: isEditable ? searchParams.get("viewBill") : undefined });
      alert("🎉 تم حفظ واعتماد الفاتورة وتحديث المخزون بنجاح كامل!");
      window.print();
      router.push("/dashboard/products/ledger");
    } catch (err: any) {
      console.error("❌ انهيار ترحيل المشتريات سحابياً:", err);
      alert(`فشل الحفظ: ${err.message || "خطأ تعارض الحقول بالـ Schema"}`);
      setLoading(false);
    }
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen font-sans" dir="rtl">
      
      <div id="erp-web-view" className="print:hidden">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 border-b pb-4">
          <div className="flex items-center gap-2">
            <ShoppingCart size={24} />
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                {isViewMode ? `معاينة فاتورة مشتريات: ${searchParams.get("viewBill")}` : "إنشاء فاتورة مشتريات واردة"}
              </h1>
              <p className="text-slate-500 text-xs mt-0.5">{isFieldsFrozen ? "🔒 وضع التجميد نشط" : "✍️ وضع الإدخال السريع نشط: Enter للاختيار، و (↓) لسطر جديد"}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-xs font-bold mr-auto">
            {!isViewMode && (
                <>
                <button 
                    type="button" 
                    onClick={downloadLinesTemplate} 
                    className="flex items-center gap-1.5 bg-white border border-slate-300 text-slate-700 px-3 py-2 rounded-xl shadow-sm hover:bg-slate-50 transition-all cursor-pointer"
                >
                    <Download size={13} className="text-blue-600" /> تحميل نموذج الأصناف
                </button>
                <div className="relative bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-xl shadow-md cursor-pointer transition-all flex items-center gap-1.5 overflow-hidden font-bold">
                    <Upload size={13} /> <span>تعبئة البنود من إكسيل</span>
                    <input type="file" accept=".xlsx, .xls" onChange={handleExcelImport} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                </div>
                </>
            )}
            </div>

          {isViewMode && (
            <div className="flex gap-2 text-xs font-bold">
              <button type="button" onClick={handleDuplicateBill} className="flex items-center gap-1 bg-white border p-2.5 rounded-xl shadow-sm"><Copy size={13} /> نسخ (Duplicate)</button>
<button type="button" onClick={handleEnableEdit} className="flex items-center gap-1 bg-white border p-2.5 rounded-xl shadow-sm"><Edit3 size={13} /> تعديل (Edit)</button>
<button type="button" onClick={handleCancelAndDelete} className="flex items-center gap-1 bg-rose-50 text-rose-700 border p-2.5 rounded-xl shadow-sm"><Trash2 size={13} /> إلغاء وحذف</button>
</div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80 text-xs max-w-5xl mx-auto">
          {/* 💡 بداية جزء الهيدر المصلح والمحمي هندسياً من التداخل البصري */}
<div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start mb-6">
  
  {/* 1. حقل بحث وتأسيس المورد المعزول في طبقة Z-index مستقلة لتفتح القائمة للأسفل بحرية */}
  <div className="relative z-30" ref={vendorRef}>
    <label className="block font-bold text-slate-600 mb-1.5">ابحث واختر المورد *</label>
    <div 
      className="flex items-center bg-slate-50 border rounded-xl px-3 py-2 text-sm cursor-pointer focus-within:ring-2 focus-within:ring-slate-950 transition-all" 
      onClick={() => !isFieldsFrozen && setIsVendorDropdownOpen(true)}
    >
      <Search size={14} className="text-slate-400 ml-2" />
      <input 
        type="text" 
        disabled={isFieldsFrozen} 
        placeholder="اكتب اسم المورد للبحث..." 
        value={vendorSearch} 
        onChange={(e) => { setVendorSearch(e.target.value); setVendorId(""); setIsVendorDropdownOpen(true); }} 
        className="w-full bg-transparent p-0.5 text-xs font-bold text-slate-800 focus:outline-none disabled:cursor-not-allowed" 
      />
      <ChevronDown size={14} className="text-slate-400 mr-auto" />
    </div>
    
    {isVendorDropdownOpen && !isFieldsFrozen && (
      <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-40 overflow-y-auto divide-y divide-slate-100">
        {filteredVendors.length > 0 ? (
          filteredVendors.map(p => (
            <div 
              key={p.id} 
              onClick={() => { setVendorId(p.id); setVendorSearch(p.name); setIsVendorDropdownOpen(false); }} 
              className="p-2.5 hover:bg-slate-50 cursor-pointer font-bold text-slate-700 text-xs transition-colors"
            >
              {p.name}
            </div>
          ))
        ) : (
          <div className="p-4 text-center space-y-2 bg-white rounded-xl">
            <p className="text-[11px] font-bold text-slate-400">هذا المورد غير مسجل بالدفاتر</p>
            <button 
              type="button" 
              onClick={handleRedirectToCreateVendor} 
              className="bg-slate-950 text-white px-3 py-2 rounded-xl font-bold mx-auto text-[10px] flex items-center gap-1 shadow-md hover:bg-purple-600 transition-all cursor-pointer"
            >
              <UserPlus size={12}/> إضافة وتأسيس المورد الآن
            </button>
          </div>
        )}
      </div>
    )}
  </div>

  {/* 2. تاريخ الفاتورة المقفل */}
  <div>
    <label className="block font-bold text-slate-600 mb-1.5">تاريخ الفاتورة</label>
    <input 
      type="text" 
      disabled 
      value={todayString} 
      className="w-full p-2.5 bg-slate-100 border text-slate-500 rounded-xl text-center font-mono font-bold cursor-not-allowed shadow-inner" 
    />
  </div>

  {/* 3. تاريخ الاستحقاق المفتوح للتعديل */}
  <div>
    <label className="block font-bold text-slate-600 mb-1.5">تاريخ استحقاق سداد المورد *</label>
    <input 
      type="date" 
      required 
      disabled={isFieldsFrozen} 
      value={dueDate} 
      onChange={(e) => setDueDate(e.target.value)} 
      className="w-full p-2.5 bg-slate-50 border rounded-xl text-center font-mono font-bold text-slate-800 disabled:bg-slate-100 disabled:cursor-not-allowed focus:ring-1 focus:ring-slate-950" 
    />
  </div>

</div>
{/* 💡 نهاية جزء الهيدر المصلح */}
          <div className="bg-blue-50/60 border border-blue-100 p-4 rounded-xl mb-8 space-y-2">
            <label className="block font-black text-blue-900 flex items-center gap-1"><Warehouse size={14} /> مستودع استلام الشحنة الواردة *</label>
            <select required disabled={isFieldsFrozen} value={warehouseId} onChange={(e) => handleWarehouseChange(e.target.value)} className="w-full p-2.5 bg-white border border-blue-300 rounded-lg text-sm font-bold text-slate-800 focus:outline-none disabled:bg-slate-100 disabled:cursor-not-allowed"><option value="">-- اضغط لتحديد المخزن الافتراضي للمشتريات --</option>{warehouses.map(w => <option key={w.id} value={w.id}>{w.name} ({w.code})</option>)}
            </select>
            </div>

          <div className="mb-6" ref={productDropdownRef}>
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2"><Barcode size={16}/> بنود وأصناف فاتورة المشتريات</h3>
            <div className="space-y-3">
                {items.map((item, index) => {
                    const matchedProduct = products.find(p => p.id === item.productId);
                    const displayName = matchedProduct ? matchedProduct.name : (manualQueries[index] || "");
                    const filteredProducts = products.filter(p => p.name.toLowerCase().includes(manualQueries[index]?.toLowerCase() || ""));
                    return (
                        <div key={index} className="grid grid-cols-12 gap-3 items-center bg-slate-50/50 p-2 rounded-xl border">
                            <div className="col-span-1 text-slate-800 font-mono font-semibold bg-slate-100 p-2 rounded-lg text-center h-full flex items-center justify-center">{item.sku}</div>
                            <div className="col-span-12 md:col-span-5 relative">
<input type="text" ref={(el) => { inputRefs.current[index] = el; }} disabled={isFieldsFrozen} placeholder="ابحث عن الصنف واضغط Enter أو سهم لأسفل..." value={displayName} onKeyDown={(e) => handleProductKeyDown(e, index)} onChange={(e) => { setManualQueries({ ...manualQueries, [index]: e.target.value }); updateItemField(index, "productId", ""); setActiveRowIndex(index); }} className="w-full bg-white border rounded-lg p-2 text-sm font-bold text-slate-800 focus:outline-none disabled:bg-slate-100 disabled:cursor-not-allowed" />
{activeRowIndex === index && !isFieldsFrozen && (<div className="absolute z-40 w-full mt-1 bg-white border shadow-xl max-h-48 overflow-y-auto">
  {filteredProducts.length > 0 ? (
    filteredProducts.map(p => <div key={p.id} onClick={() => handleSelectProduct(index, p)} className="p-2 hover:bg-slate-50 cursor-pointer font-bold">{p.name} (كود: {p.sku})</div>)
  ) : (
    <div className="p-4 text-center text-slate-500 space-y-2">
      <p>الصنف غير مسجل</p>
      <button type="button" onClick={() => handleRedirectToCreateProduct(index)} className="flex items-center gap-1 bg-slate-950 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg mx-auto">
        <PlusCircle size={12}/> إضافة الصنف الآن
      </button>
    </div>
  )}
</div>)}
                            </div>
                            <div className="col-span-4 md:col-span-2">
                                <input type="number" min="1" disabled={isFieldsFrozen} value={item.quantity} onKeyDown={(e) => handleNumberFieldKeyDown(e, index)} onChange={(e) => { const qty = parseInt(e.target.value) || 0; updateItemField(index, "quantity", qty); updateItemField(index, "subtotal", qty * item.priceUnit); }} className="w-full p-2 bg-white border rounded-lg text-center font-mono font-bold disabled:bg-slate-100" />
                            </div>
                            <div className="col-span-4 md:col-span-2">
                                <input type="number" min="0" disabled={isFieldsFrozen} value={item.priceUnit || ""} onKeyDown={(e) => handleNumberFieldKeyDown(e, index)} onChange={(e) => { const prc = parseFloat(e.target.value) || 0; updateItemField(index, "priceUnit", prc); updateItemField(index, "subtotal", item.quantity * prc); }} className="w-full p-2 bg-white border rounded-lg text-left font-mono font-bold disabled:bg-slate-100" />
                            </div>
                            <div className="col-span-3 md:col-span-1 text-left font-mono font-bold self-center">{item.subtotal.toLocaleString()} ج.م</div>
                            <div className="col-span-1 self-center">
                                {!isFieldsFrozen && items.length > 1 && <button type="button" onClick={() => removeItemRow(index)} className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg"><Trash2 size={16}/></button>}
                            </div>
                        </div>
                    );
                })}
            </div>
            {!isFieldsFrozen && <button type="button" onClick={() => setItems([...items, { productId: "", sku: "—", quantity: 1, priceUnit: 0, subtotal: 0 }])} className="flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg mt-4 shadow-sm"><Plus size={14} /> إضافة سطر صنف توريد</button>}
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center pt-6 border-t mt-8">
          <div>
              <span className="text-slate-500 font-semibold">إجمالي فاتورة المشتريات</span>
              <h2 className="text-2xl font-black font-mono text-slate-900">{totalAmount.toLocaleString()} ج.م</h2>
              </div>
            {!isFieldsFrozen &&  <button type="submit" disabled={loading} className="bg-slate-950 text-white font-bold text-sm px-6 py-3 rounded-xl shadow-lg flex items-center justify-center gap-2 hover:bg-slate-800 disabled:bg-slate-400">
                 حفظ وطباعة الفاتورة الفورية (Save & Print)
                </button>}
            {isFieldsFrozen && <button type="button" onClick={() => window.print()} className="flex items-center gap-2 bg-blue-600 text-white font-bold text-sm px-6 py-3 rounded-xl shadow-md">
                 طباعة نسخة الفاتورة الحالية
                 </button>}
          </div>
        </form>
      </div>

      <div id="erp-invoice-print-sheet" className="hidden print:block w-full text-right p-10 font-sans text-xs" style={{direction: 'rtl'}}>
          <div className="text-center mb-12">
              <h1 className="text-xl font-bold">إذن توريد وفاتورة مشتريات</h1>
              <p className="text-mono text-xs mt-1">التاريخ: {todayString}</p>
          </div>
          
          <div className="border-y py-4 my-8 text-sm">
            <p><span className="font-bold">السيد المورد الشريك:</span> {vendorSearch || "مورد خارجي معتمد"}</p>
          </div>

          <table className="w-full text-right mb-8 text-sm">
              <thead className="bg-black text-white">
                  <tr>
                      <th className="p-3 text-right">الباركود</th>
                      <th className="p-3 text-right">اسم الصنف المورّد</th>
                      <th className="p-3 text-center">الكمية الواردة</th>
                      <th className="p-3 text-center">تكلفة الوحدة</th>
                      <th className="p-3 text-left">الإجمالي</th>
                  </tr>
              </thead>
              <tbody>
                  {items.map((item, idx) => { const prod = products.find(p => p.id === item.productId); return (
                      <tr key={idx} className="border-b">
                          <td className="p-3 font-mono">{item.sku}</td>
                          <td className="p-3 font-bold">{prod ? prod.name : "صنف مشتريات"}</td>
                          <td className="p-3 text-center font-mono">{item.quantity}</td>
                          <td className="p-3 text-center font-mono">{item.priceUnit.toLocaleString()} ج.م</td>
                          <td className="p-3 text-left font-mono font-bold">{item.subtotal.toLocaleString()} ج.م</td>
                      </tr>
                  ); })}
              </tbody>
          </table>

          <div className="flex justify-between items-start mt-12">
            <div className="text-sm space-y-12">
              <p>توقيع مأمور المأمور: ............................</p>
            </div>
            <div className="text-left w-1/3 space-y-2">
              <div className="flex justify-between font-bold text-lg border-t-2 border-black pt-2 mt-2">
                  <span>إجمالي التزامات المورد النهائية:</span> 
                  <span className="font-mono font-black">{totalAmount.toLocaleString()} ج.م</span>
              </div>
            </div>
          </div>
      </div>
      
      <style jsx global>{`
        @media print { 
            html, body { 
                color-scheme: light !important; 
                background-color: #ffffff !important; 
                color: #000000 !important; 
                height: auto !important; 
                overflow: visible !important; 
            } 
            #erp-web-view, .print\:hidden, aside, button, nav, form, header, main, .p-8 { 
                display: none !important; 
                visibility: hidden !important; 
            } 
            #erp-invoice-print-sheet { 
                display: block !important; 
                visibility: visible !important; 
                position: absolute !important; 
                left: 0 !important; top: 0 !important; 
                width: 100% !important; 
                background-color: #ffffff !important; 
                color: #000000 !important; 
            } 
            #erp-invoice-print-sheet *, 
            #erp-invoice-print-sheet td, 
            #erp-invoice-print-sheet th, 
            #erp-invoice-print-sheet h1, 
            #erp-invoice-print-sheet h2, 
            #erp-invoice-print-sheet h3, 
            #erp-invoice-print-sheet p, 
            #erp-invoice-print-sheet span { 
                color: #000000 !important; 
                background: transparent !important; 
            } 
            #erp-invoice-print-sheet table, 
            #erp-invoice-print-sheet th, 
            #erp-invoice-print-sheet td { 
                border-color: #000000 !important; 
            } 
        }
      `}</style>
    </div>
  );
}
