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
