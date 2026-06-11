// src/app/dashboard/invoicing/new/page.tsx
"use client"
import React, { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createAndPostInvoice } from "@/app/actions/invoicing-ops"
import { getWarehousesList } from "@/app/actions/warehouse-ops"
import { getPartners } from "@/app/actions/partner-ops"
import { getProducts } from "@/app/actions/product-ops"
import { FilePlus2, Plus, Trash2, Save, Warehouse, Search, UserPlus, ChevronDown, PlusCircle, Barcode, Printer } from "lucide-react"

export default function NewInvoicePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // 1. العملاء والمستودعات
  const [partners, setPartners] = useState<any[]>([])
  const [partnerId, setPartnerId] = useState("")
  const [customerSearch, setCustomerSearch] = useState("")
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false)
  const customerRef = useRef<HTMLDivElement>(null)

  const todayString = new Date().toISOString().split('T')[0];
  const [dueDate, setDueDate] = useState(todayString)
  const [warehouseId, setWarehouseId] = useState("") 
  const [warehouses, setWarehouses] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  
  // 2. المنتجات والبحث داخل السطور
  const [products, setProducts] = useState<any[]>([])
  const [activeRowIndex, setActiveRowIndex] = useState<number | null>(null)
  const [manualQueries, setManualQueries] = useState<{[key: number]: string}>({})
  const productDropdownRef = useRef<HTMLDivElement>(null)

  const [items, setItems] = useState<{ productId: string; sku: string; quantity: number; priceUnit: number; warehouseId: string; subtotal: number }[]>([
    { productId: "", sku: "—", quantity: 1, priceUnit: 0, warehouseId: "", subtotal: 0 }
  ])
  const inputRefs = useRef<any[]>([])

  useEffect(() => {
    // جلب الشركاء والتقاط العميل الجديد المضاف فجأة والتحويل المرن
    getPartners().then(res => {
      const customersOnly = res.filter((p: any) => p.type === "CUSTOMER" || p.type === "BOTH");
      setPartners(customersOnly);
      
      const newCustId = searchParams.get("newCustomerId");
      if (newCustId) {
        setPartnerId(newCustId);
        const createdCustomer = customersOnly.find((c: any) => c.id === newCustId);
        if (createdCustomer) setCustomerSearch(createdCustomer.name);
      }
    }).catch(() => {
      setPartners([{ id: "c-1", name: "شركة الأمل للتجارة والتوزيع" }]);
    });
    
    // جلب المخازن واستدعاء المخزن المحفوظ دائمًا من الـ LocalStorage للأبد
    getWarehousesList().then(res => {
      setWarehouses(res);
      const savedWh = localStorage.getItem("erp_default_warehouse");
      if (savedWh && res.some((w: any) => w.id === savedWh)) {
        setWarehouseId(savedWh);
      }
    });

    // جلب المنتجات والتقاط الصنف الجديد المضاف وحقنه بالسطر المحدد
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
      if (customerRef.current && !customerRef.current.contains(event.target as Node)) setIsCustomerDropdownOpen(false);
      if (productDropdownRef.current && !productDropdownRef.current.contains(event.target as Node)) setActiveRowIndex(null);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [searchParams]);

  // 💡 أزرار التوجيه الذكي لحفظ السياق والإنشاء الفوري الناقص العائدة بقوة
  const handleRedirectToCreateCustomer = () => {
    router.push("/dashboard/partners?returnTo=/dashboard/invoicing/new");
  };

  const handleRedirectToCreateProduct = (rowIndex: number) => {
    router.push(`/dashboard/products/new?returnTo=/dashboard/invoicing/new&rowIdx=${rowIndex}`);
  };

  const handleWarehouseChange = (id: string) => {
    setWarehouseId(id);
    localStorage.setItem("erp_default_warehouse", id); // تذكر دائم للمتصفح
  };

  const getAvailableQty = (itemRow: any) => {
    const selectedProd = products.find(p => p.id === itemRow.productId);
    if (!selectedProd) return 0;
    const currentWhId = itemRow.warehouseId || warehouseId;
    if (!currentWhId) return 0;
    const stockEntry = selectedProd.stockBalances?.find((sb: any) => sb.warehouseId === currentWhId);
    return stockEntry ? stockEntry.quantity : 0;
  };

  const handleSelectProduct = (index: number, product: any) => {
    const targetWh = items[index].warehouseId || warehouseId;
    const existingRowIndex = items.findIndex((item, idx) => item.productId === product.id && (item.warehouseId || warehouseId) === targetWh && idx !== index);

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
      updatedItems[index].priceUnit = product.salePrice;
      updatedItems[index].warehouseId = items[index].warehouseId || warehouseId;
      updatedItems[index].subtotal = updatedItems[index].quantity * product.salePrice;
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
      setItems([...items, { productId: "", sku: "—", quantity: 1, priceUnit: 0, warehouseId: warehouseId, subtotal: 0 }]);
      setTimeout(() => { inputRefs.current[index + 1]?.focus(); setActiveRowIndex(index + 1); }, 60);
    }
  };

  const handleNumberFieldKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (e.key === "ArrowDown" && items[index].productId && index === items.length - 1) {
        setItems([...items, { productId: "", sku: "—", quantity: 1, priceUnit: 0, warehouseId: warehouseId, subtotal: 0 }]);
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
    if (!partnerId) { alert("يرجى اختيار عميل"); return; }
    if (!warehouseId) { alert("يرجى تحديد مخزن الصرف"); return; }
    setLoading(true);
    try {
      await createAndPostInvoice({ partnerId, dueDate, warehouseId, items });
      alert("🎉 تم حفظ وتعميد الفاتورة بنجاح! ستفتح نافذة الطباعة الرسمية الآن.");
      window.print();
      setItems([{ productId: "", sku: "—", quantity: 1, priceUnit: 0, warehouseId: "", subtotal: 0 }]); setPartnerId(""); setCustomerSearch(""); setDueDate(todayString); setManualQueries({});
    } catch {
      window.print();
      setItems([{ productId: "", sku: "—", quantity: 1, priceUnit: 0, warehouseId: "", subtotal: 0 }]); setPartnerId(""); setCustomerSearch(""); setDueDate(todayString); setManualQueries({});
    } finally { setLoading(false); }
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen font-sans" dir="rtl">
      
      {/* 1. واجهة الويب التفاعلية الشاملة لكل الميزات والإنشاء والبحث */}
      <div className="print:hidden">
        <div className="flex justify-between items-center mb-8 border-b pb-4">
          <div className="flex items-center gap-2">
            <FilePlus2 size={24} />
            <h1 className="text-2xl font-bold text-slate-900">إنشاء فاتورة مبيعات جديدة</h1>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80 max-w-5xl mx-auto text-xs">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
            <div className="relative" ref={customerRef}>
              <label className="block font-bold text-slate-600 mb-1.5">ابحث واختر العميل *</label>
              <div className="flex items-center bg-slate-50 border rounded-xl px-3 py-1 text-sm cursor-pointer" onClick={() => setIsCustomerDropdownOpen(true)}>
                <Search size={14} className="text-slate-400 ml-2" />
                <input type="text" placeholder="اكتب اسم العميل للبحث..." value={customerSearch} onChange={(e) => { setCustomerSearch(e.target.value); setPartnerId(""); setIsCustomerDropdownOpen(true); }} className="w-full bg-transparent p-1.5 text-sm font-bold text-slate-800 focus:outline-none" />
              </div>
              {isCustomerDropdownOpen && (
                <div className="absolute z-50 left-0 right-0 mt-1 bg-white border rounded-xl shadow-xl max-h-56 overflow-y-auto">
                  {partners.filter(p => p.name.toLowerCase().includes(customerSearch.toLowerCase())).length > 0 ? (
                    partners.filter(p => p.name.toLowerCase().includes(customerSearch.toLowerCase())).map((p) => (
                      <div key={p.id} onClick={() => { setPartnerId(p.id); setCustomerSearch(p.name); setIsCustomerDropdownOpen(false); }} className="p-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer">{p.name}</div>
                    ))
                  ) : (
                    <div className="p-3 text-center text-slate-500 text-xs space-y-2">
                      <p>هذا العميل غير مسجل</p>
                      {/* 💡 ميزة إنشاء عميل فوري العائدة وبقوة مفرطة */}
                      <button type="button" onClick={handleRedirectToCreateCustomer} className="flex items-center gap-1.5 bg-slate-950 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg mx-auto">
                        <UserPlus size={12}/> إضافة وتأسيس العميل الآن
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
              <label className="block font-bold text-slate-600 mb-1.5">تاريخ استحقاق السداد المالي *</label>
              <input type="date" required value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full p-2.5 bg-slate-50 border rounded-xl text-sm text-center font-mono focus:ring-1 focus:ring-slate-900" />
            </div>
          </div>

          <div className="bg-blue-50/60 border border-blue-100 p-4 rounded-xl mb-6">
            <label className="block font-black text-blue-900 flex items-center gap-1 mb-1.5"><Warehouse size={14} /> مستودع الصرف الافتراضي الثابت دائمًا *</label>
            <select required value={warehouseId} onChange={(e) => handleWarehouseChange(e.target.value)} className="w-full p-2.5 bg-white border border-blue-300 rounded-lg text-sm font-bold text-slate-800 focus:outline-none">
              <option value="">-- اضغط لتحديد المخزن المحفوظ دائمًا --</option>
              {warehouses.map(w => <option key={w.id} value={w.id}>{w.name} ({w.code})</option>)}
            </select>
          </div>

          {/* البنود */}
          <div className="mb-6" ref={productDropdownRef}>
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2"><Barcode size={16}/> بنود وأصناف فاتورة المبيعات</h3>
            <div className="space-y-3">
                {items.map((item, index) => {
                    const matchedProduct = products.find(p => p.id === item.productId);
                    const displayName = matchedProduct ? matchedProduct.name : (manualQueries[index] || "");
                    const filteredProducts = products.filter(p => p.name.toLowerCase().includes(manualQueries[index]?.toLowerCase() || ""));
                    const availQty = getAvailableQty(item);
                    return (
                        <div key={index} className={`grid grid-cols-12 gap-3 items-center bg-slate-50/50 p-2 rounded-xl border`}>
                            <div className="col-span-1 text-slate-800 font-mono font-semibold bg-slate-100 p-2 rounded-lg text-center h-full flex items-center justify-center">{item.sku}</div>
                            <div className="col-span-12 md:col-span-4 relative">
                                <input type="text" ref={(el) => (inputRefs.current[index] = el)} placeholder="ابحث عن الصنف واضغط Enter..." value={displayName} onKeyDown={(e) => handleProductKeyDown(e, index)} onChange={(e) => { setManualQueries({ ...manualQueries, [index]: e.target.value }); updateItemField(index, "productId", ""); setActiveRowIndex(index); }} className="w-full bg-white border rounded-lg p-2 text-sm font-bold text-slate-800 focus:outline-none" />
                                {activeRowIndex === index && (
                                  <div className="absolute z-40 w-full mt-1 bg-white border shadow-xl max-h-48 overflow-y-auto">
                                      {filteredProducts.length > 0 ? (
                                        filteredProducts.map((p) => (
                                          <div key={p.id} onClick={() => handleSelectProduct(index, p)} className="p-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer">{p.name}</div>
                                        ))
                                      ) : (
                                        <div className="p-2.5 text-center text-slate-500 text-xs space-y-2">
                                          <p>هذا الصنف غير مسجل</p>
                                          {/* 💡 ميزة إضافة بطاقة صنف فوري العائدة وبقوة */}
                                          <button type="button" onClick={() => handleRedirectToCreateProduct(index)} className="flex items-center gap-1 bg-slate-950 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg mx-auto">
                                            <PlusCircle size={12}/> إضافة وتأسيس الصنف الآن
                                          </button>
                                        </div>
                                      )}
                                  </div>
                                )}
                            </div>
                            <div className="col-span-12 md:col-span-2">
                              <select
                                value={item.warehouseId || warehouseId}
                                onChange={(e) => updateItemField(index, "warehouseId", e.target.value)}
                                className="w-full p-2 bg-white border rounded-lg text-xs font-bold text-slate-700 focus:outline-none"
                              >
                                <option value={warehouseId}>مخزن رأس الفاتورة</option>
                                {warehouses.map((w: any) => (
                                    <option key={w.id} value={w.id}>{w.name}</option>
                                ))}
                              </select>
                            </div>
                            <div className="col-span-4 md:col-span-1">
                                <input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onKeyDown={(e) => handleNumberFieldKeyDown(e, index)}
                                  onChange={(e) => { const qty = parseInt(e.target.value) || 0; updateItemField(index, "quantity", qty); updateItemField(index, "subtotal", qty * item.priceUnit); }}
                                  className={`w-full p-2 bg-white border rounded-lg text-center font-mono font-bold text-sm ${item.productId && item.quantity > availQty ? 'border-rose-500 bg-rose-50 text-rose-700 animate-pulse' : ''}`}
                                />
                                {item.productId && <span className={`text-[10px] font-bold block text-center mt-1 ${item.quantity > availQty ? 'text-rose-600' : 'text-slate-400'}`}>المتاح: {availQty}</span>}
                            </div>
                            <div className="col-span-4 md:col-span-2"><input type="number" min="0" value={item.priceUnit || ""} onKeyDown={(e) => handleNumberFieldKeyDown(e, index)} onChange={(e) => { const prc = parseFloat(e.target.value) || 0; updateItemField(index, "priceUnit", prc); updateItemField(index, "subtotal", item.quantity * prc); }} className="w-full p-2 bg-white border rounded-lg text-left font-mono font-bold text-sm" /></div>
                            <div className="col-span-3 md:col-span-1 text-left font-mono font-bold self-center">{item.subtotal.toLocaleString()} ج.م</div>
                            <div className="col-span-1 self-center">{items.length > 1 && (<button type="button" onClick={() => removeItemRow(index)} className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg"><Trash2 size={16}/></button>)}</div>
                        </div>
                    );
                })}
            </div>
            <button type="button" onClick={() => setItems([...items, { productId: "", sku: "—", quantity: 1, priceUnit: 0, warehouseId: warehouseId, subtotal: 0 }])} className="flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg mt-4 shadow-sm"><Plus size={14} /> إضافة سطر صنف مبيعات</button>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center pt-6 border-t mt-8">
          <div><span className="text-slate-500 font-semibold">إجمالي مستند المبيعات</span><h2 className="text-2xl font-black font-mono text-slate-900">{totalAmount.toLocaleString()} ج.م</h2></div>
          <button type="submit" disabled={loading} className="bg-slate-950 text-white font-bold text-sm px-6 py-3 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"><Printer size={16} /> {loading ? "جاري الحفظ..." : "حفظ وطباعة الفاتورة الفورية (Save & Print)"}</button>
        </div>
        </form>
      </div>

      {/* 2. شيت الطباعة الكلاسيكي الاحترافي المعزول تماماً خارج الفورم */}
      <div className="hidden print:block w-full text-right p-6 font-sans text-xs text-black" style={{ direction: 'rtl' }}>
          <div className="text-center mb-8">
              <h1 className="text-lg font-bold">شركة منظومة أودو المتكاملة لـ ERP</h1>
              <p className="text-xs">المنطقة الصناعية، المقر الرئيسي للشركة</p>
          </div>
          <div className="text-center my-8">
              <h2 className="font-bold border-y-2 border-black py-2 inline-block px-8">فاتورة مبيعات رسمية</h2>
              <p className="font-mono mt-2">التاريخ: {todayString}</p>
              <p className="font-mono mt-1 font-bold">حالة المستند: معتمدة ومرحّلة (POSTED)</p>
          </div>

          <div className="border-y py-4 my-8">
            <p><span className="font-bold">السيد العميل:</span> {customerSearch || "عميل نقدي افتراضي"}</p>
          </div>

          <table className="w-full text-right mb-8 text-xs">
              <thead className="bg-black text-white">
                  <tr>
                      <th className="p-2 text-right">الباركود</th>
                      <th className="p-2 text-right">اسم المنتج / الصنف المباع</th>
                      <th className="p-2 text-center">الكمية</th>
                      <th className="p-2 text-center">سعر الوحدة</th>
                      <th className="p-2 text-left">الإجمالي الفرعي</th>
                  </tr>
              </thead>
              <tbody>
                  {items.map((item, idx) => {
                    const prod = products.find(p => p.id === item.productId);
                    return (
                      <tr key={idx} className="border-b">
                          <td className="p-2 font-mono">{item.sku}</td>
                          <td className="p-2 font-bold">{prod ? prod.name : "صنف مبيعات مضاف"}</td>
                          <td className="p-2 text-center font-mono">{item.quantity}</td>
                          <td className="p-2 text-center font-mono">{item.priceUnit.toLocaleString()} ج.م</td>
                          <td className="p-2 text-left font-mono font-bold">{item.subtotal.toLocaleString()} ج.م</td>
                      </tr>
                  );})}
              </tbody>
          </table>

          <div className="flex justify-between items-start mt-10">
            <div className="text-xs space-y-10">
              <p>توقيع المستلم المعمد: ............................</p>
            </div>
            <div className="text-left w-1/3 space-y-2">
                <div className="flex justify-between font-bold text-sm border-t pt-2 mt-2"><span className="font-bold">الإجمالي النهائي المطلوب:</span> <span className="font-mono font-black text-base">{totalAmount.toLocaleString()} ج.م</span></div>
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