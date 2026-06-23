// src/app/actions/product-ops.ts
"use server"
import { prisma } from "@/lib/prisma"

interface NewProductFlexibleInput {
  name: string;
  sku: string;
  salePrice: number;
  costPrice: number;
  currentStock: number;
  warehouseId?: string;
  incomeAccountId?: string;
  expenseAccountId?: string;
}

async function getDefaultAccounts(tx: any) {
  const incomeAccount = await tx.account.findFirst({
    where: {
      OR: [
        { code: "410101" },
        { code: "410000" },
        { name: { contains: "إيرادات المبيعات" } }
      ]
    }
  }) || await tx.account.findFirst({
    where: { type: "INCOME" }
  });

  const expenseAccount = await tx.account.findFirst({
    where: {
      OR: [
        { code: "510101" },
        { code: "510000" },
        { name: { contains: "تكلفة البضاعة" } },
        { name: { contains: "COGS" } }
      ]
    }
  }) || await tx.account.findFirst({
    where: { type: "EXPENSE" }
  });

  return { incomeAccount, expenseAccount };
}

export async function createNewProduct(data: NewProductFlexibleInput) {
  return await prisma.$transaction(async (tx) => {
    
    const existingProduct = await tx.product.findUnique({
      where: { sku: data.sku }
    });
    if (existingProduct) throw new Error("باركود المنتج (SKU) مسجل مسبقاً في النظام");

    const { incomeAccount: defaultIncome, expenseAccount: defaultExpense } = await getDefaultAccounts(tx);

    let incomeAccount = null;
    if (data.incomeAccountId) {
      incomeAccount = await tx.account.findUnique({ where: { id: data.incomeAccountId } });
    }
    if (!incomeAccount) {
      incomeAccount = defaultIncome;
    }
    if (!incomeAccount) {
      throw new Error("لا يوجد حساب إيرادات المبيعات! يرجى إنشاء حساب (410101)");
    }

    let expenseAccount = null;
    if (data.expenseAccountId) {
      expenseAccount = await tx.account.findUnique({ where: { id: data.expenseAccountId } });
    }
    if (!expenseAccount) {
      expenseAccount = defaultExpense;
    }
    if (!expenseAccount) {
      throw new Error("لا يوجد حساب تكلفة البضاعة المباعة! يرجى إنشاء حساب (510101)");
    }

    const productData: any = {
      name: data.name,
      sku: data.sku,
      salePrice: data.salePrice,
      costPrice: data.costPrice,
      incomeAccountId: incomeAccount.id,
      expenseAccountId: expenseAccount.id,
    };

    if (data.currentStock > 0 && data.warehouseId) {
      productData.stockBalances = {
        create: {
          warehouseId: data.warehouseId,
          quantity: data.currentStock
        }
      };
    }

    const product = await tx.product.create({ data: productData });

    if (data.currentStock > 0 && data.warehouseId) {
      await tx.stockMove.create({
        data: {
          reference: `STK/OP/${new Date().getFullYear()}/${data.sku}`,
          type: "INCOMING",
          quantity: data.currentStock,
          unitCost: data.costPrice,
          productId: product.id,
          destWarehouseId: data.warehouseId
        }
      });
    }

    return { 
      success: true, 
      product,
      message: `✅ تم إنشاء المنتج!\n- الإيراد: ${incomeAccount.name} (${incomeAccount.code})\n- التكلفة: ${expenseAccount.name} (${expenseAccount.code})`
    };
  });
}

// ✅ دلوقتي العلاقات شغالة بدون as any
export async function getProducts() {
  return await prisma.product.findMany({
    include: {
      stockBalances: true,
      incomeAccount: true,
      expenseAccount: true
    },
    orderBy: { createdAt: "desc" }
  });
}

export async function getProductById(id: string) {
  return await prisma.product.findUnique({
    where: { id },
    include: {
      incomeAccount: true,
      expenseAccount: true,
      stockBalances: {
        include: {
          warehouse: true
        }
      },
    }
  });
}