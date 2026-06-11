// src/app/actions/partner-ops.ts
"use server"
import { prisma } from "@/lib/prisma"

interface PartnerInput {
  name: string;
  email?: string;
  phone?: string;
  type: "CUSTOMER" | "VENDOR" | "BOTH";
}

export async function createPartner(data: PartnerInput) {
  try {
    const newPartner = await prisma.partner.create({
      data: {
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        type: data.type
      }
    });
    return { success: true, partner: newPartner };
  } catch (error: any) {
    console.error("خطأ أثناء إضافة الشريك:", error.message);
    // Provide a more specific error message if it's a unique constraint violation
    if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
        throw new Error("فشل في إضافة الشريك: البريد الإلكتروني مستخدم بالفعل.");
    }
    throw new Error("فشل في إضافة الشريك، تأكد من البيانات المدخلة.");
  }
}

export async function getPartners() {
  return await prisma.partner.findMany({
    orderBy: { name: "asc" }
  });
}
