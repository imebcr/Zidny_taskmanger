import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const notifications = await prisma.notification.findMany({
    where: { userId: session.user.id },
    include: { task: { select: { id: true, title: true } } },
    orderBy: { sentAt: 'desc' },
    take: 30,
  })

  return NextResponse.json(notifications)
}

export async function PATCH() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  await prisma.notification.updateMany({
    where: { userId: session.user.id, isRead: false },
    data: { isRead: true },
  })

  return NextResponse.json({ success: true })
}
