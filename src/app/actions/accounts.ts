'use server'
import { prisma } from "@/lib/prisma"

export async function getAccountTree() {
  // جلب كافة الحسابات مع بيانات العلاقات الهرمية وأرصدتها اللحظية
  return await prisma.account.findMany({
    where: { parentId: null }, // نبدأ بالحسابات الرئيسية (الآباء الأكبر)
    include: {
      children: {
        include: {
          children: true // يدعم حتى 3 مستويات تعمق (ويمكن جعلها ديناميكية بالكامل)
        }
      }
    },
    orderBy: { code: 'asc' }
  });
}

export async function getParentAccounts() {
  return await prisma.account.findMany({
    orderBy: { code: 'asc' },
    select: {
      id: true,
      code: true,
      name: true
    }
  });
}

export async function createAccount(data: { code: string; name: string; type: "ASSET" | "LIABILITY" | "EQUITY" | "INCOME" | "EXPENSE"; parentId?: string }) {
  const existingAccount = await prisma.account.findUnique({ where: { code: data.code } });
  if (existingAccount) {
    throw new Error("كود الحساب مسجل بالفعل في شجرة الحسابات. اختر كوداً آخر.");
  }

  return await prisma.account.create({
    data: {
      code: data.code,
      name: data.name,
      type: data.type,
      parentId: data.parentId || null
    }
  });
}
