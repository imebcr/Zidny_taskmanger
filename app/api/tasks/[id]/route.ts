import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail, taskUpdatedEmail } from '@/lib/email'
import { sendPushToUser } from '@/lib/push'
import { z } from 'zod'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  deadline: z.string().optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'OVERDUE', 'DONE']).optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),
  departmentTags: z.array(z.string()).optional(),
  assigneeIds: z.array(z.string()).optional(),
  recurrence: z.enum(['NONE', 'DAILY', 'WEEKLY', 'MONTHLY']).optional(),
  blockedByIds: z.array(z.string()).optional(),
})

const taskInclude = {
  createdBy: { select: { id: true, fullName: true, username: true } },
  assignees: { include: { user: { select: { id: true, fullName: true, username: true } } } },
  subtasks: { orderBy: { order: 'asc' as const } },
  _count: { select: { comments: true } },
  blockingOn: { include: { blockingTask: { select: { id: true, title: true, status: true } } } },
  blockedTasks: { include: { blockedTask: { select: { id: true, title: true, status: true } } } },
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const { id } = await params
  const task = await prisma.task.findUnique({ where: { id }, include: taskInclude })
  if (!task) return NextResponse.json({ error: 'Tâche introuvable' }, { status: 404 })
  return NextResponse.json(task)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const { id } = await params

  const task = await prisma.task.findUnique({ where: { id }, include: { assignees: true } })
  if (!task) return NextResponse.json({ error: 'Tâche introuvable' }, { status: 404 })

  const isAdmin = session.user.role === 'ADMIN'
  const isAssignee = task.assignees.some(a => a.userId === session.user.id)
  const isCreator = task.createdById === session.user.id

  if (!isAdmin && !isAssignee && !isCreator) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const data = updateSchema.parse(body)

    if (!isAdmin && data.status && data.status !== task.status && !['IN_PROGRESS', 'DONE'].includes(data.status)) {
      return NextResponse.json({ error: 'Action non autorisée' }, { status: 403 })
    }

    const changes: string[] = []

    if (data.title && data.title !== task.title) {
      changes.push(`Titre : "${task.title}" → "${data.title}"`)
    }
    if (data.description !== undefined && data.description !== task.description) {
      changes.push('Description mise à jour')
    }
    if (data.status && data.status !== task.status) {
      const STATUS_LABELS: Record<string, string> = { TODO: 'À faire', IN_PROGRESS: 'En cours', OVERDUE: 'En retard', DONE: 'Terminé' }
      changes.push(`Statut : ${STATUS_LABELS[task.status]} → ${STATUS_LABELS[data.status]}`)
    }
    if (data.priority && data.priority !== task.priority) {
      const PRIORITY_LABELS: Record<string, string> = { LOW: 'Faible', NORMAL: 'Normal', HIGH: 'Élevé', URGENT: 'Urgent' }
      changes.push(`Priorité : ${PRIORITY_LABELS[task.priority]} → ${PRIORITY_LABELS[data.priority]}`)
    }
    if (data.deadline && new Date(data.deadline).toDateString() !== new Date(task.deadline).toDateString()) {
      changes.push(`Échéance : ${task.deadline.toLocaleDateString('fr-FR')} → ${new Date(data.deadline).toLocaleDateString('fr-FR')}`)
    }

    const updateData: Record<string, unknown> = {}
    if (data.title) updateData.title = data.title
    if (data.description !== undefined) updateData.description = data.description
    if (data.deadline) updateData.deadline = new Date(data.deadline)
    if (data.status) {
      updateData.status = data.status
      if (data.status === 'DONE' && task.status !== 'DONE') updateData.completedAt = new Date()
      if (data.status !== 'DONE' && task.status === 'DONE') updateData.completedAt = null
    }
    if (data.priority) updateData.priority = data.priority
    if (data.departmentTags) updateData.departmentTags = JSON.stringify(data.departmentTags)
    if (data.recurrence) updateData.recurrence = data.recurrence

    if (data.assigneeIds !== undefined && isAdmin) {
      await prisma.taskAssignee.deleteMany({ where: { taskId: id } })
      if (data.assigneeIds.length) {
        await prisma.taskAssignee.createMany({
          data: data.assigneeIds.map(uid => ({ taskId: id, userId: uid })),
        })
      }
      changes.push('Assignés mis à jour')
    }

    if (data.blockedByIds !== undefined) {
      await prisma.taskDependency.deleteMany({ where: { blockedTaskId: id } })
      if (data.blockedByIds.length) {
        await prisma.taskDependency.createMany({
          data: data.blockedByIds.map(bid => ({ blockedTaskId: id, blockingTaskId: bid })),
        })
      }
    }

    const updated = await prisma.task.update({ where: { id }, data: updateData, include: taskInclude })

    if (changes.length) {
      await prisma.comment.create({
        data: {
          taskId: id,
          userId: session.user.id,
          content: `${session.user.name} a modifié : ${changes.join(', ')}`,
          isSystemLog: true,
        },
      })

      if (isAdmin) {
        const assignees = await prisma.taskAssignee.findMany({
          where: { taskId: id },
          include: { user: { select: { id: true, email: true, fullName: true, notifyEmail: true, notifyPush: true, isActive: true } } },
        })
        for (const { user } of assignees) {
          if (!user.isActive) continue
          if (user.notifyEmail) {
            const email = taskUpdatedEmail(user.fullName, updated.title, changes, APP_URL, id)
            await sendEmail({ to: user.email, subject: email.subject, html: email.html })
          }
          if (user.notifyPush) {
            await sendPushToUser(user.id, {
              title: 'Tâche modifiée ✏️',
              body: `${updated.title} — ${changes[0]}`,
              url: `/tasks/${id}`,
            })
          }
        }
      }
    }

    return NextResponse.json(updated)
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues[0].message }, { status: 400 })
    console.error(err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const { id } = await params

  const task = await prisma.task.findUnique({ where: { id } })
  if (!task) return NextResponse.json({ error: 'Tâche introuvable' }, { status: 404 })

  if (session.user.role !== 'ADMIN' && task.createdById !== session.user.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  await prisma.task.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
