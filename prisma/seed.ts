import { PrismaClient, AccountType, JournalType, PartnerType } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 جاري بدء حقن البيانات الأساسية للنظام المالي...')

  // 1. إنشاء الحسابات الرئيسية والآباء في شجرة الحسابات القياسية
  const assetsParent = await prisma.account.create({
    data: { code: '100000', name: 'الأصول', type: AccountType.ASSET }
  })

  const currentAssets = await prisma.account.create({
    data: { code: '110000', name: 'الأصول المتداولة', type: AccountType.ASSET, parentId: assetsParent.id }
  })

  const cashAndEquivalents = await prisma.account.create({
    data: { code: '110100', name: 'النقدية وما في حكمها', type: AccountType.ASSET, parentId: currentAssets.id }
  })

  await prisma.account.create({
    data: { code: '110101', name: 'الخزينة النقدية', type: AccountType.ASSET, parentId: cashAndEquivalents.id }
  })

  const bankCurrentAccount = await prisma.account.create({
    data: { code: '110102', name: 'حساب بنك جاري', type: AccountType.ASSET, parentId: cashAndEquivalents.id }
  })

  await prisma.account.create({
    data: { code: '110103', name: 'استثمارات قصيرة الأجل', type: AccountType.ASSET, parentId: cashAndEquivalents.id }
  })

  const receivablesParent = await prisma.account.create({
    data: { code: '110200', name: 'الذمم المدينة', type: AccountType.ASSET, parentId: currentAssets.id }
  })

  await prisma.account.create({
    data: { code: '110201', name: 'حساب العملاء', type: AccountType.ASSET, parentId: receivablesParent.id }
  })

  const inventoryParent = await prisma.account.create({
    data: { code: '110400', name: 'المخزون', type: AccountType.ASSET, parentId: currentAssets.id }
  })

  await prisma.account.create({
    data: { code: '110401', name: 'مخزن المنتجات الجاهزة', type: AccountType.ASSET, parentId: inventoryParent.id }
  })

  const nonCurrentAssets = await prisma.account.create({
    data: { code: '120000', name: 'الأصول غير المتداولة', type: AccountType.ASSET, parentId: assetsParent.id }
  })

  await prisma.account.create({
    data: { code: '120100', name: 'الأصول الثابتة', type: AccountType.ASSET, parentId: nonCurrentAssets.id }
  })

  const liabilitiesParent = await prisma.account.create({
    data: { code: '200000', name: 'الخصوم والالتزامات', type: AccountType.LIABILITY }
  })

  const currentLiabilities = await prisma.account.create({
    data: { code: '210000', name: 'الخصوم المتداولة', type: AccountType.LIABILITY, parentId: liabilitiesParent.id }
  })

  await prisma.account.create({
    data: { code: '210100', name: 'الحسابات الدائنة', type: AccountType.LIABILITY, parentId: currentLiabilities.id }
  })

  await prisma.account.create({
    data: { code: '210200', name: 'الذمم الدائنة للموردين', type: AccountType.LIABILITY, parentId: currentLiabilities.id }
  })

  await prisma.account.create({
    data: { code: '210300', name: 'الديون قصيرة الأجل', type: AccountType.LIABILITY, parentId: currentLiabilities.id }
  })

  const equityParent = await prisma.account.create({
    data: { code: '300000', name: 'حقوق الملكية', type: AccountType.EQUITY }
  })

  await prisma.account.create({
    data: { code: '310000', name: 'رأس المال', type: AccountType.EQUITY, parentId: equityParent.id }
  })

  await prisma.account.create({
    data: { code: '320000', name: 'الأرباح المحتجزة', type: AccountType.EQUITY, parentId: equityParent.id }
  })

  const incomeParent = await prisma.account.create({
    data: { code: '400000', name: 'الإيرادات', type: AccountType.INCOME }
  })

  const salesRevenue = await prisma.account.create({
    data: { code: '410000', name: 'إيرادات المبيعات', type: AccountType.INCOME, parentId: incomeParent.id }
  })

  await prisma.account.create({
    data: { code: '410101', name: 'إيرادات مبيعات البضائع', type: AccountType.INCOME, parentId: salesRevenue.id }
  })

  await prisma.account.create({
    data: { code: '410200', name: 'إيرادات الخدمات', type: AccountType.INCOME, parentId: incomeParent.id }
  })

  const expenseParent = await prisma.account.create({
    data: { code: '500000', name: 'المصروفات والتكاليف', type: AccountType.EXPENSE }
  })

  const cogsParent = await prisma.account.create({
    data: { code: '510000', name: 'تكلفة البضاعة المباعة', type: AccountType.EXPENSE, parentId: expenseParent.id }
  })

  await prisma.account.create({
    data: { code: '510101', name: 'مصروف تكلفة البضاعة المباعة', type: AccountType.EXPENSE, parentId: cogsParent.id }
  })

  const operatingExpenses = await prisma.account.create({
    data: { code: '520000', name: 'المصروفات التشغيلية', type: AccountType.EXPENSE, parentId: expenseParent.id }
  })

  await prisma.account.create({
    data: { code: '520101', name: 'مصروف الإيجار', type: AccountType.EXPENSE, parentId: operatingExpenses.id }
  })

  await prisma.account.create({
    data: { code: '520201', name: 'مصروف المرافق', type: AccountType.EXPENSE, parentId: operatingExpenses.id }
  })

  await prisma.account.create({
    data: { code: '520301', name: 'مصروف الرواتب', type: AccountType.EXPENSE, parentId: operatingExpenses.id }
  })

  await prisma.account.create({
    data: { code: '520401', name: 'مصروف الاهلاك', type: AccountType.EXPENSE, parentId: operatingExpenses.id }
  })

  console.log('✅ تم إنشاء شجرة الحسابات القياسية بنجاح.')

  // 2. إنشاء دفاتر اليومية القياسية
  await prisma.journal.create({
    data: { code: 'INV', name: 'دفتر يومية المبيعات', type: JournalType.SALE }
  })

  await prisma.journal.create({
    data: { code: 'BNK', name: 'دفتر يومية البنك', type: JournalType.BANK }
  })

  await prisma.journal.create({
    data: { code: 'GEN', name: 'دفتر العمليات العامة', type: JournalType.GENERAL }
  })

  console.log('✅ تم إنشاء دفاتر اليومية القياسية.')

  // 3. إنشاء شركاء افتراضيين للتجربة
  await prisma.partner.create({
    data: { name: 'شركة الأمل للتجارة والتوزيع', email: 'info@alamal.com', type: PartnerType.CUSTOMER }
  })

  await prisma.partner.create({
    data: { name: 'شركة النجاح للمقاولات', email: 'sales@elnajah.com', type: PartnerType.VENDOR }
  })

  console.log('✅ تم إنشاء الشركاء الافتراضيين.')

  // 4. إنشاء منتج تجريبي مرتبط بحسابات الإيرادات والمصروفات للتوجيه الآلي
  await prisma.product.create({
    data: {
      name: 'شاشة ذكية 55 بوصة سمارة',
      sku: 'SH-55-SMART',
      salePrice: 15000.0,
      costPrice: 10000.0,
      incomeAccountId: salesRevenue.id,
      expenseAccountId: cogsParent.id
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
