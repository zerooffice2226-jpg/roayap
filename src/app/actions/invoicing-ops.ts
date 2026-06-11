// src/app/actions/invoicing-ops.ts
"use server"
import { prisma } from "@/lib/prisma"

interface InvoiceInput {
  partnerId: string;
  dueDate: string;
  warehouseId: string;
  items: { productId: string; quantity: number; priceUnit: number; warehouseId?: string; }[];
}

export async function createAndPostInvoice(data: InvoiceInput) {
  return await prisma.$transaction(async (tx) => {
    const currentYear = new Date().getFullYear();
    const today = new Date();

    // 1. جلب دفتر يومية المبيعات أو تأسيسه تلقائياً فوراً لمنع التعطل
    let journal = await tx.journal.findFirst({ where: { type: "SALE" } });
    if (!journal) {
      journal = await tx.journal.create({
        data: { name: "دفتر يومية المبيعات العمومية", code: "INV", type: "SALE" }
      });
    }

    // 2. جلب الحسابات التوجيهية وتأسيسها تلقائياً إذا نقصت في الدليل
    let customerAccount = await tx.account.findUnique({ where: { code: "110201" } }); // حساب العملاء
    if (!customerAccount) {
      customerAccount = await tx.account.create({
        data: { code: "110201", name: "حساب ذمم العملاء (المدينون)", type: "ASSET" }
      });
    }

    let invAccount = await tx.account.findUnique({ where: { code: "110401" } }); // حساب المخزن
    if (!invAccount) {
      invAccount = await tx.account.create({
        data: { code: "110401", name: "حساب مخزن بضائع بغرض البيع", type: "ASSET" }
      });
    }

    let salesAccount = await tx.account.findUnique({ where: { code: "410101" } }); // حساب المبيعات
    if (!salesAccount) {
        salesAccount = await tx.account.create({
            data: { code: "410101", name: "إيرادات المبيعات العامة", type: "INCOME" }
        });
    }

    let cogsAccount = await tx.account.findUnique({ where: { code: "510101" } }); // حساب تكلفة البضاعة
    if (!cogsAccount) {
        cogsAccount = await tx.account.create({
            data: { code: "510101", name: "تكلفة البضاعة المباعة", type: "EXPENSE" }
        });
    }

    // 3. توليد الرقم التسلسلي للفاتورة
    const prefix = `${journal.code}/${currentYear}/`;
    const lastInvoice = await tx.journalMove.findFirst({
      where: { journalId: journal.id, name: { startsWith: prefix } },
      orderBy: { name: 'desc' },
      select: { name: true }
    });
    let nextNum = 1;
    if (lastInvoice) {
      const parts = lastInvoice.name.split('/');
      nextNum = parseInt(parts[parts.length - 1], 10) + 1;
    }
    const sequenceName = `${prefix}${String(nextNum).padStart(4, '0')}`;

    // 4. إنشاء رأس القيد المحاسبي (Journal Move)
    const journalMove = await tx.journalMove.create({
      data: {
        name: sequenceName,
        journalId: journal.id,
        state: "POSTED",
        date: today,
        ref: `فاتورة مبيعات رقم ${sequenceName}`
      }
    });

    // 5. حساب الإجمالي وتجهيز بنود الفاتورة
    let totalAmount = 0;
    const invoiceLinesData = data.items.map(item => {
      const subtotal = item.quantity * item.priceUnit;
      totalAmount += subtotal;
      return {
        productId: item.productId,
        quantity: item.quantity,
        priceUnit: item.priceUnit,
        subtotal: subtotal
      };
    });

    // 6. إنشاء الفاتورة وربطها بالقيد
    await tx.invoice.create({
      data: {
        number: sequenceName,
        type: "OUT_INVOICE",
        date: today,
        dueDate: new Date(data.dueDate),
        state: "POSTED",
        partnerId: data.partnerId,
        totalAmount: totalAmount,
        journalMoveId: journalMove.id,
        lines: { create: invoiceLinesData }
      }
    });

    // 7. إنشاء قيود اليومية المالية التفصيلية (Journal Lines)
    await tx.journalLine.create({
      data: { name: `استحقاق على عميل لفاتورة ${sequenceName}`, debit: totalAmount, credit: 0, balance: totalAmount, moveId: journalMove.id, accountId: customerAccount.id, partnerId: data.partnerId }
    });
    await tx.journalLine.create({
      data: { name: `إيراد مبيعات فاتورة ${sequenceName}`, debit: 0, credit: totalAmount, balance: -totalAmount, moveId: journalMove.id, accountId: salesAccount.id }
    });

    let totalCost = 0;

    // 8. معالجة المخزون (خصم الكميات) وتكلفة البضاعة
    for (const item of data.items) {
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      if (!product) throw new Error(`المنتج بالمعرف ${item.productId} غير موجود`);

      const warehouseToUse = item.warehouseId || data.warehouseId;

      await tx.productStock.updateMany({
        where: {
          productId: item.productId,
          warehouseId: warehouseToUse
        },
        data: {
          quantity: { decrement: item.quantity }
        }
      });

      await tx.stockMove.create({
          data: {
            reference: sequenceName,
            type: "OUTGOING",
            quantity: item.quantity,
            unitCost: product.costPrice,
            productId: product.id,
            sourceWarehouseId: warehouseToUse, 
            partnerId: data.partnerId
          }
      });

      const itemCost = item.quantity * product.costPrice;
      totalCost += itemCost;
    }

    // قيد تكلفة البضاعة المباعة (COGS)
    await tx.journalLine.create({
      data: { name: `تكلفة البضاعة المباعة لفاتورة ${sequenceName}`, debit: totalCost, credit: 0, balance: totalCost, moveId: journalMove.id, accountId: cogsAccount.id }
    });
    // قيد المخزون (دائن بقيمة التكلفة)
    await tx.journalLine.create({
      data: { name: `خروج بضاعة من المخزن لفاتورة ${sequenceName}`, debit: 0, credit: totalCost, balance: -totalCost, moveId: journalMove.id, accountId: invAccount.id }
    });

    // 9. تحديث الأرصدة التراكمية في شجرة الحسابات
    await tx.account.update({ where: { id: customerAccount.id }, data: { currentBalance: { increment: totalAmount } } });
    await tx.account.update({ where: { id: salesAccount.id }, data: { currentBalance: { decrement: totalAmount } } });
    await tx.account.update({ where: { id: cogsAccount.id }, data: { currentBalance: { increment: totalCost } } });
    await tx.account.update({ where: { id: invAccount.id }, data: { currentBalance: { decrement: totalCost } } });

    return { success: true, invoiceNumber: sequenceName };
  });
}
