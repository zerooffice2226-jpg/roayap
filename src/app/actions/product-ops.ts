// src/app/actions/product-ops.ts
"use server"
import { prisma } from "@/lib/prisma"

interface NewProductFlexibleInput {
  name: string;
  sku: string;
  salePrice: number;
  costPrice: number;
  currentStock: number;       // الرصيد الافتتاحي
  warehouseId?: string;       // المخزن المختار (اختياري)
  incomeAccountId: string;
  expenseAccountId: string;
}

export async function createNewProduct(data: NewProductFlexibleInput) {
  return await prisma.$transaction(async (tx) => {
    
    // 1. التحقق من عدم تكرار الباركود (SKU) لحماية النزاهة
    const existingProduct = await tx.product.findUnique({
      where: { sku: data.sku }
    });
    if (existingProduct) throw new Error("باركود المنتج (SKU) مسجل مسبقاً في النظام");

    // 2. بناء كود الإنشاء الأساسي لبطاقة المنتج محاسبياً
    const productData: any = {
      name: data.name,
      sku: data.sku,
      salePrice: data.salePrice,
      costPrice: data.costPrice,
      incomeAccountId: data.incomeAccountId,
      expenseAccountId: data.expenseAccountId,
    };

    // 3. سياسة أودو المرنة: إذا وجد رصيد افتتاحي ومخزن محدد، يتم الربط فوراً
    if (data.currentStock > 0 && data.warehouseId) {
      productData.stockBalances = {
        create: {
          warehouseId: data.warehouseId,
          quantity: data.currentStock
        }
      };
    }

    // 4. إنشاء المنتج سحابياً في Supabase
    const product = await tx.product.create({
      data: productData
    });

    // 5. إذا كان هناك رصيد افتتاحي، نسجل حركة مخزنية واردة (INCOMING) للتاريخ والتدقيق
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

    return { success: true, product };
  });
}

export async function getProducts() {
  // 💡 التعديل المحوري لضم أرقام الجرد الفعلي للمخازن المتعددة
  return await prisma.product.findMany({
    include: {
      stockBalances: true // ضم كميات الجرد الموزعة في المخازن لكل صنف
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
