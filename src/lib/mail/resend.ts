import { Resend } from 'resend'

import { getAppUrl, getEnv } from '../env'
import { logger } from '../logger'
import { getEmailFrom, getSettings } from '../services/settings.service'

let client: Resend | null = null

function getClient(): Resend | null {
  const env = getEnv()
  if (!env.RESEND_API_KEY) return null
  if (!client) client = new Resend(env.RESEND_API_KEY)
  return client
}

type DeliveredItem = {
  productName: string
  quantity: number
  /** Выданные ключи в открытом виде (только для типа KEY) */
  keys?: string[]
  /** Содержимое для типа LINK */
  content?: string | null
  /** Нужна ли кнопка скачивания (тип FILE) */
  isFile: boolean
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Собирает HTML-шаблон письма с выданным товаром. */
function buildDeliveredHtml(params: {
  shopName: string
  orderNumber: string
  orderUrl: string
  items: DeliveredItem[]
  supportContact?: string | null
}): string {
  const itemsHtml = params.items
    .map((item) => {
      let body = ''

      if (item.keys && item.keys.length > 0) {
        body = `<div style="background:#0f172a;color:#e2e8f0;border-radius:8px;padding:14px 16px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:14px;line-height:1.8;word-break:break-all">${item.keys
          .map((key) => escapeHtml(key))
          .join('<br>')}</div>`
      } else if (item.isFile) {
        body = `<p style="margin:8px 0 0;color:#475569">Файл доступен по кнопке «Скачать» на странице заказа.</p>`
      } else if (item.content) {
        body = `<div style="background:#f1f5f9;border-radius:8px;padding:14px 16px;color:#0f172a;font-size:14px;line-height:1.7;white-space:pre-wrap">${escapeHtml(
          item.content,
        )}</div>`
      }

      return `
        <tr>
          <td style="padding:16px 0;border-bottom:1px solid #e2e8f0">
            <p style="margin:0 0 10px;font-size:15px;font-weight:600;color:#0f172a">
              ${escapeHtml(item.productName)} &times; ${item.quantity}
            </p>
            ${body}
          </td>
        </tr>`
    })
    .join('')

  return `<!DOCTYPE html>
<html lang="ru">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:24px;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:14px;padding:32px">
    <tr><td>
      <p style="margin:0 0 4px;font-size:13px;color:#64748b">${escapeHtml(params.shopName)}</p>
      <h1 style="margin:0 0 8px;font-size:22px;color:#0f172a">Заказ ${escapeHtml(params.orderNumber)} оплачен</h1>
      <p style="margin:0 0 20px;font-size:15px;color:#475569">Спасибо за покупку! Ваш товар ниже.</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${itemsHtml}</table>
      <p style="margin:24px 0 0">
        <a href="${params.orderUrl}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-size:15px;font-weight:600">Открыть страницу заказа</a>
      </p>
      <p style="margin:20px 0 0;font-size:13px;color:#94a3b8">Сохраните эту ссылку — по ней всегда доступен ваш товар.</p>
      ${
        params.supportContact
          ? `<p style="margin:8px 0 0;font-size:13px;color:#94a3b8">Вопросы: ${escapeHtml(params.supportContact)}</p>`
          : ''
      }
    </td></tr>
  </table>
</body>
</html>`
}

/**
 * Отправляет письмо с выданным товаром.
 * Всегда вызывается ПОСЛЕ commit транзакции выдачи — сбой почты не должен откатывать выдачу.
 *
 * @returns true — письмо отправлено
 */
export async function sendOrderDeliveredEmail(params: {
  to: string
  orderNumber: string
  publicToken: string
  items: DeliveredItem[]
}): Promise<boolean> {
  const resend = getClient()
  const settings = await getSettings()

  const orderUrl = `${getAppUrl()}/order/${params.publicToken}`

  if (!resend) {
    logger.warn('Resend не настроен, письмо не отправлено', {
      orderNumber: params.orderNumber,
      orderUrl,
    })
    return false
  }

  try {
    const from = await getEmailFrom()

    const { error } = await resend.emails.send({
      from,
      to: params.to,
      subject: `Заказ ${params.orderNumber} — ваш товар готов`,
      html: buildDeliveredHtml({
        shopName: settings.shopName,
        orderNumber: params.orderNumber,
        orderUrl,
        items: params.items,
        supportContact: settings.contactEmail || settings.telegramUsername,
      }),
    })

    if (error) {
      logger.error('Resend вернул ошибку', { error, orderNumber: params.orderNumber })
      return false
    }

    return true
  } catch (error) {
    logger.error('Не удалось отправить письмо', { error, orderNumber: params.orderNumber })
    return false
  }
}

/** Уведомляет админа о низком остатке ключей. */
export async function sendLowStockEmail(params: {
  productName: string
  productId: string
  remaining: number
}): Promise<void> {
  const resend = getClient()
  const settings = await getSettings()
  const to = settings.adminNotifyEmail

  if (!resend || !to) return

  try {
    const from = await getEmailFrom()
    await resend.emails.send({
      from,
      to,
      subject: `Мало ключей: ${params.productName}`,
      html: `<p>На складе осталось <b>${params.remaining} шт.</b> товара «${escapeHtml(params.productName)}».</p>
             <p><a href="${getAppUrl()}/admin/products/${params.productId}">Пополнить склад</a></p>`,
    })
  } catch (error) {
    logger.error('Не удалось отправить уведомление об остатке', { error })
  }
}
