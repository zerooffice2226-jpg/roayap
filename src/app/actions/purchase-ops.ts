
// src/app/actions/purchase-ops.ts
"use server"
import { prisma } from "@/lib/prisma"

interface PurchaseInput {
  vendorId: string;
  dueDate: string;
  warehouseId: string; // المخزن المختار لاستلام التوريد
  items: { productId: string; quantity: number; priceUnit: number }[];
}

export async function createAndPostPurchaseBill(data: PurchaseInput) {
  return await prisma.$transaction(async (tx) => {
    const currentYear = new Date().getFullYear();
    const today = new Date();
    
    // 1. حساب الإجمالي وتجهيز السطور
    let totalAmount = 0;
    const billLines = data.items.map(item => {
      const subtotal = item.quantity * item.priceUnit;
      totalAmount += subtotal;
      return { productId: item.productId, quantity: item.quantity, priceUnit: item.priceUnit, subtotal };
    });

    // 2. جلب الحسابات والدفاتر أو تأسيسها تلقائياً كـ Odoo Fallback Strategy
    let journal = await tx.journal.findFirst({ where: { type: "PURCHASE" } });
    if (!journal) {
      // تأسيس دفتر المشتريات فوراً في حال عدم وجوده
      journal = await tx.journal.create({
        data: { name: "دفتر يومية المشتريات", code: "BILL", type: "PURCHASE" }
      });
    }

    let vendorAccount = await tx.account.findUnique({ where: { code: "210101" } });
    if (!vendorAccount) {
      // تأسيس حساب الموردين (خصوم) تلقائياً في شجرة الحسابات
      vendorAccount = await tx.account.create({
        data: { code: "210101", name: "حساب الموردين (الدائنون)", type: "LIABILITY" }
      });
    }

    let inventoryAccount = await tx.account.findUnique({ where: { code: "110401" } });
    if (!inventoryAccount) {
      // تأسيس حساب أصول المخزن (أصول) تلقائياً في شجرة الحسابات
      inventoryAccount = await tx.account.create({
        data: { code: "110401", name: "حساب مخزن بضائع بغرض البيع", type: "ASSET" }
      });
    }

    // 3. توليد السيريال الفريد للفاتورة
    const prefix = `${journal.code}/${currentYear}/`;
    const lastBill = await tx.journalMove.findFirst({
      where: { journalId: journal.id, name: { startsWith: prefix } },
      orderBy: { name: 'desc' },
      select: { name: true }
    });
    let nextNum = 1;
    if (lastBill) {
      const parts = lastBill.name.split('/');
      nextNum = parseInt(parts[parts.length - 1], 10) + 1;
    }
    const sequenceName = `${prefix}${String(nextNum).padStart(4, '0')}`;

    // 4. إنشاء رأس القيد المالي
    const journalMove = await tx.journalMove.create({
      data: { name: sequenceName, journalId: journal.id, state: "POSTED", date: today, ref: `فاتورة مشتريات واردة رقم ${sequenceName}` }
    });

    // 5. إنشاء مستند الفاتورة المعتمدة
    await tx.invoice.create({
      data: { number: sequenceName, type: "IN_INVOICE", date: today, dueDate: new Date(data.dueDate), state: "POSTED", partnerId: data.vendorId, totalAmount, journalMoveId: journalMove.id, lines: { create: billLines } }
    });

    // سطر القيد المالي للمورد (دائن) باستخدام الـ UUID الحقيقي
    await tx.journalLine.create({
      data: { name: `استحقاق مورد عن فاتورة ${sequenceName}`, debit: 0, credit: totalAmount, balance: -totalAmount, moveId: journalMove.id, accountId: vendorAccount.id, partnerId: data.vendorId }
    });

    // 6. معالجة وحقن المخازن والحركات (تحديث حقيقي ومضمون)
    for (const item of data.items) {
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      if (!product) throw new Error("المنتج غير موجود في المستودع");

      const itemSubtotal = item.quantity * item.priceUnit;

      // زيادة الجرد الفعلي للمخزن المختار بـ ProductStock
      await tx.productStock.upsert({
        where: { productId_warehouseId: { productId: product.id, warehouseId: data.warehouseId } },
        update: { quantity: { increment: item.quantity } },
        create: { productId: product.id, warehouseId: data.warehouseId, quantity: item.quantity }
      });

      // تسجيل مستند الحركة المخزنية الواردة بشكل رسمي
      await tx.stockMove.create({
        data: { reference: sequenceName, type: "INCOMING", quantity: item.quantity, unitCost: item.priceUnit, productId: product.id, destWarehouseId: data.warehouseId, partnerId: data.vendorId }
      });

      // سطر قيد أصل المخزن (مدين) بالـ UUID الحقيقي
      await tx.journalLine.create({
        data: { name: `تزويد أصل المخزن لمنتج: ${product.name}`, debit: itemSubtotal, credit: 0, balance: itemSubtotal, moveId: journalMove.id, accountId: inventoryAccount.id }
      });

      // تحديث أرصدة شجرة الحسابات اللحظية
      await tx.account.update({ where: { id: inventoryAccount.id }, data: { currentBalance: { increment: itemSubtotal } } });
    }

    await tx.account.update({ where: { id: vendorAccount.id }, data: { currentBalance: { decrement: totalAmount } } });

    return { success: true, billNumber: sequenceName };
  });
}
