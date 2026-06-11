// src/app/dashboard/invoicing/purchase/page.tsx
"use client"
import React, { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createAndPostPurchaseBill } from "@/app/actions/purchase-ops"
import { getWarehousesList } from "@/app/actions/warehouse-ops"
import { getPartners } from "@/app/actions/partner-ops"
import { getProducts } from "@/app/actions/product-ops"
import { ShoppingCart, Plus, Trash2, Save, Warehouse, Search, UserPlus, ChevronDown, PlusCircle, Download, Upload, Barcode, Printer } from "lucide-react"
import * as XLSX from "xlsx"

export default function NewPurchaseBillPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [partners, setPartners] = useState<any[]>([])
  const [vendorId, setVendorId] = useState("")
  const [vendorSearch, setVendorSearch] = useState("")
  const [isVendorDropdownOpen, setIsVendorDropdownOpen] = useState(false)
  const vendorRef = useRef<HTMLDivElement>(null)

  const todayString = new Date().toISOString().split('T')[0];
  const [dueDate, setDueDate] = useState(todayString);
  const [warehouseId, setWarehouseId] = useState("");
  const [warehouses, setWarehouses] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  
  const [products, setProducts] = useState<any[]>([])
  const [activeRowIndex, setActiveRowIndex] = useState<number | null>(null)
  const [manualQueries, setManualQueries] = useState<{[key: number]: string}>({})
  const productDropdownRef = useRef<HTMLDivElement>(null)

  const [items, setItems] = useState<{ productId: string; sku: string; quantity: number; priceUnit: number; subtotal: number }[]>([
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
      if (savedWh && res.some((w: any) => w.id === savedWh)) {
        setWarehouseId(savedWh);
      }
    });

    getProducts().then(res => {
      setProducts(res);
      const newProdId = searchParams.get("newProductId");
      const targetRow = searchParams.get("rowIdx");
      if (newProdId && targetRow !== null) {
        const idx = parseInt(targetRow);
        const createdProd = res.find((p: any) => p.id === newProdId);
        if (createdProd) {
          handleSelectProduct(idx, createdProd);
        }
      }
    });

    const handleClickOutside = (event: MouseEvent) => {
      if (vendorRef.current && !vendorRef.current.contains(event.target as Node)) setIsVendorDropdownOpen(false);
      if (productDropdownRef.current && !productDropdownRef.current.contains(event.target as Node)) setActiveRowIndex(null);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [searchParams]);

  const handleWarehouseChange = (id: string) => {
    setWarehouseId(id);
    localStorage.setItem("erp_purchase_default_warehouse", id);
  };

  const handleRedirectToCreateVendor = () => {
    router.push("/dashboard/partners?returnTo=/dashboard/invoicing/purchase");
  };

  const handleRedirectToCreateProduct = (rowIndex: number) => {
    router.push(`/dashboard/products/new?returnTo=/dashboard/invoicing/purchase&rowIdx=${rowIndex}`);
  };

  const downloadLinesTemplate = () => {
    const templateData = [
      { "الباركود (sku)": "3501", "الكمية المطلوبة (quantity)": 10, "سعر الشراء الفعلي (priceUnit)": 450 },
      { "الباركود (sku)": "4000", "الكمية المطلوبة (quantity)": 5, "سعر الشراء الفعلي (priceUnit)": 250 }
    ];
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "بنود الفاتورة");
    XLSX.writeFile(workbook, "Purchase_Items_Template.xlsx");
  };

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

        if (rawData.length === 0) { alert("الملف فارغ"); return; }
        const importedItems: any[] = [];

        rawData.forEach((row) => {
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
          }
        });

        if (importedItems.length > 0) {
          setItems(importedItems);
          setManualQueries({}); 
          alert(`🎉 تم بنجاح قراءة وتعبئة الفاتورة بـ ${importedItems.length} صنف وعرض المسميات آلياً!`);
        } else {
          alert("فشل العثور على أصناف مطابقة للباركود في شجرة المنتجات.");
        }
      } catch (err) { alert("خطأ في قراءة ملف الإكسيل."); }
      if (e.target) e.target.value = "";
    };
    reader.readAsBinaryString(file);
  };

  const handleSelectProduct = (index: number, product: any) => {
    const existingRowIndex = items.findIndex((item, idx) => item.productId === product.id && idx !== index);

    if (existingRowIndex !== -1) {
      const updatedItems = [...items];
      updatedItems[existingRowIndex].quantity += updatedItems[index].quantity || 1;
      updatedItems[existingRowIndex].subtotal = updatedItems[existingRowIndex].quantity * updatedItems[existingRowIndex].priceUnit;

      const filteredItems = updatedItems.filter((_, idx) => idx !== index);
      setItems(filteredItems);

      const newQueries = { ...manualQueries };
      delete newQueries[index];
      setManualQueries(newQueries);

      setTimeout(() => { inputRefs.current[existingRowIndex]?.focus(); setActiveRowIndex(existingRowIndex); }, 50);
      alert(`💡 تم دمج الصنف المكرر تلقائياً في السطر رقم ${existingRowIndex + 1}.`);
    } else {
      const updatedItems = [...items];
      updatedItems[index].productId = product.id;
      updatedItems[index].sku = product.sku;
      updatedItems[index].priceUnit = product.costPrice;
      updatedItems[index].subtotal = updatedItems[index].quantity * product.costPrice;
      setItems(updatedItems);
      setManualQueries({ ...manualQueries, [index]: "" });
    }
    setActiveRowIndex(null);
  };

  const handleProductKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    const query = manualQueries[index] || "";
    const filtered = products.filter(p => p.name.toLowerCase().includes(query.toLowerCase()));

    if (e.key === "Enter") {
      e.preventDefault();
      if (filtered.length === 1) handleSelectProduct(index, filtered[0]);
    }
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
    if (field === "quantity" || field === "priceUnit") {
      newItems[index].subtotal = newItems[index].quantity * newItems[index].priceUnit;
    }
    setItems(newItems);
  }

  const removeItemRow = (index: number) => setItems(items.filter((_, i) => i !== index));
  const totalAmount = items.reduce((sum, item) => sum + item.subtotal, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorId) { alert("يرجى اختيار مورد مسجل أولاً"); return; }
    if (!warehouseId) { alert("يرجى اختيار مستودع التوريد"); return; }
    setLoading(true);
    try {
      await createAndPostPurchaseBill({ vendorId, dueDate, warehouseId, items });
      alert("🎉 تم اعتماد الفاتورة وتوريد البضاعة سحابياً! ستفتح الآن شاشة الطباعة الفورية.");
      window.print();
      setItems([{ productId: "", sku: "—", quantity: 1, priceUnit: 0, subtotal: 0 }]); setVendorId(""); setVendorSearch(""); setDueDate(todayString); setManualQueries({});
    } catch {
      window.print();
      setItems([{ productId: "", sku: "—", quantity: 1, priceUnit: 0, subtotal: 0 }]); setVendorId(""); setVendorSearch(""); setDueDate(todayString); setManualQueries({});
    } finally { setLoading(false); }
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen font-sans" dir="rtl">
      
      <div className="print:hidden">
        <div className="flex justify-between items-center mb-8 border-b pb-4">
          <div className="flex items-center gap-2">
            <ShoppingCart className="text-slate-900" size={24} />
            <div>
              <h1 className="text-2xl font-bold text-slate-900">فاتورة مشتريات واردة (Vendor Bill)</h1>
              <p className="text-slate-500 text-xs mt-0.5">منظومة إدخال هجينة محكمة: تعبئة فورية بالإكسيل، تكرار الأسطر بالأسهم، والإنشاء اللحظي للنواقص</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={downloadLinesTemplate} className="flex items-center gap-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg shadow-sm">
              <Download size={14} />
              <span>تحميل نموذج الأصناف (Template)</span>
            </button>
            <label className="flex items-center gap-2 text-xs font-bold bg-green-100 hover:bg-green-200 text-green-800 px-3 py-2 rounded-lg shadow-sm cursor-pointer">
              <Upload size={14} />
              <span>تعبئة البنود من إكسيل (Load Lines)</span>
              <input type="file" onChange={handleExcelImport} className="hidden" accept=".xlsx, .xls" />
            </label>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80 max-w-5xl mx-auto text-xs">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
            <div className="relative" ref={vendorRef}>
              <label className="block font-bold text-slate-600 mb-1.5">ابحث واختر المورد *</label>
              <div className="flex items-center bg-slate-50 border rounded-xl px-3 py-1 text-sm cursor-pointer transition-all" onClick={() => setIsVendorDropdownOpen(true)}>
                <Search size={14} className="text-slate-400 ml-2" />
                <input type="text" placeholder="اكتب اسم المورد للبحث..." value={vendorSearch} onChange={(e) => { setVendorSearch(e.target.value); setVendorId(""); setIsVendorDropdownOpen(true); }} className="w-full bg-transparent p-1.5 text-sm font-semibold text-slate-800 focus:outline-none" />
                <ChevronDown size={14} className="text-slate-400" />
              </div>
              {isVendorDropdownOpen && (
                <div className="absolute z-50 left-0 right-0 mt-1 bg-white border rounded-xl shadow-xl max-h-56 overflow-y-auto">
                  {partners.filter(p => p.name.toLowerCase().includes(vendorSearch.toLowerCase())).length > 0 ? (
                    partners.filter(p => p.name.toLowerCase().includes(vendorSearch.toLowerCase())).map((p) => (
                      <div key={p.id} onClick={() => { setVendorId(p.id); setVendorSearch(p.name); setIsVendorDropdownOpen(false); }} className="p-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer">{p.name}</div>
                    ))
                  ) : (
                    <div className="p-3 text-center text-slate-500 text-xs space-y-2">
                      <p>هذا المورد غير مسجل</p>
                      <button type="button" onClick={handleRedirectToCreateVendor} className="flex items-center gap-1.5 bg-slate-950 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg mx-auto">
                        <UserPlus size={12}/> إضافة وتأسيس المورد الآن
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div>
              <label className="block font-bold text-slate-600 mb-1.5">تاريخ الفاتورة</label>
              <input type="date" disabled value={todayString} className="w-full p-2.5 bg-slate-200 border rounded-xl text-sm text-center font-mono cursor-not-allowed text-slate-500" />
            </div>
            <div>
              <label className="block font-bold text-slate-600 mb-1.5">تاريخ استحقاق سداد المورد *</label>
              <input type="date" required value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full p-2.5 bg-slate-50 border rounded-xl text-sm text-center font-mono" />
            </div>
          </div>

          <div className="bg-blue-50/60 border border-blue-100 p-4 rounded-xl mb-8 space-y-2">
            <label className="block font-black text-blue-900 flex items-center gap-1"><Warehouse size={14} /> مستودع استلام وتوريد البضائع *</label>
            <select required value={warehouseId} onChange={(e) => handleWarehouseChange(e.target.value)} className="w-full p-2.5 bg-white border border-blue-300 rounded-lg text-sm font-bold text-slate-800 focus:outline-none">
              <option value="">-- اضغط لتحديد مستودع الشراء المحفوظ --</option>
              {warehouses.map(w => <option key={w.id} value={w.id}>{w.name} ({w.code})</option>)}
            </select>
          </div>

          <div className="mb-6" ref={productDropdownRef}>
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2"><Barcode size={16}/> أصناف البضائع الموردة في الفاتورة</h3>
            <div className="space-y-3">
                {items.map((item, index) => {
                    const matchedProduct = products.find(p => p.id === item.productId);
                    const displayName = matchedProduct ? matchedProduct.name : (manualQueries[index] || "");
                    const filteredProducts = products.filter(p => p.name.toLowerCase().includes(manualQueries[index]?.toLowerCase() || ""));
                    return (
                        <div key={index} className={`grid grid-cols-12 gap-3 items-center bg-slate-50/50 p-2 rounded-xl border`}>
                            <div className="col-span-1 text-slate-800 font-mono font-semibold bg-slate-100 p-2 rounded-lg text-center h-full flex items-center justify-center">{item.sku}</div>
                            <div className="col-span-12 md:col-span-5 relative">
                                <div className="flex items-center bg-white border rounded-lg px-2.5 py-1.5 cursor-pointer" onClick={() => setActiveRowIndex(index)}>
                                  <input type="text" ref={(el) => (inputRefs.current[index] = el)} placeholder="ابحث عن الصنف واضغط Enter..." value={displayName} onKeyDown={(e) => handleProductKeyDown(e, index)} onChange={(e) => { setManualQueries({ ...manualQueries, [index]: e.target.value }); updateItemField(index, "productId", ""); setActiveRowIndex(index); }} className="w-full bg-transparent text-sm font-bold text-slate-800 focus:outline-none" />
                                </div>
                                {activeRowIndex === index && (
                                  <div className="absolute z-40 w-full mt-1 bg-white border shadow-xl max-h-48 overflow-y-auto">
                                      {filteredProducts.length > 0 ? (
                                        filteredProducts.map((p) => (
                                          <div key={p.id} onClick={() => handleSelectProduct(index, p)} className="p-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer">{p.name} (كود: {p.sku})</div>
                                        ))
                                      ) : (
                                        <div className="p-2.5 text-center text-slate-500 text-xs space-y-2">
                                          <p>هذا الصنف غير مسجل بالدفاتر</p>
                                          <button type="button" onClick={() => handleRedirectToCreateProduct(index)} className="flex items-center gap-1 bg-slate-950 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg mx-auto">
                                            <PlusCircle size={12}/> إضافة وتأسيس الصنف الآن
                                          </button>
                                        </div>
                                      )}
                                  </div>
                                )}
                            </div>
                            <div className="col-span-4 md:col-span-2">
                                <input type="number" min="1" value={item.quantity} onKeyDown={(e) => handleNumberFieldKeyDown(e, index)} onChange={(e) => { const qty = parseInt(e.target.value) || 0; updateItemField(index, "quantity", qty); updateItemField(index, "subtotal", qty * item.priceUnit); }} className="w-full p-2 bg-white border rounded-lg text-center font-mono font-bold text-sm" />
                            </div>
                            <div className="col-span-4 md:col-span-2">
                                <input type="number" min="0" value={item.priceUnit || ""} onKeyDown={(e) => handleNumberFieldKeyDown(e, index)} onChange={(e) => { const prc = parseFloat(e.target.value) || 0; updateItemField(index, "priceUnit", prc); updateItemField(index, "subtotal", item.quantity * prc); }} className="w-full p-2 bg-white border rounded-lg text-left font-mono font-bold text-sm" />
                            </div>
                            <div className="col-span-3 md:col-span-1 text-left font-mono font-bold self-center">{item.subtotal.toLocaleString()} ج.م</div>
                            <div className="col-span-1 self-center">{items.length > 1 && (<button type="button" onClick={() => removeItemRow(index)} className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg"><Trash2 size={16}/></button>)}</div>
                        </div>
                    );
                })}
            </div>
            <button type="button" onClick={() => setItems([...items, { productId: "", sku: "—", quantity: 1, priceUnit: 0, subtotal: 0 }])} className="flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg mt-4 shadow-sm"><Plus size={14} /> إضافة صنف توريد إضافي يدوياً</button>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center pt-6 border-t mt-8">
          <div><span className="text-slate-500 font-semibold">إجمالي فاتورة المشتريات الجاري</span><h2 className="text-2xl font-black font-mono text-slate-900">{totalAmount.toLocaleString()} ج.م</h2></div>
          <button type="submit" disabled={loading} className="bg-slate-950 text-white font-bold text-sm px-6 py-3 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"><Printer size={16} />{loading ? "جاري الحفظ والتوريد..." : "حفظ وطباعة الفاتورة الفورية (Save & Print)"}</button>
        </div>
        </form>
      </div>

      <div className="hidden print:block w-full text-right p-6 font-sans text-xs text-black" style={{ direction: 'rtl' }}>
          <div className="text-center mb-8">
              <h1 className="text-lg font-bold">شركة منظومة أودو المتكاملة لـ ERP</h1>
              <p className="text-xs">المنطقة الصناعية، المقر الرئيسي للشركة</p>
              <p className="text-xs">الرقم الضريبي: XXX-XXX-XXX</p>
          </div>
          <div className="text-center my-8">
              <h2 className="font-bold border-y-2 border-black py-2 inline-block px-8">إذن توريد وفاتورة مشتريات مورد</h2>
              <p className="font-mono mt-2">التاريخ: {todayString}</p>
              <p className="font-mono mt-1 font-bold">حالة المستند: معتمد ومورّد للمخزن (POSTED)</p>
          </div>

          <div className="border-y py-4 my-8">
            <p><span className="font-bold">السيد المورد / شركة الشحن:</span> {vendorSearch || "مورد خارجي معتمد"}</p>
            <p><span className="font-bold">مستودع الاستلام وتلقي الشحنة:</span> المخزن المعين بأمر التوريد</p>
          </div>

          <table className="w-full text-right mb-8 text-xs">
              <thead className="bg-black text-white">
                  <tr>
                      <th className="p-2 text-right">الباركود</th>
                      <th className="p-2 text-right">اسم المنتج / الصنف المورّد</th>
                      <th className="p-2 text-center">الكمية الواردة</th>
                      <th className="p-2 text-center">تكلفة الوحدة</th>
                      <th className="p-2 text-left">الإجمالي الفرعي</th>
                  </tr>
              </thead>
              <tbody>
                  {items.map((item, idx) => {
                    const prod = products.find(p => p.id === item.productId);
                    return (
                      <tr key={idx} className="border-b">
                          <td className="p-2 font-mono">{item.sku}</td>
                          <td className="p-2 font-bold">{prod ? prod.name : "صنف مشتريات"}</td>
                          <td className="p-2 text-center font-mono">{item.quantity}</td>
                          <td className="p-2 text-center font-mono">{item.priceUnit.toLocaleString()} ج.م</td>
                          <td className="p-2 text-left font-mono font-bold">{item.subtotal.toLocaleString()} ج.م</td>
                      </tr>
                    );
                  })}
              </tbody>
          </table>

          <div className="flex justify-between items-start mt-10">
            <div className="text-xs space-y-10">
              <p>توقيع مأمور המشتريات: ............................</p>
              <p>توقيع أمين المستودع المستلم: ............................</p>
            </div>
            <div className="text-left w-1/3 space-y-2">
              <div className="flex justify-between"><span className="font-bold">المجموع الصافي الفرعي:</span> <span className="font-mono">{totalAmount.toLocaleString()} ج.م</span></div>
              <div className="flex justify-between font-bold text-sm border-t pt-2 mt-2"><span className="font-bold">إجمالي الالتزامات المالية المثبتة للمورد:</span> <span className="font-mono font-black text-base">{totalAmount.toLocaleString()} ج.م</span></div>
            </div>
          </div>
      </div>

      <style jsx global>{`
        @media print {
          html, body {
            height: auto !important;
            overflow: visible !important;
            background: white !important;
            color: black !important;
          }
          .print\:hidden, aside, button, nav, form, header, .p-8 {
            display: none !important;
          }
          .hidden.print\:block {
            display: block !important;
            visibility: visible !important;
          }
        }
      `}</style>
    </div>
  );
}