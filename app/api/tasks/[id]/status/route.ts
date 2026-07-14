import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const { id } = await params
  const { status } = await req.json()

  const task = await prisma.task.findUnique({ where: { id }, include: { assignees: true } })
  if (!task) return NextResponse.json({ error: 'Tâche introuvable' }, { status: 404 })

  const isAdmin = session.user.role === 'ADMIN'
  const isAssignee = task.assignees.some(a => a.userId === session.user.id)
  if (!isAdmin && !isAssignee && task.createdById !== session.user.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }
  if (!isAdmin && !['TODO', 'IN_PROGRESS', 'DONE'].includes(status)) {
    return NextResponse.json({ error: 'Action non autorisée' }, { status: 403 })
  }

  const STATUS_LABELS: Record<string, string> = { TODO: 'À faire', IN_PROGRESS: 'En cours', OVERDUE: 'En retard', DONE: 'Terminé' }
  const updated = await prisma.task.update({
    where: { id },
    data: {
      status,
      completedAt: status === 'DONE' ? new Date() : status !== 'DONE' ? null : undefined,
    },
  })

  await prisma.comment.create({
    data: {
      taskId: id,
      userId: session.user.id,
      content: `${session.user.name} a changé le statut de « ${STATUS_LABELS[task.status]} » à « ${STATUS_LABELS[status]} »`,
      isSystemLog: true,
    },
  })

  return NextResponse.json(updated)
}
