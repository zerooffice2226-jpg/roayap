"use client"
import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { createAccount } from "@/app/actions/accounts"
import { Plus, Save, Loader } from "lucide-react"

type ParentAccount = {
  id: string
  code: string
  name: string
}

type Props = {
  parentAccounts: ParentAccount[]
}

type AccountType = "ASSET" | "LIABILITY" | "EQUITY" | "INCOME" | "EXPENSE"

export default function AddAccountForm({ parentAccounts }: Props) {
  const router = useRouter()
  const [code, setCode] = useState("")
  const [name, setName] = useState("")
  const [type, setType] = useState<AccountType>("ASSET")
  const [parentId, setParentId] = useState("")
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFeedback(null)
    setLoading(true)
    try {
      await createAccount({ code: code.trim(), name: name.trim(), type, parentId: parentId || undefined })
      setFeedback({ type: "success", message: "تم إنشاء الحساب بنجاح في شجرة الحسابات." })
      setCode("")
      setName("")
      setParentId("")
      setType("ASSET")
      router.push("/dashboard/accounts")
    } catch (error: any) {
      setFeedback({ type: "error", message: error?.message || "فشل إنشاء الحساب. حاول مرة أخرى." })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200/80 max-w-3xl mx-auto">
      {feedback && (
        <div className={`p-3 rounded-xl mb-5 ${feedback.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
          {feedback.message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">كود الحساب *</label>
            <input
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="مثال: 110201"
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">اسم الحساب *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: حساب العملاء"
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">نوع الحساب *</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as AccountType)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="ASSET">الأصول</option>
              <option value="LIABILITY">الخصوم</option>
              <option value="EQUITY">حقوق الملكية</option>
              <option value="INCOME">الإيرادات</option>
              <option value="EXPENSE">المصروفات</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">الحساب الأب</label>
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="">بدون حساب أب</option>
              {parentAccounts.map((acc) => (
                <option key={acc.id} value={acc.id}>{`${acc.code} - ${acc.name}`}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl transition-all disabled:opacity-60 flex items-center justify-center gap-3"
        >
          {loading ? <Loader className="animate-spin" size={18} /> : <Save size={18} />}
          {loading ? "جاري الإنشاء..." : "إنشاء حساب جديد"}
        </button>
      </form>
    </div>
  )
}
