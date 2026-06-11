'use client'

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useTransition, useState } from "react";

const formSchema = z.object({
  name: z.string().min(2, { message: "Product name must be at least 2 characters." }),
  sku: z.string().min(2, { message: "SKU must be at least 2 characters." }),
  salePrice: z.coerce.number().min(0, { message: "Sale price must be a positive number." }),
  costPrice: z.coerce.number().min(0, { message: "Cost price must be a positive number." }),
  incomeAccountId: z.string(),
  expenseAccountId: z.string(),
});

export function NewProductForm({ accounts }: { accounts: { id: string, name: string, type: string }[] }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      sku: "",
      salePrice: 0,
      costPrice: 0,
    },
  });

  const onSubmit = (data: any) => {
    console.log("تمت محاكاة إضافة المنتج بنجاح:", data);
    alert("تم حفظ المنتج تجريبياً في الواجهة!");
  };

  const incomeAccounts = accounts.filter(acc => acc.type === 'INCOME');
  const expenseAccounts = accounts.filter(acc => acc.type === 'EXPENSE');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 bg-white p-8 rounded-lg shadow-lg">
      {error && <div className="p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50" role="alert">{error}</div>}
      
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">Product Name</label>
        <input 
          id="name"
          type="text"
          placeholder="e.g., T-Shirt"
          {...register("name")}
          className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
        {errors.name && <p className="mt-2 text-sm text-red-600">{errors.name.message}</p>}
      </div>

      <div>
        <label htmlFor="sku" className="block text-sm font-medium text-gray-700">SKU (Stock Keeping Unit)</label>
        <input 
          id="sku"
          type="text"
          placeholder="e.g., TSHIRT-BLK-L"
          {...register("sku")}
          className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
        {errors.sku && <p className="mt-2 text-sm text-red-600">{errors.sku.message}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <label htmlFor="salePrice" className="block text-sm font-medium text-gray-700">Sale Price</label>
          <input 
            id="salePrice"
            type="number"
            {...register("salePrice")}
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
          {errors.salePrice && <p className="mt-2 text-sm text-red-600">{errors.salePrice.message}</p>}
        </div>
        <div>
          <label htmlFor="costPrice" className="block text-sm font-medium text-gray-700">Cost Price</label>
          <input 
            id="costPrice"
            type="number"
            {...register("costPrice")}
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
          {errors.costPrice && <p className="mt-2 text-sm text-red-600">{errors.costPrice.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <label htmlFor="incomeAccountId" className="block text-sm font-medium text-gray-700">Income Account</label>
          <select
            id="incomeAccountId"
            {...register("incomeAccountId")}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          >
            <option value="">Select an income account</option>
            {incomeAccounts.map(account => (
              <option key={account.id} value={account.id}>{account.name}</option>
            ))}
          </select>
          {errors.incomeAccountId && <p className="mt-2 text-sm text-red-600">{errors.incomeAccountId.message}</p>}
        </div>
        <div>
          <label htmlFor="expenseAccountId" className="block text-sm font-medium text-gray-700">Expense/COGS Account</label>
          <select
            id="expenseAccountId"
            {...register("expenseAccountId")}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          >
            <option value="">Select an expense account</option>
            {expenseAccounts.map(account => (
              <option key={account.id} value={account.id}>{account.name}</option>
            ))}
          </select>
          {errors.expenseAccountId && <p className="mt-2 text-sm text-red-600">{errors.expenseAccountId.message}</p>}
        </div>
      </div>

      <button type="submit" disabled={isPending} className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50">
        {isPending ? "Creating..." : "Create Product"}
      </button>
    </form>
  )
}
