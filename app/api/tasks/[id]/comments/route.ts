import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail, mentionEmail } from '@/lib/email'
import { sendPushToUser } from '@/lib/push'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const { id } = await params

  const comments = await prisma.comment.findMany({
    where: { taskId: id },
    include: { user: { select: { id: true, fullName: true, username: true } } },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(comments)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const { id } = await params
  const { content } = await req.json()
  if (!content?.trim()) return NextResponse.json({ error: 'Contenu requis' }, { status: 400 })

  // Extract @mentions
  const mentionPattern = /@(\w+)/g
  const usernames: string[] = []
  let match
  while ((match = mentionPattern.exec(content)) !== null) {
    usernames.push(match[1])
  }

  let mentionedUsers: { id: string; email: string; fullName: string; notifyEmail: boolean; notifyPush: boolean }[] = []
  if (usernames.length) {
    mentionedUsers = await prisma.user.findMany({
      where: { username: { in: usernames }, isActive: true },
      select: { id: true, email: true, fullName: true, notifyEmail: true, notifyPush: true },
    })
  }
  const mentionedUserIds = mentionedUsers.map(u => u.id)

  const task = await prisma.task.findUnique({ where: { id }, select: { title: true } })

  const comment = await prisma.comment.create({
    data: {
      taskId: id,
      userId: session.user.id,
      content: content.trim(),
      mentionedUserIds: JSON.stringify(mentionedUserIds),
    },
    include: { user: { select: { id: true, fullName: true, username: true } } },
  })

  if (mentionedUsers.length && task) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const fromName = session.user.name ?? 'Quelqu\'un'
    for (const user of mentionedUsers) {
      if (user.id === session.user.id) continue
      if (user.notifyEmail) {
        const { subject, html } = mentionEmail(user.fullName, fromName, task.title, content.trim(), appUrl, id)
        sendEmail({ to: user.email, subject, html }).catch(console.error)
      }
      if (user.notifyPush) {
        sendPushToUser(user.id, {
          title: `${fromName} vous a mentionné 💬`,
          body: `Dans "${task.title}" : ${content.trim().slice(0, 80)}`,
          url: `/tasks/${id}`,
        }).catch(console.error)
      }
    }
  }

  return NextResponse.json(comment, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const commentId = searchParams.get('commentId')
  if (!commentId) return NextResponse.json({ error: 'ID requis' }, { status: 400 })

  const comment = await prisma.comment.findUnique({ where: { id: commentId } })
  if (!comment) return NextResponse.json({ error: 'Commentaire introuvable' }, { status: 404 })
  if (comment.userId !== session.user.id && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }
  await prisma.comment.delete({ where: { id: commentId } })
  return NextResponse.json({ success: true })
}
