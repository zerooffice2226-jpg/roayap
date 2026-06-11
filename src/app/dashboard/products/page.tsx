import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Plus } from "lucide-react";

export default async function ProductsPage() {
  const products = await prisma.product.findMany();

  return (
    <div className="p-8 bg-slate-50 min-h-screen font-sans">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Products</h1>
          <p className="text-slate-500 mt-1">Manage all products in your inventory.</p>
        </div>
        <Link href="/dashboard/products/new">
          <button className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 bg-indigo-600 text-white">
            <Plus className="-ml-1 mr-2 h-5 w-5" />
            New Product
          </button>
        </Link>
      </div>

      <div className="-mx-4 mt-8 sm:-mx-0">
        <table className="min-w-full divide-y divide-gray-300">
          <thead>
            <tr>
              <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0">Name</th>
              <th scope="col" className="hidden px-3 py-3.5 text-left text-sm font-semibold text-gray-900 lg:table-cell">SKU</th>
              <th scope="col" className="hidden px-3 py-3.5 text-left text-sm font-semibold text-gray-900 sm:table-cell">Sale Price</th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Cost Price</th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Stock</th>
              <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-0"><span className="sr-only">Edit</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {products.map((product) => (
              <tr key={product.id}>
                <td className="w-full max-w-0 py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:w-auto sm:max-w-none sm:pl-0">
                  {product.name}
                  <dl className="font-normal lg:hidden">
                    <dt className="sr-only">SKU</dt>
                    <dd className="mt-1 truncate text-gray-700">{product.sku}</dd>
                    <dt className="sr-only sm:hidden">Sale Price</dt>
                    <dd className="mt-1 truncate text-gray-500 sm:hidden">{product.salePrice}</dd>
                  </dl>
                </td>
                <td className="hidden px-3 py-4 text-sm text-gray-500 lg:table-cell">{product.sku}</td>
                <td className="hidden px-3 py-4 text-sm text-gray-500 sm:table-cell">{product.salePrice}</td>
                <td className="px-3 py-4 text-sm text-gray-500">{product.costPrice}</td>
                <td className="px-3 py-4 text-sm text-gray-500">{product.currentStock}</td>
                <td className="py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-0">
                  <a href="#" className="text-indigo-600 hover:text-indigo-900">Edit<span className="sr-only">, {product.name}</span></a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
