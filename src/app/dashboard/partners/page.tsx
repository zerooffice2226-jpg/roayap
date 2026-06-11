// src/app/dashboard/partners/page.tsx
"use client"
import React, { useState, useEffect, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation";
import { createPartner, getPartners } from "@/app/actions/partner-ops"
import { Users, UserPlus, ShieldCheck, Mail, Phone, Tag, Search, Building } from "lucide-react"

// Define Partner type based on Prisma schema
type Partner = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  type: "CUSTOMER" | "VENDOR" | "BOTH";
};

export default function PartnersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [partners, setPartners] = useState<Partner[]>([])
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [type, setType] = useState<"CUSTOMER" | "VENDOR" | "BOTH">("CUSTOMER")
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // جلب البيانات فور فتح الشاشة
  const loadPartners = async () => {
    try {
        const fetchedPartners = await getPartners();
        setPartners(fetchedPartners);
    } catch (err) {
        console.error("Failed to load partners:", err);
        setError("فشل في تحميل قائمة الشركاء من قاعدة البيانات.");
    }
  }

  useEffect(() => {
    loadPartners();
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await createPartner({ name, email, phone, type });
      setSuccess(`تم تسجيل الشريك الجديد \"${result.partner.name}\" بنجاح!`);
      setName(""); setEmail(""); setPhone("");
      loadPartners(); // إعادة تحميل الجدول
      const returnTo = searchParams.get("returnTo");
      if (returnTo) {
        // تحويل فوري للمستخدم وإعادته إلى شاشة المشتريات وحقن معرف المورد الجديد في الرابط تلقائياً
        router.push(`${returnTo}?newVendorId=${result.partner.id}`);
      }
    } catch(err: any) {
        setError(err.message || "حدث خطأ غير متوقع.");
    } finally {
      setLoading(false);
    }
  };

  const filteredPartners = useMemo(() => partners.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.phone?.toLowerCase().includes(searchTerm.toLowerCase())
  ), [partners, searchTerm]);

  return (
    <div className="p-8 bg-slate-50 min-h-screen font-sans" dir="rtl">
      
      {/* الهيدر الاحترافي */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Building className="text-slate-900" size={24} />
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">إدارة الشركاء (العملاء والموردين)</h1>
          </div>
          <p className="text-slate-500 text-xs mt-1">شاشة موحدة للتحكم ببيانات جهات الاتصال وتصنيفاتهم التجارية كـ Odoo CRM</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 1. فورم إضافة شريك جديد */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80 h-fit">
          <div className="flex items-center gap-2 mb-6 border-b pb-3 text-slate-800">
            <UserPlus size={18} />
            <h2 className="text-sm font-bold">تسجيل شريك عمل جديد</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {error && <div className="bg-rose-50 text-rose-700 text-xs font-bold p-3 rounded-lg">{error}</div>}
            {success && <div className="bg-emerald-50 text-emerald-700 text-xs font-bold p-3 rounded-lg">{success}</div>}

            <div>
              <label className="block font-bold text-slate-600 mb-1.5">الاسم التجاري بالكامل *</label>
              <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: شركة التوريدات المحدودة" className="w-full p-2.5 bg-slate-50 border rounded-lg text-sm focus:ring-2 focus:ring-slate-900 transition" />
            </div>

            <div>
              <label className="block font-bold text-slate-600 mb-1.5">البريد الإلكتروني</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" className="w-full p-2.5 bg-slate-50 border rounded-lg text-sm font-mono text-left focus:ring-2 focus:ring-slate-900 transition" />
            </div>

            <div>
              <label className="block font-bold text-slate-600 mb-1.5">رقم الهاتف / الجوال</label>
              <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01xxxxxxxxx" className="w-full p-2.5 bg-slate-50 border rounded-lg text-sm font-mono text-left focus:ring-2 focus:ring-slate-900 transition" />
            </div>

            <div>
              <label className="block font-bold text-slate-600 mb-1.5">تصنيف الشريك في النظام</label>
              <select value={type} onChange={(e) => setType(e.target.value as any)} className="w-full p-2.5 bg-slate-50 border rounded-lg text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-slate-900 transition">
                <option value="CUSTOMER">عميل مبيعات (Customer)</option>
                <option value="VENDOR">مورد مشتريات (Vendor)</option>
                <option value="BOTH">عميل ومورد معاً (Both)</option>
              </select>
            </div>

            <button type="submit" disabled={loading} className="w-full py-3 bg-slate-950 hover:bg-slate-800 text-white font-bold text-sm rounded-xl shadow-sm transition-all mt-6 disabled:opacity-50 flex items-center justify-center gap-2">
                <UserPlus size={16}/>
              {loading ? "جاري التسجيل..." : "إضافة الشريك إلى الدفاتر"}
            </button>
          </form>
        </div>

        {/* 2. جدول استعراض وفلترة الشركاء */}
        <div className="lg:col-span-2 flex flex-col">
          {/* بار البحث الفوري */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200/60 mb-4 flex items-center gap-3">
            <Search className="text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="ابحث بالاسم، البريد الإلكتروني، أو رقم الهاتف..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-transparent text-sm focus:outline-none"
            />
          </div>

          {/* الجدول الفعلي */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden flex-1">
            <table className="w-full text-right border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-slate-100 border-b border-slate-200 text-xs font-bold text-slate-500">
                  <th className="p-4">الاسم التجاري</th>
                  <th className="p-4">بيانات الاتصال</th>
                  <th className="p-4 text-center">التصنيف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-800">
                {filteredPartners.length > 0 ? filteredPartners.map((partner) => (
                  <tr key={partner.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 font-semibold text-slate-900">{partner.name}</td>
                    <td className="p-4 space-y-1.5 text-xs">
                      {partner.email && <div className="flex items-center gap-2 text-slate-500 font-mono"><Mail size={12} /> {partner.email}</div>}
                      {partner.phone && <div className="flex items-center gap-2 text-slate-500 font-mono"><Phone size={12} /> {partner.phone}</div>}
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-3 py-1 text-xs rounded-full font-bold border ${ // Consistent text size
                        partner.type === 'CUSTOMER' ? 'bg-blue-50 border-blue-200 text-blue-700' :
                        partner.type === 'VENDOR' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                        'bg-purple-50 border-purple-200 text-purple-700'
                      }`}>
                        {partner.type === 'CUSTOMER' ? 'عميل' : partner.type === 'VENDOR' ? 'مورد' : 'عميل ومورد'}
                      </span>
                    </td>
                  </tr>
                )) : (
                    <tr>
                        <td colSpan={3} className="text-center p-12 text-slate-400">
                            <Users size={32} className="mx-auto mb-2 stroke-1" />
                            <p className="font-bold">لا يوجد شركاء مسجلون بعد</p>
                            <p className="text-xs">أو أن نتائج البحث لم تعثر على تطابق</p>
                        </td>
                    </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
