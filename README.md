# Digital Store — магазин цифровых товаров с автовыдачей

Production-ready маркетплейс одного продавца: покупатель без регистрации выбирает товар,
оплачивает через CryptoBot или ЮKassa и мгновенно получает ключ, файл или ссылку.
Владелец управляет всем через админ-панель `/admin`.

## Стек

| Слой | Технологии |
| --- | --- |
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui-компоненты |
| Backend | Route Handlers + Server Actions |
| БД | PostgreSQL + Prisma ORM |
| Авторизация | NextAuth (credentials) + bcrypt |
| Платежи | CryptoBot, ЮKassa через общий интерфейс `PaymentProvider` |
| Файлы | S3-совместимое хранилище, presigned-ссылки с TTL |
| Почта | Resend |
| Деплой | Vercel + Neon/Supabase |

## Быстрый старт

```bash
# 1. Зависимости
npm install

# 2. Переменные окружения
cp .env.example .env
# заполните DATABASE_URL, NEXTAUTH_SECRET, ENCRYPTION_KEY и остальное

# 3. Ключ шифрования (32 байта в hex)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 4. Секрет NextAuth
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# 5. Схема БД
npm run db:push        # или npm run db:migrate для миграций

# 6. Демо-данные
npm run db:seed

# 7. Запуск
npm run dev
```

После сида админ-панель доступна на `/login`:
`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` (по умолчанию `admin@example.com` / `Admin12345!`).
**Смените пароль сразу после первого входа.**

## Структура проекта

```
prisma/
  schema.prisma          # 11 моделей, индексы, каскады
  seed.ts                # демо-данные
src/
  app/
    (shop)/              # публичная витрина
      page.tsx           # главная: hero, категории, популярное
      catalog/           # каталог: поиск, фильтры, сортировка, пагинация
      product/[slug]/    # карточка товара
      order/[token]/     # страница заказа по публичному токену
    (admin)/admin/       # админ-панель
      page.tsx           # дашборд с графиком выручки
      products/          # CRUD товаров + склад ключей
      categories/        # CRUD категорий
      orders/            # заказы, ручная выдача, возвраты
      promocodes/        # промокоды
      reviews/           # модерация отзывов
      settings/          # настройки магазина и платёжек
    api/
      orders/            # создание заказа, повторная отправка письма
      webhooks/          # cryptobot, yookassa
      download/[token]/  # выдача presigned-ссылки
      cron/              # снятие броней, отмена протухших заказов
      upload/            # загрузка изображений и файлов в S3
  components/            # ui/, layout/, shop/, admin/
  lib/
    payments/            # PaymentProvider: types, cryptobot, yookassa, реестр
    services/            # бизнес-логика (склад, заказы, выдача, статистика)
    validations/         # Zod-схемы (общие для клиента и сервера)
    crypto.ts            # AES-256-GCM для ключей и секретов
    rate-limit.ts        # лимиты на заказы, промокоды, отзывы, письма
  actions/               # Server Actions админки
```

## Как работает автовыдача

1. Покупатель вводит email и выбирает способ оплаты → `POST /api/orders`.
2. Внутри транзакции: проверка остатка, **атомарное резервирование ключей**
   (`status: AVAILABLE → RESERVED`, `reservedUntil = now + 15 мин`), создание заказа
   и `Payment` с `externalId` от провайдера.
3. Провайдер присылает webhook → проверка подписи → запись в `WebhookLog`.
4. `fulfillOrder(orderId)` выполняется **строго внутри `prisma.$transaction`**:
   - если заказ уже `DELIVERED`, возвращается `alreadyDelivered: true` (идемпотентность);
   - ключи переводятся в `SOLD` и привязываются к `OrderItem`;
   - для FILE сохраняется `deliveredFileKey`, для LINK — `deliveredContent`;
   - статус заказа → `DELIVERED`, отправляется письмо через Resend.
5. Повторный webhook с тем же `eventId` помечается как `DUPLICATE` и товар не выдаётся дважды.
6. Cron `/api/cron/release-reservations` возвращает протухшие брони на склад.

