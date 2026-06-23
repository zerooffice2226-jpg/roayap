// src/app/dashboard/invoicing/new/page.tsx
"use client"
export const dynamic = 'force-dynamic'
import React, { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createAndPostInvoice, getInvoiceByNumber, deleteInvoiceByNumber } from "@/app/actions/invoicing-ops"
import { getWarehousesList } from "@/app/actions/warehouse-ops"
import { getPartners } from "@/app/actions/partner-ops"
import { getProducts } from "@/app/actions/product-ops"
import { getLiquidAccounts } from "@/app/actions/cash-receipt-ops"
import { FilePlus2, Plus, Trash2, Warehouse, Search, UserPlus, ChevronDown, PlusCircle, Barcode, Printer, Copy, Edit3, Info } from "lucide-react"

export default function NewInvoicePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isViewMode = searchParams.get("viewInvoice")

  // 1. العملاء والمستودعات
  const [partners, setPartners] = useState<any[]>([])
  const [partnerId, setPartnerId] = useState("")
  const [customerSearch, setCustomerSearch] = useState("")
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false)
  const customerRef = useRef<HTMLDivElement>(null)

  const todayString = new Date().toISOString().split('T')[0]
  const [dueDate, setDueDate] = useState(todayString)
  const [warehouseId, setWarehouseId] = useState("")
  const [warehouses, setWarehouses] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [isEditable, setIsEditable] = useState(false)

  // 2. المنتجات والبحث الذكي داخل السطور
  const [products, setProducts] = useState<any[]>([])
  const [activeRowIndex, setActiveRowIndex] = useState<number | null>(null)
  const [manualQueries, setManualQueries] = useState<{ [key: number]: string }>({})
  const productDropdownRef = useRef<HTMLDivElement>(null)

  const [items, setItems] = useState<any[]>([
    { productId: "", sku: "—", quantity: 1, priceUnit: 0, warehouseId: "", subtotal: 0 },
  ])
  const inputRefs = useRef<any[]>([])

  // 💡 حقول تتبع حاسبة الكاشير اللحظية
  const [amountChange, setAmountChange] = useState<number>(0) // الباقي المستحق للعميل
  const [cashAccounts, setCashAccounts] = useState<any[]>([]) // مصفوفة الخزائن الحية
  const [selectedCashAccount, setSelectedCashAccount] = useState("") // الخزينة المختارة للكاشير
  const [amountPaid, setAmountPaid] = useState<string>("") // المبلغ المدفوع

  // State for new printing logic
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const handleSelectProduct = (index: number, product: any) => {
    const targetWh = items[index].warehouseId || warehouseId
    const existingRowIndex = items.findIndex((item, idx) => item.productId === product.id && (item.warehouseId || warehouseId) === targetWh && idx !== index)

    if (existingRowIndex !== -1) {
      const updatedItems = [...items]
      updatedItems[existingRowIndex].quantity += updatedItems[index].quantity || 1
      updatedItems[existingRowIndex].subtotal = updatedItems[existingRowIndex].quantity * updatedItems[existingRowIndex].priceUnit
      setItems(updatedItems.filter((_, idx) => idx !== index))
      alert(`💡 تم دمج الصنف المكرر تلقائياً.`)
    } else {
      const updatedItems = [...items]
      updatedItems[index].productId = product.id
      updatedItems[index].sku = product.sku
      updatedItems[index].priceUnit = product.salePrice
      updatedItems[index].warehouseId = items[index].warehouseId || warehouseId
      updatedItems[index].subtotal = updatedItems[index].quantity * product.salePrice
      setItems(updatedItems)
      setManualQueries({ ...manualQueries, [index]: product.name })
    }
    setActiveRowIndex(null)
  }

  useEffect(() => {
    setIsLoading(true);
    const viewInvoice = searchParams.get("viewInvoice");

    const dataFetchPromises = [
      getPartners().then(res => {
        const customersOnly = res.filter((p: any) => p.type === "CUSTOMER" || p.type === "BOTH");
        setPartners(customersOnly);
        const newCustId = searchParams.get("newCustomerId");
        if (newCustId) {
          setPartnerId(newCustId);
          const createdCust = customersOnly.find((c: any) => c.id === newCustId);
          if (createdCust) setCustomerSearch(createdCust.name);
        }
      }),
      getWarehousesList().then(res => {
        setWarehouses(res);
        const savedWh = localStorage.getItem("erp_default_warehouse");
        if (savedWh && res.some((w: any) => w.id === savedWh)) setWarehouseId(savedWh);
      }),
      getProducts().then(res => {
        setProducts(res);
        const newProdId = searchParams.get("newProductId");
        const targetRow = searchParams.get("rowIdx");
        if (newProdId && targetRow !== null) {
          const idx = parseInt(targetRow);
          const createdProd = res.find((p: any) => p.id === newProdId);
          if (createdProd) handleSelectProduct(idx, createdProd);
        }
      }),
      getLiquidAccounts().then((res: any) => {
        const cashOnly = res.filter((acc: any) => acc.code?.startsWith("1101") || acc.name?.includes("خزينة"));
        setCashAccounts(cashOnly);
        if (cashOnly.length > 0) setSelectedCashAccount(cashOnly[0].id);
      }).catch(() => {
        setCashAccounts([{ id: "c-main", name: "110101 - خزينة المحل الرئيسية (كاش)" }]);
      })
    ];
    
    if (viewInvoice) {
      const invoicePromise = getInvoiceByNumber(viewInvoice).then(inv => {
        if (inv && inv.lines) {
          setPartnerId(inv.partnerId);
          setCustomerSearch(inv.partner?.name || "");
          setDueDate(inv.dueDate.toISOString().split('T')[0]);
          setWarehouseId((inv as any).warehouseId || "");
          const mappedItems = inv.lines.map((line: any) => ({ productId: line.productId, sku: line.product?.sku || "—", quantity: line.quantity, priceUnit: line.priceUnit, subtotal: line.subtotal }));
          setItems(mappedItems);
          const q: any = {};
          inv.lines.forEach((l: any, i: number) => { q[i] = l.product?.name || "" });
          setManualQueries(q);
          setWarehouseId((inv as any).lines?.[0]?.product?.stockBalances?.[0]?.warehouseId || (inv as any).warehouseId || "");

          const total = mappedItems.reduce((sum, item) => sum + item.subtotal, 0);
          setInvoiceData({
            invoiceNumber: viewInvoice,
            date: inv.dueDate.toISOString().split('T')[0],
            customerName: inv.partner?.name || 'عميل نقدي',
            items: mappedItems.map((item:any, index:number) => ({
                productName: q[index] || "صنف مبيعات",
                quantity: item.quantity,
                totalPrice: item.subtotal
            })),
            subTotal: total.toLocaleString(),
            grandTotal: total.toLocaleString(),
          });
        }
      });
      dataFetchPromises.push(invoicePromise);
    }

    Promise.all(dataFetchPromises).finally(() => {
      setIsLoading(false);
    });

    const handleClickOutside = (event: MouseEvent) => {
      if (customerRef.current && !customerRef.current.contains(event.target as Node)) setIsCustomerDropdownOpen(false)
      if (productDropdownRef.current && !productDropdownRef.current.contains(event.target as Node)) setActiveRowIndex(null)
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [searchParams])

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const isPrintMode = searchParams.get('print') === 'true';

    if (isPrintMode && !isLoading && invoiceData) {
      const timer = setTimeout(() => {
        window.print();
      }, 800); 

      return () => clearTimeout(timer);
    }
  }, [isLoading, invoiceData]);

  const totalAmount = items.reduce((sum, item) => sum + item.subtotal, 0)

  useEffect(() => {
    const paid = parseFloat(amountPaid) || 0
    if (paid > 0 && paid >= totalAmount) {
      setAmountChange(paid - totalAmount)
    } else {
      setAmountChange(0)
    }
  }, [amountPaid, totalAmount])

  const handleRedirectToCreateCustomer = () => {
    router.push("/dashboard/partners?returnTo=/dashboard/invoicing/new")
  }

  const handleRedirectToCreateProduct = (rowIndex: number) => {
    router.push(`/dashboard/products/new?returnTo=/dashboard/invoicing/new&rowIdx=${rowIndex}`)
  }

  const handleWarehouseChange = (id: string) => { setWarehouseId(id); localStorage.setItem("erp_default_warehouse", id) }
  const handleDuplicateInvoice = () => { if (window.confirm("هل تريد نسخ محتويات هذه الفاتورة لفتح مستند جديد؟")) { setPartnerId(""); setCustomerSearch(""); router.push("/dashboard/invoicing/new") } }
  const handleEnableEdit = () => { if (window.confirm("تعديل مستند مبيعات معتمد؟")) setIsEditable(true) }

  const handleCancelAndDelete = async () => {
    const viewInvoice = searchParams.get("viewInvoice")
    if (viewInvoice && window.confirm("هل تريد إلغاء وحذف الفاتورة وإرجاع البضائع للمخزن نهائيًا؟")) {
      setLoading(true)
      try { 
        await deleteInvoiceByNumber(viewInvoice); 
        alert("🎉 تم الحذف بنجاح!"); 
        router.push("/dashboard/invoicing") 
      } catch { 
        router.push("/dashboard/invoicing") 
      } finally { 
        setLoading(false) 
      }
    }
  }

  const getAvailableQty = (itemRow: any) => {
    const selectedProd = products.find(p => p.id === itemRow.productId)
    if (!selectedProd) return 0
    const currentWhId = itemRow.warehouseId || warehouseId
    if (!currentWhId) return 0
    return selectedProd.stockBalances?.find((sb: any) => sb.warehouseId === currentWhId)?.quantity || 0
  }

  const handleProductKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    const query = manualQueries[index] || ""
    const filtered = products.filter(p => p.name.toLowerCase().includes(query.toLowerCase()) || p.sku.includes(query))
    if (e.key === "Enter") {
      e.preventDefault()
      if (filtered.length === 1) handleSelectProduct(index, filtered[0])
    }
    if (e.key === "ArrowDown" && items[index].productId && index === items.length - 1) {
      e.preventDefault()
      setItems([...items, { productId: "", sku: "—", quantity: 1, priceUnit: 0, warehouseId: warehouseId, subtotal: 0 }])
      setTimeout(() => { inputRefs.current[index + 1]?.focus(); setActiveRowIndex(index + 1) }, 60)
    }
  }

  const handleNumberFieldKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault()
      if (e.key === "ArrowDown" && items[index].productId && index === items.length - 1) {
        setItems([...items, { productId: "", sku: "—", quantity: 1, priceUnit: 0, warehouseId: warehouseId, subtotal: 0 }])
        setTimeout(() => { inputRefs.current[index + 1]?.focus(); setActiveRowIndex(index + 1) }, 60)
      }
    }
  }

  const updateItemField = (index: number, field: string, value: any) => {
    const newItems = [...items] as any
    newItems[index][field] = value
    if (field === "quantity" || field === "priceUnit") newItems[index].subtotal = newItems[index].quantity * newItems[index].priceUnit
    setItems(newItems)
  }

  const removeItemRow = (index: number) => setItems(items.filter((_, i) => i !== index))

  const isFieldsFrozen = !!isViewMode && !isEditable

  const filteredCustomers = partners.filter(p =>
    p.name.toLowerCase().includes(customerSearch.toLowerCase())
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const isEditAction = !!(isEditable && searchParams.get("viewInvoice"));

      const result = await createAndPostInvoice({ 
        partnerId, 
        dueDate, 
        warehouseId, 
        items, 
        cashAccountId: selectedCashAccount, 
        amountPaid: amountPaid || 0, // ✅ أضف المبلغ المدفوع
        existingNumber: isEditAction ? searchParams.get("viewInvoice") : undefined 
      });
      
      if (isEditAction) {
        alert("🎉 تم تعديل الفاتورة الأصلية وتحديث أرصدة المخازن والحسابات بنجاح!");
        router.push("/dashboard/invoicing");
      } else {
        alert("🎉 تم حفظ وتوليد الفاتورة الجديدة بنجاح، وتحديث أرصدة المخازن الخزينة المحددة!");
        
        const generatedInvoiceNumber = (result as any)?.number || (result as any)?.invoiceNumber || (result as any)?.invoice?.number;
        
        if (generatedInvoiceNumber) {
          router.push(`/dashboard/invoicing/new?viewInvoice=${generatedInvoiceNumber}&print=true`);
        } else {
          router.push("/dashboard/invoicing");
        }
      }
    } catch (error) {
      console.error(error);
      alert("❌ حدث خطأ أثناء معالجة المستند، يرجى مراجعة المدخلات.");
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 bg-slate-50 min-h-screen font-sans" dir="rtl">
      <div id="erp-web-view" className="print:hidden">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 border-b pb-4">
            <div className="flex items-center gap-2">
                <FilePlus2 size={24} />
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">
                        {isViewMode ? `معاينة فاتورة مبيعات: ${searchParams.get("viewInvoice")}` : "إنشاء فاتورة مبيعات جديدة"}
                    </h1>
                    <p className="text-slate-500 text-xs mt-0.5">{isFieldsFrozen ? "🔒 وضع التجميد نشط" : "✍️ وضع الإدخال السريع نشط: Enter للاختيار، و (↓) لسطر جديد"}</p>
                </div>
            </div>

            {isViewMode && (
                <div className="flex gap-2 text-xs font-bold">
                    <button type="button" onClick={handleDuplicateInvoice} className="flex items-center gap-1 bg-white border p-2.5 rounded-xl shadow-sm"><Copy size={13} /> نسخ</button>
                    <button
                      type="button"
                      onClick={() => {
                        const currentInvNum = searchParams.get("viewInvoice");
                        if (currentInvNum) {
                          router.push(`/dashboard/invoicing/sales-return?autoFetchInv=${currentInvNum}`);
                        }
                      }}
                      className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white px-3 py-2 rounded-xl shadow-md cursor-pointer transition-all font-bold text-xs"
                      title="إصدار مستند مرتجع مبيعات فوري لهذه الفاتورة"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 3.89L21 4.1" /></svg>
                      <span>إصدار مرتجع (Sales Return)</span>
                    </button>
                    {isFieldsFrozen && <button type="button" onClick={handleEnableEdit} className="flex items-center gap-1 bg-white border p-2.5 rounded-xl shadow-sm"><Edit3 size={13} /> تعديل</button>}
                    <button type="button" onClick={handleCancelAndDelete} className="flex items-center gap-1 bg-rose-50 text-rose-700 border p-2.5 rounded-xl shadow-sm"><Trash2 size={13} /> حذف</button>
                </div>
            )}
        </div>

        <div className="bg-blue-50/80 border border-blue-200 text-blue-800 p-4 rounded-xl mb-8 flex items-start gap-3 text-sm max-w-5xl mx-auto leading-relaxed">
            <Info size={20} className="text-blue-600 shrink-0 mt-0.5" />
            <div>
                <span className="font-bold block mb-1">خطوة هامة لطباعة نظيفة (من إعدادات المتصفح):</span>
                <ul className="list-disc pr-4 space-y-1">
                    <li>للحصول على فاتورة احترافية، عند ظهور نافذة الطباعة، اضغط على <strong>"More Settings" (المزيد من الإعدادات)</strong>.</li>
                    <li>ألغِ تفعيل خيار <strong>"Headers and Footers" (الرؤوس والتذييلات)</strong> لمنع طباعة روابط وأرقام صفحات تلقائية.</li>
                    <li>اضبط الهوامش <strong>"Margins"</strong> على <strong>"None" (بلا)</strong> لإزالة الحواف البيضاء الزائدة.</li>
                </ul>
                <p className="mt-2">هذا يضمن أن تخرج الفاتورة بتصميمها النظيف فقط، خاصة على الطابعات الحرارية.</p>
            </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80 text-xs max-w-5xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start mb-6">
                <div className="relative z-30" ref={customerRef}>
                    <label className="block font-bold text-slate-600 mb-1.5">ابحث واختر العميل *</label>
                    <div className="flex items-center bg-slate-50 border rounded-xl px-3 py-2 text-sm cursor-pointer focus-within:ring-2 focus-within:ring-slate-950 transition-all" onClick={() => !isFieldsFrozen && setIsCustomerDropdownOpen(true)}>
                        <Search size={14} className="text-slate-400 ml-2" />
                        <input type="text" disabled={isFieldsFrozen} placeholder="اكتب اسم العميل للبحث..." value={customerSearch} onChange={(e) => { setCustomerSearch(e.target.value); setPartnerId(""); setIsCustomerDropdownOpen(true); }} className="w-full bg-transparent p-0.5 text-xs font-bold text-slate-800 focus:outline-none disabled:cursor-not-allowed" />
                        <ChevronDown size={14} className="text-slate-400 mr-auto" />
                    </div>
                    {isCustomerDropdownOpen && !isFieldsFrozen && (
                        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-40 overflow-y-auto divide-y divide-slate-100">
                            {filteredCustomers.length > 0 ? (
                                filteredCustomers.map(p => <div key={p.id} onClick={() => { setPartnerId(p.id); setCustomerSearch(p.name); setIsCustomerDropdownOpen(false); }} className="p-2.5 hover:bg-slate-50 cursor-pointer font-bold text-slate-700 text-xs">{p.name}</div>)
                            ) : (
                                <div className="p-4 text-center space-y-2 bg-white rounded-xl">
                                    <p className="text-[11px] font-bold text-slate-400">هذا العميل غير مسجل بالدفاتر</p>
                                    <button type="button" onClick={handleRedirectToCreateCustomer} className="bg-slate-950 text-white px-3 py-2 rounded-xl font-bold mx-auto text-[10px] flex items-center gap-1 shadow-md hover:bg-purple-600 transition-all cursor-pointer"><UserPlus size={12}/> إضافة وتأسيس العميل الآن</button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
                <div>
                    <label className="block font-bold text-slate-600 mb-1.5">تاريخ الفاتورة</label>
                    <input type="text" disabled value={todayString} className="w-full p-2.5 bg-slate-100 border text-slate-500 rounded-xl text-center font-mono font-bold cursor-not-allowed shadow-inner" />
                </div>
                <div>
                    <label className="block font-bold text-slate-600 mb-1.5">تاريخ استحقاق السداد المالي *</label>
                    <input type="date" required disabled={isFieldsFrozen} value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full p-2.5 bg-slate-50 border rounded-xl text-center font-mono font-bold text-slate-800 disabled:bg-slate-100 disabled:cursor-not-allowed" />
                </div>
            </div>

            <div className="bg-blue-50/60 border border-blue-100 p-4 rounded-xl mb-8 space-y-2">
                <label className="block font-black text-blue-900 flex items-center gap-1"><Warehouse size={14} /> مستودع الصرف الرئيسي الافتراضي *</label>
                <select required disabled={isFieldsFrozen} value={warehouseId} onChange={(e) => handleWarehouseChange(e.target.value)} className="w-full p-2.5 bg-white border border-blue-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none disabled:bg-slate-100">
                    <option value="">-- اضغط لتحديد المخزن الافتراضي للمبيعات --</option>
                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
            </div>

            <div className="mb-6" ref={productDropdownRef}>
                <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2"><Barcode size={16}/> بنود وأصناف فاتورة المبيعات</h3>
                <div className="space-y-3">
                    {items.map((item, index) => {
                        const matchedProduct = products.find(p => p.id === item.productId);
                        const displayName = matchedProduct ? matchedProduct.name : (manualQueries[index] || "");
                        const filteredProducts = products.filter(p => p.name.toLowerCase().includes(manualQueries[index]?.toLowerCase() || "") || p.sku.includes(manualQueries[index] || ""));
                        const availQty = getAvailableQty(item);
                        return (
                            <div key={index} className="grid grid-cols-12 gap-3 items-center bg-slate-50/50 p-2 rounded-xl border">
                                <div className="col-span-1 text-slate-800 font-mono font-semibold bg-slate-100 p-2 rounded-lg text-center h-full flex items-center justify-center">{item.sku}</div>
                                <div className="col-span-12 md:col-span-5 relative">
                                    <input type="text" ref={(el) => { inputRefs.current[index] = el; }} disabled={isFieldsFrozen} placeholder="ابحث عن الصنف واضغط Enter أو سهم لأسفل..." value={displayName} onKeyDown={(e) => handleProductKeyDown(e, index)} onChange={(e) => { setManualQueries({ ...manualQueries, [index]: e.target.value }); updateItemField(index, "productId", ""); setActiveRowIndex(index); }} className="w-full bg-white border rounded-lg p-2 text-xs font-bold text-slate-800 focus:outline-none disabled:bg-slate-100" />
                                    
                                    {activeRowIndex === index && !isFieldsFrozen && (
                                    <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-40 overflow-y-auto divide-y divide-slate-100">
                                        {filteredProducts.length > 0 ? (
                                        filteredProducts.map(p => (
                                            <div 
                                            key={p.id} 
                                            onClick={() => handleSelectProduct(index, p)} 
                                            className="p-2.5 hover:bg-slate-50 cursor-pointer font-bold text-slate-700 text-xs transition-colors"
                                            >
                                            {p.name} (كود: {p.sku})
                                            </div>
                                        ))
                                        ) : (
                                        <div className="p-3 text-center space-y-2 bg-white rounded-lg">
                                            <p className="text-[10px] font-bold text-slate-400">هذا الصنف غير مسجل بالدفاتر</p>
                                            <button 
                                            type="button" 
                                            onClick={() => handleRedirectToCreateProduct(index)} 
                                            className="bg-slate-950 text-white px-2.5 py-1.5 rounded-lg font-bold mx-auto text-[10px] flex items-center gap-1 shadow-sm hover:bg-purple-600 transition-all cursor-pointer"
                                            >
                                            <PlusCircle size={10} /> إضافة وتأسيس الصنف الآن
                                            </button>
                                        </div>
                                        )}
                                    </div>
                                    )}
                                </div>
                                <div className="col-span-4 md:col-span-2">
                                    <input type="number" min="1" disabled={isFieldsFrozen} value={item.quantity} onKeyDown={(e) => handleNumberFieldKeyDown(e, index)} onChange={(e) => { const qty = parseInt(e.target.value) || 0; updateItemField(index, "quantity", qty); updateItemField(index, "subtotal", qty * item.priceUnit); }} className={`w-full p-2 bg-white border rounded-lg text-center font-mono font-bold disabled:bg-slate-100 ${item.productId && item.quantity > availQty ? 'border-rose-500 bg-rose-50 text-rose-700' : ''}`} />
                                    {item.productId && <span className="text-[10px] text-center block mt-1">المتاح: {availQty}</span>}
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
                {!isFieldsFrozen && <button type="button" onClick={() => setItems([...items, { productId: "", sku: "—", quantity: 1, priceUnit: 0, warehouseId: warehouseId, subtotal: 0 }])} className="flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg mt-4 shadow-sm"><Plus size={14} /> إضافة سطر صنف مبيعات</button>}
            </div>

            {!isFieldsFrozen && (
              <div className="bg-slate-900 text-white p-5 rounded-2xl mb-6 grid grid-cols-1 md:grid-cols-4 gap-4 items-center shadow-md animate-fade-in text-xs font-bold">
                <div className="border-l border-slate-800 pl-2">
                  <label className="block text-[10px] text-slate-400 font-bold mb-1">صندوق / خزينة الاستلام الفوري *</label>
                  <select 
                    value={selectedCashAccount || ""}
                    onChange={(e) => setSelectedCashAccount(e.target.value || "")}
                    className="w-full p-2 bg-slate-800 border border-slate-700 rounded-xl font-black text-white focus:outline-none cursor-pointer"
                  >
                    <option value="">-- حدد خزينة الكاشير (اختياري) --</option>
                    {cashAccounts.map(acc => (
                      <option key={acc.id} value={acc.id} className="bg-slate-900 text-white font-bold">{acc.name}</option>
                    ))}
                  </select>
                </div>

                <div className="border-l border-slate-800 pl-2">
                  <span className="text-[10px] text-slate-400 block font-bold mb-1">القيمة المطلوبة (المستحق الصافي)</span>
                  <h3 className="text-base font-black font-mono text-purple-400">{totalAmount.toLocaleString()} ج.م</h3>
                </div>

                <div className="border-l border-slate-800 pl-2">
                  <label className="block text-[10px] text-slate-400 font-bold mb-1">
                    المبلغ المدفوع (اختياري)
                  </label>
                  <div className="relative flex items-center bg-slate-800 rounded-xl px-2.5 border border-slate-700">
                    <input 
                      type="number" 
                      min="0"
                      max={totalAmount}
                      placeholder="0.00" 
                      value={amountPaid} 
                      onChange={(e) => setAmountPaid(e.target.value)} 
                      className="w-full bg-transparent p-1.5 text-sm font-mono font-black text-white focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-500 font-sans mr-1">ج.م</span>
                  </div>
                  {parseFloat(amountPaid || "0") > 0 && parseFloat(amountPaid) < totalAmount && (
                    <p className="text-[9px] text-amber-400 mt-1">
                      ⚠️ المتبقي على الذمم: {(totalAmount - parseFloat(amountPaid)).toLocaleString()} ج.م
                    </p>
                  )}
                </div>

                <div className="text-left md:text-left pr-2 md:mr-auto">
                  <span className="text-[10px] text-slate-400 block font-bold mb-0.5">الباقي للعميل (المتبقي نقداً)</span>
                  <h2 className={`text-base font-black font-mono tracking-tight ${amountChange > 0 ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`}>
                    {amountChange.toLocaleString()} ج.م
                  </h2>
                </div>
              </div>
            )}

            <div className="flex flex-col md:flex-row justify-between items-center pt-6 border-t mt-8">
                <div>
                    <span className="text-slate-500 font-semibold">إجمالي مستند المبيعات</span>
                    <h2 className="text-2xl font-black font-mono text-slate-900">{totalAmount.toLocaleString()} ج.م</h2>
                </div>
                {!isFieldsFrozen && <button type="submit" disabled={loading} className="bg-slate-950 text-white font-bold text-xs px-6 py-3.5 rounded-xl shadow-lg flex items-center justify-center gap-2 hover:bg-slate-800 disabled:bg-slate-400">حفظ وطباعة الفاتورة الفورية (Save & Print)</button>}
                {isFieldsFrozen && <button type="button" onClick={() => window.print()} className="flex items-center gap-2 bg-blue-600 text-white font-bold text-xs px-6 py-3.5 rounded-xl shadow-md"> طباعة نسخة الفاتورة الحالية</button>}
            </div>
        </form>
      </div>

      {/* -- Seperate Print View -- */}
      <div id="erp-invoice-print-sheet" className="thermal-mode hidden print:block">
        <div className="print-header">
          <div className="brand-logo">MODOO</div>
          <div className="shop-details">
            <h3>modoo Accounting & ERP</h3>
            <p>الرقم الضريبي: 300012345600003</p>
            <p>فرع المنصورة - حي الجامعة</p>
          </div>
        </div>

        <div className="print-divider"></div>

        <div className="print-meta">
          <p><strong>رقم الفاتورة:</strong> {invoiceData?.invoiceNumber || 'INV/2026/0002'}</p>
          <p><strong>التاريخ:</strong> {invoiceData?.date || '2026-06-15'}</p>
          <p><strong>العميل:</strong> {invoiceData?.customerName || 'عميل نقدي'}</p>
        </div>

        <table className="print-table">
          <thead>
            <tr>
              <th>المنتج</th>
              <th className="text-center">الكمية</th>
              <th className="text-left">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            {invoiceData?.items?.map((item: any, index: number) => (
              <tr key={index}>
                <td>{item.productName}</td>
                <td className="text-center">{item.quantity}</td>
                <td className="text-left">{item.totalPrice} $</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="print-divider"></div>

        <div className="print-footer">
            <div className="print-totals">
                <p className="print-grand-total">
                <span>الإجمالي:</span> {invoiceData?.subTotal || '0.00'} $
                </p>
            </div>
            <div className="print-qr">
                <div className="qr-placeholder">[ QR Code ]</div>
            </div>
        </div>

        <div className="print-thankyou">
          <p>شكراً لزيارتكم وثقتكم بنا!</p>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * {
            visibility: hidden;
          }
          #erp-invoice-print-sheet, #erp-invoice-print-sheet * {
            visibility: visible;
          }
          #erp-invoice-print-sheet {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            direction: rtl;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: #000;
            background: #fff;
          }
          #erp-invoice-print-sheet.thermal-mode {
            width: 80mm;
            max-width: 80mm;
            padding: 5px;
            font-size: 11px;
          }
          .thermal-mode .print-header {
            text-align: center;
            margin-bottom: 10px;
          }
          .thermal-mode .brand-logo {
            font-size: 20px;
            font-weight: bold;
          }
          #erp-invoice-print-sheet.a4-mode {
            width: 210mm;
            padding: 40px;
            font-size: 14px;
          }
          .a4-mode .print-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #333;
            padding-bottom: 15px;
          }
          .print-divider {
            border-top: 1px dashed #666;
            margin: 8px 0;
          }
          .print-table {
            width: 100%;
            border-collapse: collapse;
            margin: 10px 0;
          }
          .print-table th {
            border-bottom: 2px solid #000;
            padding: 5px;
            font-weight: bold;
          }
          .print-table td {
            padding: 6px 4px;
            border-bottom: 1px solid #eee;
          }
          .text-center { text-align: center; }
          .text-left { text-align: left; }
          .print-footer {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-top: 10px;
          }
          .print-totals p {
            margin: 3px 0;
            display: flex;
            justify-content: space-between;
            gap: 15px;
          }
          .print-grand-total {
            font-weight: bold;
            font-size: 1.2em;
            border-top: 1px solid #000;
            padding-top: 3px;
          }
          .qr-placeholder {
            width: 65px;
            height: 65px;
            border: 1px solid #000;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 9px;
          }
          .print-thankyou {
            text-align: center;
            margin-top: 15px;
            font-style: italic;
          }
        }
      `}} />
    </div>
  );
}
