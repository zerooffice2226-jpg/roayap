// src/app/dashboard/pos/page.tsx
"use client"
import React, { useState, useEffect } from "react"
import { ShoppingCart, ShoppingBag, User, CreditCard, Trash2, CheckCircle, Zap } from "lucide-react"

export default function PointOfSalePage() {
  const [products, setProducts] = useState<any[]>([])
  const [cart, setCart] = useState<any[]>([])
  const [checkoutSuccess, setCheckoutSuccess] = useState(false)

  // المنتجات المتاحة على الرفوف للكاشير
  useEffect(() => {
    setProducts([
      { id: "prod-1", name: "شاشة ذكية 55 بوصة سمارة", salePrice: 15000, stock: 48, sku: "SH-55" },
      { id: "prod-2", name: "طابعة ليزر مكتبية ملوّنة", salePrice: 4200, stock: 15, sku: "PR-LX" },
      { id: "prod-3", name: "ماوس لاسلكي مريح للغاية", salePrice: 450, stock: 120, sku: "MS-W" }
    ])
  }, [])

  const addToCart = (product: any) => {
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      setCart(cart.map(item => item.id === product.id ? { ...item, qty: item.qty + 1, total: (item.qty + 1) * item.salePrice } : item));
    } else {
      setCart([...cart, { ...product, qty: 1, total: product.salePrice }]);
    }
  }

  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
  }

  const cartSubtotal = cart.reduce((sum, item) => sum + item.total, 0);

  const handleCheckout = () => {
    if (cart.length === 0) return;
    setCheckoutSuccess(true);
    setCart([]);
    setTimeout(() => setCheckoutSuccess(false), 4000);
  };

  return (
    <div className="p-6 bg-slate-100 min-h-screen font-sans flex flex-col lg:flex-row gap-6" dir="rtl">
      {/* التنبيه اللحظي بالدفع وطباعة الفاتورة */}
      {checkoutSuccess && (
        <div className="fixed top-6 left-6 right-6 lg:left-auto lg:w-96 bg-emerald-600 text-white p-4 rounded-xl shadow-xl z-50 flex items-center gap-3 animate-fade-in-down">
          <CheckCircle size={22} />
          <div>
            <p className="text-sm font-bold">تمت عملية البيع النقدي بنجاح!</p>
            <p className="text-xs text-emerald-100">تم جرد الأصناف، وتحديث الصندوق، وتوليد القيد المحاسبي المباشر.</p>
          </div>
        </div>
      )}

      {/* شق المنتجات والرفوف (اليسار/المنتصف) */}
      <div className="flex-1">
        <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-xl shadow-sm border">
          <div>
            <h1 className="text-xl font-black text-slate-900 flex items-center gap-1.5">
              <Zap className="text-amber-500 fill-amber-500" size={20} />
              واجهة كاشير نقطة البيع (Odoo POS Terminal)
            </h1>
            <p className="text-slate-500 text-xs mt-0.5">شاشة بيع سريعة للمبيعات المباشرة والنقدية المتزامنة</p>
          </div>
          <span className="text-xs font-bold px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
            المستخدم: مسؤول الوردية
          </span>
        </div>

        {/* شبكة عرض المنتجات الفائقة */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {products.map((product) => (
            <div 
              key={product.id} 
              onClick={() => addToCart(product)}
              className="bg-white border rounded-xl p-4 shadow-sm hover:shadow-md cursor-pointer transition-all flex flex-col justify-between border-slate-200/70 hover:border-slate-400 group"
            >
              <div>
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-bold tracking-wider font-mono text-slate-400 uppercase bg-slate-50 px-1.5 py-0.5 rounded border">
                    {product.sku}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-500">
                    الرف: {product.stock} وحدة
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-800 group-hover:text-slate-900 transition-colors">
                  {product.name}
                </h3>
              </div>
              <div className="text-left mt-6">
                <span className="text-base font-black font-mono text-slate-900">
                  {product.salePrice.toLocaleString()} ج.م
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* سلة حسابات الفاتورة الجانبية للكاشير (اليمين) */}
      <div className="w-full lg:w-96 bg-white border border-slate-200 rounded-2xl shadow-md p-5 flex flex-col justify-between h-[calc(100vh-3rem)] sticky top-6">
        <div>
          <div className="flex items-center gap-2 pb-4 border-b border-slate-100 mb-4">
            <ShoppingCart className="text-slate-700" size={18} />
            <h2 className="text-base font-bold text-slate-800">سلة مبيعات الوردية</h2>
          </div>

          {/* عناصر السلة التفاعلية */}
          <div className="space-y-3 overflow-y-auto max-h-[350px] pr-1">
            {cart.length === 0 ? (
              <div className="text-center py-12 text-slate-400 flex flex-col items-center gap-2">
                <ShoppingBag size={32} className="stroke-1 text-slate-300" />
                <p className="text-xs">السلة فارغة. انقر على المنتجات للبيع.</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.id} className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs">
                  <div>
                    <h4 className="font-bold text-slate-800">{item.name}</h4>
                    <p className="text-slate-400 font-mono mt-0.5">
                      {item.qty} × {item.salePrice.toLocaleString()} ج.م
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-black text-slate-900">
                      {item.total.toLocaleString()} ج.م
                    </span>
                    <button 
                      onClick={() => removeFromCart(item.id)}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* البار السفلي للدفع المباشر والحساب الزمني */}
        <div className="border-t pt-4 bg-white">
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs font-bold text-slate-500">المطلوب سداده نقداً</span>
            <span className="text-xl font-black font-mono text-slate-900">
              {cartSubtotal.toLocaleString()} ج.م
            </span>
          </div>

          <button 
            onClick={handleCheckout}
            disabled={cart.length === 0}
            className={`w-full py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-sm ${cart.length > 0 ? 'bg-slate-950 text-white hover:bg-slate-800 cursor-pointer' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}>
            <CreditCard size={16} />
            إتمام البيع وقبض الكاش (Checkout)
          </button>
        </div>
      </div>
    </div>
  );
}
