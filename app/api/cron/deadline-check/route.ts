import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail, deadlineReminderEmail, overdueEmail } from '@/lib/email'
import { sendPushToUser } from '@/lib/push'
import { addHours } from 'date-fns'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return true // open in dev when no secret is set
  return request.headers.get('authorization') === `Bearer ${secret}`
}

async function handler(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()

  // 1. Flip overdue tasks
  const overdueFlipped = await prisma.task.updateMany({
    where: {
      status: { in: ['TODO', 'IN_PROGRESS'] },
      deadline: { lt: now },
    },
    data: { status: 'OVERDUE' },
  })

  // 2. Find newly overdue tasks to notify
  const newlyOverdue = await prisma.task.findMany({
    where: {
      status: 'OVERDUE',
      deadline: { lt: now, gte: addHours(now, -1) },
    },
    include: {
      assignees: { include: { user: true } },
      notifications: { where: { type: 'OVERDUE' } },
    },
  })

  for (const task of newlyOverdue) {
    for (const { user } of task.assignees) {
      if (!user.isActive) continue
      const alreadySent = task.notifications.some(n => n.userId === user.id && n.type === 'OVERDUE' && n.channel === 'EMAIL')
      if (!alreadySent && user.notifyEmail) {
        const email = overdueEmail(user.fullName, task.title, APP_URL, task.id)
        await sendEmail({ to: user.email, ...email })
        await prisma.notification.create({ data: { userId: user.id, taskId: task.id, type: 'OVERDUE', channel: 'EMAIL' } })
      }
      if (user.notifyPush) {
        await sendPushToUser(user.id, { title: 'Tâche en retard ⚠', body: task.title, url: `/tasks/${task.id}` })
        await prisma.notification.create({ data: { userId: user.id, taskId: task.id, type: 'OVERDUE', channel: 'PUSH' } })
      }
    }
  }

  // 3. 48h deadline reminder — only tasks due 24h-48h from now (non-overlapping with 24h window)
  const in24h = addHours(now, 24)
  const in48h = addHours(now, 48)

  const tasks48h = await prisma.task.findMany({
    where: {
      status: { in: ['TODO', 'IN_PROGRESS'] },
      deadline: { gt: in24h, lte: in48h },
    },
    include: {
      assignees: { include: { user: true } },
      notifications: { where: { type: 'DEADLINE_48H' } },
    },
  })

  for (const task of tasks48h) {
    for (const { user } of task.assignees) {
      if (!user.isActive) continue
      const alreadySent = task.notifications.some(n => n.userId === user.id && n.type === 'DEADLINE_48H' && n.channel === 'EMAIL')
      if (!alreadySent && user.notifyEmail) {
        const email = deadlineReminderEmail(user.fullName, task.title, task.deadline, 48, APP_URL, task.id)
        await sendEmail({ to: user.email, subject: email.subject, html: email.html })
        await prisma.notification.create({ data: { userId: user.id, taskId: task.id, type: 'DEADLINE_48H', channel: 'EMAIL' } })
      }
      if (user.notifyPush) {
        await sendPushToUser(user.id, { title: 'Tâche due dans 48h 📅', body: task.title, url: `/tasks/${task.id}` })
      }
    }
  }

  // 4. 24h deadline reminder — tasks due within the next 24h
  const tasks24h = await prisma.task.findMany({
    where: {
      status: { in: ['TODO', 'IN_PROGRESS'] },
      deadline: { gte: now, lte: in24h },
    },
    include: {
      assignees: { include: { user: true } },
      notifications: { where: { type: 'DEADLINE_24H' } },
    },
  })

  for (const task of tasks24h) {
    for (const { user } of task.assignees) {
      if (!user.isActive) continue
      const alreadySent = task.notifications.some(n => n.userId === user.id && n.type === 'DEADLINE_24H' && n.channel === 'EMAIL')
      if (!alreadySent && user.notifyEmail) {
        const email = deadlineReminderEmail(user.fullName, task.title, task.deadline, 24, APP_URL, task.id)
        await sendEmail({ to: user.email, subject: email.subject, html: email.html })
        await prisma.notification.create({ data: { userId: user.id, taskId: task.id, type: 'DEADLINE_24H', channel: 'EMAIL' } })
      }
      if (user.notifyPush) {
        await sendPushToUser(user.id, {
          title: 'Tâche due demain 🔔',
          body: task.title,
          url: `/tasks/${task.id}`,
        })
      }
    }
  }

  return NextResponse.json({
    overdueFlipped: overdueFlipped.count,
    notificationsProcessed: newlyOverdue.length + tasks48h.length + tasks24h.length,
  })
}

export async function POST(request: NextRequest) {
  return handler(request)
}

export async function GET(request: NextRequest) {
  return handler(request)
}
