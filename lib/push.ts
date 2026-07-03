import webpush from 'web-push'
import { prisma } from './prisma'

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@zidny.ma',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  )
}

export async function sendPushToUser(userId: string, payload: { title: string; body: string; url?: string }) {
  if (!process.env.VAPID_PUBLIC_KEY) return

  const subs = await prisma.pushSubscription.findMany({ where: { userId } })
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({ ...payload, icon: '/icons/icon-192.png' }),
      )
    } catch (err: unknown) {
      if ((err as { statusCode?: number }).statusCode === 410) {
        await prisma.pushSubscription.delete({ where: { id: sub.id } })
      }
    }
  }
}