## Платежи

Оба провайдера реализуют один интерфейс (`src/lib/payments/types.ts`):

```ts
interface PaymentProvider {
  code: PaymentProviderCode
  title: string
  isEnabled(): Promise<boolean>
  createInvoice(input): Promise<{ externalId, payUrl, raw, expiresAt }>
  verifyWebhook(input): Promise<VerifiedWebhook>
}
```

Чтобы добавить новый способ оплаты, создайте файл в `src/lib/payments/`,
реализуйте интерфейс и зарегистрируйте провайдер в `src/lib/payments/index.ts`.

### CryptoBot
- Токен из @CryptoBot → Crypto Pay → Create App.
- Webhook URL: `https://ВАШ-ДОМЕН/api/webhooks/cryptobot`.
- Подпись: HMAC-SHA256 тела запроса ключом `SHA256(token)`, заголовок `crypto-pay-api-signature`.

### ЮKassa
- `shopId` и секретный ключ из личного кабинета.
- Webhook URL: `https://ВАШ-ДОМЕН/api/webhooks/yookassa`, событие `payment.succeeded`.
- Проверка: IP-allowlist ЮKassa + обратный запрос статуса платежа по API.

Ключи платёжек можно хранить как в `.env`, так и в админке (шифруются AES-256-GCM).

## Хранилище S3

Подойдёт любой S3-совместимый провайдер (AWS S3, Cloudflare R2, Selectel, MinIO).
Файлы товаров никогда не отдаются напрямую: `/api/download/[token]` проверяет заказ
и выдаёт presigned-ссылку с TTL из настроек (по умолчанию 5 минут).

## Cron-задачи

`vercel.json` уже настроен:

| Задача | Расписание | Что делает |
| --- | --- | --- |
| `/api/cron/release-reservations` | `*/5 * * * *` | снимает истёкшие брони ключей |
| `/api/cron/cancel-stale-orders` | `*/10 * * * *` | отменяет неоплаченные заказы |

Запросы защищены заголовком `Authorization: Bearer $CRON_SECRET`.

## Деплой на Vercel

1. Создайте базу в Neon или Supabase, скопируйте `DATABASE_URL` (pooled) и `DIRECT_URL`.
2. Импортируйте репозиторий в Vercel.
3. Добавьте все переменные из `.env.example` в Project Settings → Environment Variables.
4. `NEXT_PUBLIC_APP_URL` и `NEXTAUTH_URL` — боевой домен со схемой `https://`.
5. Деплой. `npm run build` автоматически выполняет `prisma generate`.
6. Примените схему: `npx prisma migrate deploy` (или `db push` для быстрого старта).
7. Пропишите webhook-URL в кабинетах CryptoBot и ЮKassa.

## Безопасность — чеклист

- [x] Все входные данные валидируются через Zod на клиенте и на сервере.
- [x] Rate limiting: создание заказа, промокоды, отзывы, письма, скачивания, вход.
- [x] Секреты только на сервере, в клиентский бандл попадает лишь `NEXT_PUBLIC_APP_URL`.
- [x] Ключи товаров и токены платёжек шифруются AES-256-GCM.
- [x] Файлы отдаются только по presigned-ссылкам с коротким TTL.
- [x] Выдача товара идемпотентна и выполняется внутри транзакции БД.
- [x] Все webhook'и логируются с телом, заголовками, IP и результатом проверки подписи.
- [x] `/admin/*` закрыт middleware NextAuth.

## Скрипты

| Команда | Описание |
| --- | --- |
| `npm run dev` | локальная разработка |
| `npm run build` | `prisma generate` + сборка |
| `npm run typecheck` | проверка типов |
| `npm run lint` | ESLint |
| `npm run db:push` | синхронизация схемы без миграций |
| `npm run db:migrate` | создание миграции |
| `npm run db:studio` | Prisma Studio |
| `npm run db:seed` | демо-данные |

## Лицензия

MIT.
