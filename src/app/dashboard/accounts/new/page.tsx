import { getParentAccounts } from "@/app/actions/accounts"
import AddAccountForm from "./AddAccountForm"

export const dynamic = 'force-dynamic'

export default async function NewAccountPage() {
  const parentAccounts = await getParentAccounts()

  return (
    <div className="p-8 bg-slate-50 min-h-screen font-sans" dir="rtl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">إضافة حساب جديد في شجرة الحسابات</h1>
          <p className="text-slate-500 text-sm mt-1">أضف حساباً جديداً مع كود الحساب والمستوى الأبوي في الشجرة.</p>
        </div>
      </div>
      <AddAccountForm parentAccounts={parentAccounts} />
    </div>
  )
}
