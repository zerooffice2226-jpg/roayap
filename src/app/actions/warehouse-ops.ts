// src/app/actions/warehouse-ops.ts
"use server"
import { prisma } from "@/lib/prisma"

interface WarehouseInput {
  name: string;
  code: string; // كود فريد للمستودع مثل: WH-ALEX
  location?: string;
}

export async function createWarehouse(data: WarehouseInput) {
  try {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.warehouse.findUnique({ where: { code: data.code.toUpperCase() } });
      if (existing) throw new Error("كود المستودع مسجل مسبقاً بالنظام");

      const warehouse = await tx.warehouse.create({
        data: {
          name: data.name,
          code: data.code.toUpperCase(),
          location: data.location || null
        }
      });
      return { success: true, warehouse };
    });
  } catch (error: any) {
    throw new Error(error.message || "فشل في حفظ المستودع");
  }
}

export async function getWarehousesList() {
  return await prisma.warehouse.findMany({ orderBy: { createdAt: "asc" } });
}