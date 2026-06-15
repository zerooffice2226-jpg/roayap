// src/app/dashboard/products/inventory-move/page.tsx
"use client"
import React, { useState, useEffect, useRef } from "react"
import { getProducts } from "@/app/actions/product-ops"
import { getWarehousesList } from "@/app/actions/warehouse-ops"
import { applyBulkInventoryAdjustment } from "@/app/actions/stock-adjustment-ops"
import { PackagePlus, Search, ChevronDown, Warehouse, Save, Trash2, CheckCircle2, Layers, Barcode } from "lucide-react"

export default function InventoryAdjustmentPage() {
  const [products, setProducts] = useState<any[]>([])
  const [warehouses, setWarehouses] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  // Warehouse search and selection engine
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("")
  const [warehouseSearch, setWarehouseSearch] = useState("")
  const [isWarehouseDropdownOpen, setIsWarehouseDropdownOpen] = useState(false)
  const warehouseRef = useRef<HTMLDivElement>(null)

  // Product search and selection engine
  const [selectedProductId, setSelectedProductId] = useState("")
  const [productSearch, setProductSearch] = useState("")
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false)
  const productRef = useRef<HTMLDivElement>(null)

  // Input fields and live inventory
  const [countedQty, setCountedQty] = useState<number | "">("")
  const [theoreticalQty, setTheoreticalQty] = useState(0)
  
  // Array for the current inventory batch sheet
  const [inventoryBatch, setInventoryBatch] = useState<any[]>([])

  useEffect(() => {
    getProducts().then(setProducts).catch(() => alert("فشل في الاتصال بجدول المنتجات"));
    getWarehousesList().then(setWarehouses).catch(() => alert("فشل في الاتصال بجدول المستودعات"));

    // 💡 Critical Update: Read and restore the previously saved inventory draft from the browser's memory upon page load
    const savedBatch = localStorage.getItem("erp_active_inventory_batch");
    if (savedBatch) {
      try {
        setInventoryBatch(JSON.parse(savedBatch));
      } catch (e) {
        console.error("Error parsing inventory batch from localStorage", e);
        localStorage.removeItem("erp_active_inventory_batch"); // Clear corrupted data
      }
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (productRef.current && !productRef.current.contains(event.target as Node)) setIsProductDropdownOpen(false);
      if (warehouseRef.current && !warehouseRef.current.contains(event.target as Node)) setIsWarehouseDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch live inventory from the system
  useEffect(() => {
    if (selectedProductId && selectedWarehouseId) {
      const prod = products.find(p => p.id === selectedProductId);
      const stockEntry = prod?.stockBalances?.find((sb: any) => sb.warehouseId === selectedWarehouseId);
      setTheoreticalQty(stockEntry ? stockEntry.quantity : 0);
    } else {
      setTheoreticalQty(0);
    }
  }, [selectedProductId, selectedWarehouseId, products]);

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.sku.includes(productSearch));
  const filteredWarehouses = warehouses.filter(w => w.name.toLowerCase().includes(warehouseSearch.toLowerCase()) || w.code.toLowerCase().includes(warehouseSearch.toLowerCase()));

  // Add an item to the batch and automatically save it to the browser's memory for persistence
  const handleAddToBatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) { alert("يرجى اختيار صنف معتمد أولاً"); return; }
    if (!selectedWarehouseId) { alert("يرجى اختيار المستودع"); return; }
    if (countedQty === "" || countedQty < 0) { alert("يرجى كتابة العدد الجردي الفعلي للرف"); return; }

    const prod = products.find(p => p.id === selectedProductId);
    const wh = warehouses.find(w => w.id === selectedWarehouseId);

    const existingIndex = inventoryBatch.findIndex(item => item.productId === selectedProductId && item.warehouseId === selectedWarehouseId);
    if (existingIndex !== -1) {
      alert("💡 هذا الصنف مدرج مسبقاً في المحضر الحالي لنفس المخزن.");
      return;
    }

    const diff = Number(countedQty) - theoreticalQty;
    const newBatch = [...inventoryBatch, {
      id: Math.random().toString(),
      productId: selectedProductId,
      sku: prod.sku,
      productName: prod.name,
      warehouseId: selectedWarehouseId,
      warehouseName: wh.name,
      theoreticalQty: theoreticalQty,
      countedQty: Number(countedQty),
      difference: diff
    }];

    setInventoryBatch(newBatch);
    // 💡 Instant automatic saving of the draft batch to localStorage
    localStorage.setItem("erp_active_inventory_batch", JSON.stringify(newBatch));

    setSelectedProductId(""); setProductSearch(""); setCountedQty("");
  };

  // Delete a line and update memory
  const handleRemoveFromBatch = (id: string) => {
    const updatedBatch = inventoryBatch.filter(item => item.id !== id);
    setInventoryBatch(updatedBatch);
    localStorage.setItem("erp_active_inventory_batch", JSON.stringify(updatedBatch));
  };

  // 💡 Final posting and adjustment, and clearing persistent memory upon cloud success
  const handleApplyAdjustments = async () => {
    if (inventoryBatch.length === 0) return;
    setLoading(true);
    try {
      await applyBulkInventoryAdjustment(inventoryBatch);
      alert(`🎉 تم بنجاح ترحيل محضر الجرد بالكامل وتصحيح الأرصدة الدفترية في Supabase حياً!`);
      
      // 💡 Clear and clean the browser's persistent memory upon successful official posting
      setInventoryBatch([]);
      localStorage.removeItem("erp_active_inventory_batch");
      
      getProducts().then(setProducts);
    } catch (err: any) {
      alert(err.message || "فشلت عملية ترحيل التسوية المخزنية");
    } finally { setLoading(false); }
  };

  const hasVariance = countedQty !== "" && Number(countedQty) !== theoreticalQty;

  return (
    <div className="p-8 bg-slate-50 min-h-screen font-sans" dir="rtl">
      <div className="flex items-center gap-2 mb-8 border-b pb-4">
        <PackagePlus className="text-slate-900" size={24} />
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">محضر جرد المستودعات والتسويات الجردية</h1>
          <p className="text-slate-500 text-xs mt-0.5">الذاكرة المستمرة مفعّلة: مسودة الجرد محمية ومحفوظة تماماً ضد الريفريش وانقطاع الإنترنت [Sticky Session]</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-xs font-bold">
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-fit">
          <h3 className="text-sm font-black text-slate-800 border-b pb-3 mb-5 flex items-center gap-1.5"><Layers size={16} className="text-slate-400" /> فحص وإدراج صنف</h3>
          <form onSubmit={handleAddToBatch} className="space-y-4">
            
            <div className="relative" ref={warehouseRef}>
              <label className="block text-slate-600 mb-1.5">ابحث واختر المستودع الخاضع للجرد *</label>
              <div className="flex items-center bg-slate-50 border rounded-xl px-3 py-1 text-sm cursor-pointer transition-all focus-within:ring-1 focus-within:ring-slate-950" onClick={() => setIsWarehouseDropdownOpen(true)}>
                <Warehouse size={14} className="text-slate-400 ml-2" />
                <input type="text" placeholder="اكتب اسم أو كود المخزن..." value={warehouseSearch} onChange={(e) => { setWarehouseSearch(e.target.value); setSelectedWarehouseId(""); setIsWarehouseDropdownOpen(true); }} className="w-full bg-transparent p-1.5 text-xs font-bold text-slate-800 focus:outline-none" />
                <ChevronDown size={14} className="text-slate-400" />
              </div>
              {isWarehouseDropdownOpen && (
                <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-40 overflow-y-auto">
                  {filteredWarehouses.map(w => (
                    <div key={w.id} onClick={() => { setSelectedWarehouseId(w.id); setWarehouseSearch(`${w.name} (${w.code})`); setIsWarehouseDropdownOpen(false); }} className="p-2.5 hover:bg-slate-50 cursor-pointer text-slate-700">{w.name} ({w.code})</div>
                  ))}
                </div>
              )}
            </div>

            <div className="relative" ref={productRef}>
              <label className="block text-slate-600 mb-1.5">ابحث واختر صنف البضاعة الحقيقي *</label>
              <div className="flex items-center bg-slate-50 border rounded-xl px-3 py-1 text-sm cursor-pointer transition-all focus-within:ring-1 focus-within:ring-slate-950" onClick={() => setIsProductDropdownOpen(true)}>
                <Search size={14} className="text-slate-400 ml-2" />
                <input type="text" placeholder="اكتب اسم الصنف أو الباركود..." value={productSearch} onChange={(e) => { setProductSearch(e.target.value); setSelectedProductId(""); setIsProductDropdownOpen(true); }} className="w-full bg-transparent p-1.5 text-xs font-bold text-slate-800 focus:outline-none" />
                <ChevronDown size={14} className="text-slate-400" />
              </div>
              {isProductDropdownOpen && (
                <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-40 overflow-y-auto">
                  {filteredProducts.map(p => (
                    <div key={p.id} onClick={() => { setSelectedProductId(p.id); setProductSearch(p.name); setIsProductDropdownOpen(false); }} className="p-2.5 hover:bg-slate-50 cursor-pointer text-slate-700 flex justify-between"><span>{p.name}</span><span className="text-slate-400 font-mono">SKU: {p.sku}</span></div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-slate-500 mb-1">العدد الجاري بالنظام حالياً في قاعدة البيانات</label>
              <div className="w-full p-2.5 bg-slate-100 border text-slate-700 rounded-xl text-center font-mono font-black text-sm cursor-not-allowed shadow-inner">
                {theoreticalQty} وحدة
              </div>
            </div>

            <div>
              <label className="block text-slate-600 mb-1.5">العدد الفعلي الجردي على الرف (Counted) *</label>
              <input 
                type="number" 
                required 
                min="0"
                placeholder="كم قطعة وجدتها في الواقع؟"
                value={countedQty} 
                onChange={(e) => setCountedQty(e.target.value === "" ? "" : parseInt(e.target.value))}
                className={`w-full p-2.5 bg-slate-50 border rounded-xl text-center font-mono text-sm font-black focus:outline-none transition-all ${ hasVariance ? 'border-rose-500 bg-rose-50 text-rose-700 animate-pulse ring-1 ring-rose-500' : 'border-slate-300 focus:ring-1 focus:ring-slate-950' }`}/>
             {hasVariance && (<div className="text-rose-600 text-xs text-center mt-2 flex items-center justify-center gap-1.5 font-bold">⚠️ تباين الجرد: الفرق ({Number(countedQty) - theoreticalQty}) قطعة!</div>)}
            </div>

            <button type="submit" className="w-full bg-slate-900 text-white font-bold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-transform hover:scale-105 disabled:bg-slate-300" disabled={!selectedProductId || !selectedWarehouseId || countedQty === ""}>
              <PackagePlus size={16} />
              إضافة الأصناف للمحضر الجاري
            </button>
          </form>
        </div>

        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center border-b pb-3 mb-5">
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5"><Barcode size={16} className="text-slate-400" /> مسودة محضر الجرد والمطابقة</h3>
                <span className="text-xs text-slate-500 font-bold">عدد الأسطر: {inventoryBatch.length}</span>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                    <thead>
                        <tr className="bg-slate-50 text-slate-500 font-bold">
                            <th className="p-3">كود الصنف</th>
                            <th className="p-3">اسم المنتج</th>
                            <th className="p-3">المستودع</th>
                            <th className="p-3 text-center">العدد الدفتري</th>
                            <th className="p-3 text-center">العدد الواقعي</th>
                            <th className="p-3 text-center">الفرق / التباين</th>
                            <th className="p-3 text-center">إجراء</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {inventoryBatch.length > 0 ? (
                            inventoryBatch.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50/50">
                                    <td className="p-3.5 font-mono">{item.sku}</td>
                                    <td className="p-3.5 font-bold">{item.productName}</td>
                                    <td className="p-3.5">{item.warehouseName}</td>
                                    <td className="p-3.5 text-center font-mono">{item.theoreticalQty}</td>
                                    <td className="p-3.5 text-center font-mono font-bold text-slate-800">{item.countedQty}</td>
                                    <td className={`p-3.5 text-center font-black ${ item.difference === 0 ? "text-slate-400" : item.difference > 0 ? "text-emerald-600" : "text-rose-600" }`}>
                                        {item.difference === 0 ? "مطابق" : item.difference > 0 ? `+${item.difference} (فائض)` : `${item.difference} (عجز)`}
                                    </td>
                                    <td className="p-3.5 text-center">
                                        <button type="button" onClick={() => handleRemoveFromBatch(item.id)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                                            <Trash2 size={14} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={7} className="p-8 text-center text-slate-400">
                                    لا توجد أصناف مدرجة في محضر الجرد حالياً. ابدأ من النموذج الأيمن.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {inventoryBatch.length > 0 && (
                <div className="mt-6 pt-6 border-t flex justify-end">
                    <button
                        onClick={handleApplyAdjustments}
                        disabled={loading}
                        className="bg-slate-900 text-white font-bold py-3 px-6 rounded-lg flex items-center gap-2 transition-transform hover:scale-105 disabled:bg-slate-400">
                        <CheckCircle2 size={16} />
                        {loading ? "جاري الترحيل..." : "اعتماد وترحيل التسوية الجردية"}
                    </button>
                </div>
            )}
        </div>
      </div>
    </div>
  )
}
