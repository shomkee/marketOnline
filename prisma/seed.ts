/**
 * Сид-скрипт с демо-данными.
 * Запуск: npm run db:seed
 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import crypto from 'node:crypto'

const prisma = new PrismaClient()

/** Шифрование AES-256-GCM — та же схема, что и в src/lib/crypto.ts. */
function encrypt(plain: string): string {
  const keyHex = process.env.ENCRYPTION_KEY
  if (!keyHex || keyHex.length !== 64) {
    throw new Error('ENCRYPTION_KEY должен быть 64 hex-символа (32 байта)')
  }

  const key = Buffer.from(keyHex, 'hex')
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()

  return [iv.toString('base64'), tag.toString('base64'), encrypted.toString('base64')].join('.')
}

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex')
}

async function main() {
  console.log('→ Создаём настройки магазина')

  await prisma.settings.upsert({
    where: { id: 'singleton' },
    update: {},
    create: {
      id: 'singleton',
      shopName: 'Digital Store',
      shopDescription: 'Цифровые товары с мгновенной автовыдачей 24/7',
      contactEmail: 'support@example.com',
      telegramUsername: '@support',
      currency: 'RUB',
      metaTitle: 'Digital Store — цифровые товары с автовыдачей',
      metaDescription: 'Ключи, аккаунты, подписки и файлы. Оплата криптой или картой, выдача за секунды.',
      reservationMinutes: 15,
      downloadTtlSeconds: 300,
      maxEmailResends: 5,
      reviewsModerated: true,
      cryptobotEnabled: true,
      yookassaEnabled: true,
    },
  })

  console.log('→ Создаём администратора')

  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com'
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'Admin12345!'

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: 'Владелец магазина',
      passwordHash: await bcrypt.hash(adminPassword, 12),
      role: 'ADMIN',
    },
  })

  console.log('→ Создаём категории')

  const games = await prisma.category.upsert({
    where: { slug: 'igry' },
    update: {},
    create: {
      slug: 'igry',
      name: 'Игры',
      description: 'Ключи Steam, Xbox, PlayStation',
      icon: '🎮',
      sortOrder: 1,
    },
  })

  const software = await prisma.category.upsert({
    where: { slug: 'soft' },
    update: {},
    create: {
      slug: 'soft',
      name: 'Программы',
      description: 'Лицензии на ПО и антивирусы',
      icon: '💿',
      sortOrder: 2,
    },
  })

  const guides = await prisma.category.upsert({
    where: { slug: 'gaydy' },
    update: {},
    create: {
      slug: 'gaydy',
      name: 'Гайды и курсы',
      description: 'Обучающие материалы и файлы',
      icon: '📚',
      sortOrder: 3,
    },
  })

  console.log('→ Создаём товары')

  const keyProduct = await prisma.product.upsert({
    where: { slug: 'steam-gift-card-1000' },
    update: {},
    create: {
      slug: 'steam-gift-card-1000',
      name: 'Steam Gift Card 1000 ₽',
      shortDescription: 'Код пополнения кошелька Steam на 1000 рублей',
      description: [
        '## Что вы получите',
        '',
        'Уникальный код пополнения кошелька Steam на **1000 ₽**.',
        '',
        '### Как активировать',
        '',
        '1. Откройте Steam и войдите в аккаунт.',
        '2. Перейдите в раздел «Активация».',
        '3. Введите полученный код.',
        '',
        '> Код выдаётся автоматически сразу после оплаты.',
      ].join('\n'),
      price: 109000,
      oldPrice: 129000,
      currency: 'RUB',
      images: [],
      type: 'KEY',
      categoryId: games.id,
      maxPerOrder: 5,
      lowStockThreshold: 3,
      isActive: true,
      isFeatured: true,
      metaTitle: 'Купить Steam Gift Card 1000 ₽ — мгновенная выдача',
      metaDescription: 'Код пополнения Steam на 1000 рублей с автовыдачей 24/7.',
    },
  })

  const antivirus = await prisma.product.upsert({
    where: { slug: 'antivirus-pro-1-god' },
    update: {},
    create: {
      slug: 'antivirus-pro-1-god',
      name: 'Антивирус Pro — лицензия на 1 год',
      shortDescription: 'Лицензионный ключ на 1 устройство, 12 месяцев',
      description:
        '## Лицензия на 12 месяцев\n\nЗащита от вирусов, шифровальщиков и фишинга. Ключ активируется на официальном сайте разработчика.',
      price: 189000,
      currency: 'RUB',
      images: [],
      type: 'KEY',
      categoryId: software.id,
      maxPerOrder: 10,
      lowStockThreshold: 5,
      isActive: true,
      isFeatured: true,
    },
  })

  await prisma.product.upsert({
    where: { slug: 'gayd-po-arbitrazhu-pdf' },
    update: {},
    create: {
      slug: 'gayd-po-arbitrazhu-pdf',
      name: 'Гайд «Цифровой бизнес с нуля» (PDF)',
      shortDescription: '120 страниц практики в PDF',
      description:
        '## О гайде\n\nПошаговая инструкция по запуску магазина цифровых товаров.\n\nФайл доступен для скачивания сразу после оплаты по временной ссылке.',
      price: 49000,
      currency: 'RUB',
      images: [],
      type: 'FILE',
      fileKey: 'files/demo-guide.pdf',
      fileName: 'digital-business-guide.pdf',
      categoryId: guides.id,
      maxPerOrder: 1,
      isActive: true,
      isFeatured: false,
    },
  })

  await prisma.product.upsert({
    where: { slug: 'podpiska-zakrytyy-kanal' },
    update: {},
    create: {
      slug: 'podpiska-zakrytyy-kanal',
      name: 'Доступ в закрытый Telegram-канал',
      shortDescription: 'Персональная ссылка-приглашение на 30 дней',
      description:
        '## Что внутри\n\nЕжедневные разборы, шаблоны и чат участников. Ссылка приходит сразу после оплаты.',
      price: 79000,
      currency: 'RUB',
      images: [],
      type: 'LINK',
      linkContent:
        'Ссылка-приглашение: https://t.me/+demo_invite_link\n\nСсылка действует 48 часов, активируйте её с одного аккаунта.',
      categoryId: guides.id,
      maxPerOrder: 1,
      isActive: true,
      isFeatured: true,
    },
  })

  console.log('→ Наполняем склад ключей')

  const demoKeys: Array<{ productId: string; value: string }> = []

  for (let index = 1; index <= 12; index += 1) {
    demoKeys.push({
      productId: keyProduct.id,
      value: `STEAM-${String(index).padStart(4, '0')}-DEMO-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
    })
  }

  for (let index = 1; index <= 8; index += 1) {
    demoKeys.push({
      productId: antivirus.id,
      value: `AVPRO-${String(index).padStart(4, '0')}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
    })
  }

  await prisma.productKey.createMany({
    data: demoKeys.map((key) => ({
      productId: key.productId,
      value: encrypt(key.value),
      valueHash: sha256(key.value),
      status: 'AVAILABLE' as const,
      note: 'Демо-партия из сид-скрипта',
      importedById: admin.id,
    })),
    skipDuplicates: true,
  })

  console.log('→ Создаём промокоды')

  await prisma.promocode.upsert({
    where: { code: 'WELCOME10' },
    update: {},
    create: {
      code: 'WELCOME10',
      description: 'Скидка 10% на первый заказ',
      discountType: 'PERCENT',
      discountValue: 10,
      minOrderAmount: 50000,
      maxDiscount: 50000,
      usageLimit: 500,
      perEmailLimit: 1,
      isActive: true,
    },
  })

  await prisma.promocode.upsert({
    where: { code: 'MINUS300' },
    update: {},
    create: {
      code: 'MINUS300',
      description: '300 ₽ скидки от 1500 ₽',
      discountType: 'FIXED',
      discountValue: 30000,
      minOrderAmount: 150000,
      usageLimit: 100,
      isActive: true,
    },
  })

  console.log('✓ Готово')
  console.log(`  Админка: /login — ${adminEmail} / ${adminPassword}`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
