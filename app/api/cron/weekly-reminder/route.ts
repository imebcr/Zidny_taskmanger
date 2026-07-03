import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail, weeklyReminderEmail } from '@/lib/email'

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
  const sixDaysAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const users = await prisma.user.findMany({
    where: { isActive: true, notifyEmail: true },
    include: {
      assignedTasks: {
        include: { task: true },
        where: { task: { status: { not: 'DONE' } } },
      },
      notifications: {
        where: { type: 'WEEKLY_REMINDER', channel: 'EMAIL', sentAt: { gte: sixDaysAgo } },
        take: 1,
      },
    },
  })

  let sent = 0
  for (const user of users) {
    if (user.notifications.length > 0) continue // already sent this week

    const myTasks = user.assignedTasks.map(a => ({
      title: a.task.title,
      deadline: a.task.deadline,
      status: a.task.status,
      createdAt: a.task.createdAt,
    }))
    const newTasks = myTasks
      .filter(t => t.status === 'TODO' && t.createdAt >= sevenDaysAgo)
      .map(t => ({ title: t.title, deadline: t.deadline }))
    const overdueCount = myTasks.filter(t => t.status === 'OVERDUE').length

    const email = weeklyReminderEmail(user.fullName, myTasks, newTasks, overdueCount, APP_URL)
    await sendEmail({ to: user.email, subject: email.subject, html: email.html })

    await prisma.notification.create({
      data: { userId: user.id, type: 'WEEKLY_REMINDER', channel: 'EMAIL' },
    })
    sent++
  }

  return NextResponse.json({ sent })
}

export async function POST(request: NextRequest) {
  return handler(request)
}

export async function GET(request: NextRequest) {
  return handler(request)
}
