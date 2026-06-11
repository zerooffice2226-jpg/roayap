import { PrismaClient, AccountType, JournalType, PartnerType } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 جاري بدء حقن البيانات الأساسية للنظام المالي...')

  // 1. إنشاء الحسابات الرئيسية والآباء في شجرة الحسابات (Chart of Accounts)
  const assetsParent = await prisma.account.create({
    data: { code: '100000', name: 'الأصول', type: AccountType.ASSET }
  })

  const liabilitiesParent = await prisma.account.create({
    data: { code: '200000', name: 'الخصوم والالتزامات', type: AccountType.LIABILITY }
  })

  const incomeParent = await prisma.account.create({
    data: { code: '400000', name: 'الإيرادات', type: AccountType.INCOME }
  })

  const expenseParent = await prisma.account.create({
    data: { code: '500000', name: 'المصروفات والتكاليف', type: AccountType.EXPENSE }
  })

  // 2. إنشاء الحسابات الفرعية (التحليلية) المرتبطة بالآباء
  const customerAccount = await prisma.account.create({
    data: { code: '110201', name: 'حساب العملاء (المدينون)', type: AccountType.ASSET, parentId: assetsParent.id }
  })

  const bankAccount = await prisma.account.create({
    data: { code: '110102', name: 'حساب بنك مصر الجاري', type: AccountType.ASSET, parentId: assetsParent.id }
  })

  const inventoryAccount = await prisma.account.create({
    data: { code: '110401', name: 'مخزن المنتجات الجاهزة', type: AccountType.ASSET, parentId: assetsParent.id }
  })

  const salesIncomeAccount = await prisma.account.create({
    data: { code: '410101', name: 'إيرادات مبيعات البضائع', type: AccountType.INCOME, parentId: incomeParent.id }
  })

  const cogsAccount = await prisma.account.create({
    data: { code: '510101', name: 'مصروف تكلفة البضاعة المباعة', type: AccountType.EXPENSE, parentId: expenseParent.id }
  })

  console.log('✅ تم إنشاء شجرة الحسابات الهرمية بنجاح.')

  // 3. إنشاء دفاتر اليومية القياسية لـ أودو (Journals)
  const salesJournal = await prisma.journal.create({
    data: { code: 'INV', name: 'دفتر يومية المبيعات', type: JournalType.SALE }
  })

  const bankJournal = await prisma.journal.create({
    data: { code: 'BNK', name: 'دفتر يومية البنك', type: JournalType.BANK }
  })

  const generalJournal = await prisma.journal.create({
    data: { code: 'GEN', name: 'دفتر العمليات العامة', type: JournalType.GENERAL }
  })

  console.log('✅ تم إنشاء دفاتر اليومية (مبيعات، بنك، عمليات عامة).')

  // 4. إنشاء شركاء افتراضيين للتجربة (Partners)
  const sampleCustomer = await prisma.partner.create({
    data: { name: 'شركة الأمل للتجارة والتوزيع', email: 'info@alamal.com', type: PartnerType.CUSTOMER }
  })

  console.log('✅ تم إنشاء الشركاء والعملاء الافتراضيين.')

  // 5. إنشاء منتج تجريبي مرتبط بحسابات الإيرادات والمصروفات للتوجيه الآلي
  await prisma.product.create({
    data: {
      name: 'شاشة ذكية 55 بوصة سمارة',
      sku: 'SH-55-SMART',
      salePrice: 15000.00,
      costPrice: 10000.00,
      currentStock: 50, // رصيد مخزني افتتاحي
      incomeAccountId: salesIncomeAccount.id,
      expenseAccountId: cogsAccount.id
    }
  })

  console.log('✅ تم إنشاء المنتجات وتوجيهها محاسبياً بنجاح.')
  console.log('🎉 اكتمل حقن البيانات! المنظومة جاهزة تماماً للتشغيل الحقيقي والقيود المؤتمتة.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
