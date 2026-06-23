"use client"
import React, { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { processProductReturn, fetchOriginalInvoiceData } from "@/app/actions/returns-ops"
import { Undo2 } from "lucide-react"

export default function SalesReturnPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [invoiceNumber, setInvoiceNumber] = useState("")
  const [invoiceId, setInvoiceId] = useState("") // 🌟 مهم: الـ UUID الحقيقي
  const [partnerName, setPartnerName] = useState("—")
  const [fetching, setFetching] = useState(false)
  
  const [items, setItems] = useState([
    { productId: "", sku: "—", name: "", quantity: 1, priceUnit: 0, subtotal: 0 },
  ])
  const [loading, setLoading] = useState(false)

  // 🌟 قراءة الـ query parameter عند تحميل الصفحة
  useEffect(() => {
    const autoFetchInv = searchParams.get("autoFetchInv")
    if (autoFetchInv) {
      setInvoiceNumber(autoFetchInv)
      // جلب البيانات تلقائياً
      handleFetchInvoiceData(autoFetchInv)
    }
  }, [searchParams])

  const handleFetchInvoiceData = async (invNumber?: string) => {
    const invNum = invNumber || invoiceNumber
    
    if (!invNum.trim()) { 
      alert("يرجى كتابة رقم فاتورة صحيح"); 
      return; 
    }
    
    setFetching(true);
    try {
      // 🌟 استدعاء الدالة الحقيقية
      const result = await fetchOriginalInvoiceData(invNum);
      
      if (result.success && result.data) {
        setInvoiceId(result.data.invoiceId); // ✅ حفظ الـ UUID
        setPartnerName(result.data.partnerName);
        
        const mappedItems = result.data.lines.map((line: any) => ({
          productId: line.productId,
          sku: line.sku,
          name: line.name,
          quantity: line.quantity,
          priceUnit: line.priceUnit,
          subtotal: line.subtotal
        }));
        
        setItems(mappedItems);
        alert(`تم جلب الفاتورة بنجاح! تم تحميل ${mappedItems.length} صنف.`);
      } else {
        alert("الفاتورة غير موجودة أو لم يتم اعتمادها بعد");
      }
    } catch (err) {
      console.error(err);
      alert("حدث خطأ أثناء جلب البيانات");
    } finally {
      setFetching(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!invoiceId) {
      alert("يرجى جلب بيانات الفاتورة أولاً");
      return;
    }
    
    setLoading(true);
    try {
      await processProductReturn({
        invoiceId: invoiceId, // ✅ استخدام الـ UUID الحقيقي
        type: "SALE_RETURN",
        items: items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          priceUnit: item.priceUnit,
        })),
      });
      alert("تمت معالجة مردود المبيعات بنجاح!");
      router.push("/dashboard/invoicing");
    } catch (error: any) {
      alert(error.message || "حدث خطأ أثناء المعالجة");
    } finally { 
      setLoading(false); 
    }
  };

  const updateItemField = (index: number, field: string, value: string | number) => {
    setItems(prev =>
      prev.map((item, i) => {
        if (i !== index) return item
        const next = { ...item, [field]: value }
        if (field === "quantity" || field === "priceUnit") {
          const quantity = field === "quantity" ? Number(value) : item.quantity
          const priceUnit = field === "priceUnit" ? Number(value) : item.priceUnit
          next.subtotal = quantity * priceUnit
        }
        return next
      })
    )
  }

  return (
    <div className="p-8 bg-slate-50 min-h-screen font-sans" dir="rtl">
      <div className="flex items-center gap-2 mb-8 border-b pb-4">
        <Undo2 className="text-rose-600" size={24} />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">مردودات ومسترجعات المبيعات (Credit Note)</h1>
          <p className="text-slate-500 text-xs mt-0.5">عكس الأثر المالي للمبيعات وإعادة البضاعة للمخزن</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 max-w-2xl text-xs space-y-5">
        
        {/* رقم الفاتورة */}
        <div className="mb-5">
          <label className="block font-bold text-slate-700 mb-2">
            رقم فاتورة المبيعات الأصلية *
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              required
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              className="flex-1 p-3 border rounded-xl font-mono font-bold"
              placeholder="INV/2026/0001"
            />
            <button
              type="button"
              onClick={() => handleFetchInvoiceData()}
              disabled={fetching}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold disabled:opacity-50"
            >
              {fetching ? "جاري الجلب..." : "جلب البيانات"}
            </button>
          </div>
        </div>

        {/* اسم العميل */}
        <div className="bg-blue-50 p-4 rounded-xl">
          <span className="text-slate-500 block text-xs mb-1">العميل / الشريك</span>
          <span className="font-bold text-slate-900">{partnerName}</span>
        </div>

        {/* جدول الأصناف */}
        <div className="space-y-3">
          <h3 className="font-bold text-slate-800">الأصناف المرتجعة</h3>
          {items.map((item, index) => (
            <div key={index} className="flex gap-3 items-center bg-slate-50 p-3 rounded-xl border">
              <div className="flex-1">
                <span className="font-bold text-sm">{item.name || "صنف"}</span>
                <span className="text-xs text-slate-500 block">({item.sku})</span>
              </div>
              <div className="w-24">
                <input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => updateItemField(index, "quantity", parseInt(e.target.value) || 1)}
                  className="w-full p-2 border rounded-lg text-center font-mono font-bold"
                />
              </div>
              <div className="w-24">
                <input
                  type="number"
                  min="0"
                  value={item.priceUnit}
                  onChange={(e) => updateItemField(index, "priceUnit", parseFloat(e.target.value) || 0)}
                  className="w-full p-2 border rounded-lg text-left font-mono font-bold"
                />
              </div>
              <div className="w-28 text-left font-mono font-bold">
                {item.subtotal.toLocaleString()} ج.م
              </div>
            </div>
          ))}
        </div>

        {/* الإجمالي */}
        <div className="border-t pt-4">
          <div className="flex justify-between items-center">
            <span className="font-bold text-lg">إجمالي المرتجع:</span>
            <span className="font-black text-xl text-rose-600">
              {items.reduce((sum, item) => sum + item.subtotal, 0).toLocaleString()} ج.م
            </span>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || items.length === 0}
          className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-sm disabled:opacity-50"
        >
          {loading ? "جاري المعالجة..." : "اعتماد المرتجع"}
        </button>
      </form>
    </div>
  );
}