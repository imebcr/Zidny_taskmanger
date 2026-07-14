import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { sendEmail, taskAssignedEmail } from '@/lib/email'
import { sendPushToUser } from '@/lib/push'

const ELEVATED_DEPTS = ['RH', 'COO', 'CEO']

const createSchema = z.object({
  title: z.string().min(1, 'Le titre est requis'),
  description: z.string().optional(),
  deadline: z.string(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'OVERDUE', 'DONE']).optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),
  departmentTags: z.array(z.string()).optional(),
  assigneeIds: z.array(z.string()).optional(),
  recurrence: z.enum(['NONE', 'DAILY', 'WEEKLY', 'MONTHLY']).optional(),
  parentTaskId: z.string().optional(),
  blockedByIds: z.array(z.string()).optional(),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const mine = searchParams.get('mine') === 'true'
  const status = searchParams.get('status')
  const priority = searchParams.get('priority')
  const department = searchParams.get('department')
  const assigneeId = searchParams.get('assigneeId')
  const search = searchParams.get('search')
  const deadline = searchParams.get('deadline')

  // Resolve visibility scope
  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { department: true },
  })
  const isElevated = session.user.role === 'ADMIN' || ELEVATED_DEPTS.includes(currentUser?.department ?? '')

  const where: Record<string, unknown> = {}

  if (mine) {
    where.assignees = { some: { userId: session.user.id } }
  } else if (!isElevated) {
    // Non-elevated members: see only tasks where an assignee is in their department
    const deptUsers = currentUser?.department
      ? await prisma.user.findMany({
          where: { department: currentUser.department, isActive: true },
          select: { id: true },
        })
      : [{ id: session.user.id }]
    const deptUserIds = deptUsers.map(u => u.id)
    if (assigneeId) {
      if (!deptUserIds.includes(assigneeId)) return NextResponse.json([])
      where.assignees = { some: { userId: assigneeId } }
    } else {
      where.assignees = { some: { userId: { in: deptUserIds } } }
    }
  } else if (assigneeId) {
    where.assignees = { some: { userId: assigneeId } }
  }

  if (status) where.status = status
  if (priority) where.priority = priority
  if (department) where.departmentTags = { contains: department }
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ]
  }

  if (deadline === 'today') {
    const end = new Date(); end.setHours(23, 59, 59, 999)
    where.deadline = { lte: end }
  } else if (deadline === 'week') {
    const end = new Date(); end.setDate(end.getDate() + 7)
    where.deadline = { lte: end }
  } else if (deadline === 'month') {
    const end = new Date(); end.setDate(end.getDate() + 30)
    where.deadline = { lte: end }
  }

  const tasks = await prisma.task.findMany({
    where,
    include: {
      createdBy: { select: { id: true, fullName: true, username: true } },
      assignees: { include: { user: { select: { id: true, fullName: true, username: true } } } },
      subtasks: { orderBy: { order: 'asc' } },
      _count: { select: { comments: true } },
      blockingOn: { include: { blockingTask: { select: { id: true, title: true, status: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(tasks)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  try {
    const body = await req.json()
    const data = createSchema.parse(body)

    // Any user can assign; default to self if no assignees specified
    const assigneeIds = data.assigneeIds?.length ? data.assigneeIds : [session.user.id]

    const creator = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { department: true },
    })
    const deptTags = creator?.department ? [creator.department] : []

    const task = await prisma.task.create({
      data: {
        title: data.title,
        description: data.description,
        deadline: new Date(data.deadline),
        status: data.status || 'TODO',
        priority: data.priority || 'NORMAL',
        departmentTags: JSON.stringify(deptTags),
        recurrence: data.recurrence || 'NONE',
        parentTaskId: data.parentTaskId,
        createdById: session.user.id,
        assignees: assigneeIds.length
          ? { create: assigneeIds.map(uid => ({ userId: uid })) }
          : undefined,
        blockingOn: data.blockedByIds?.length
          ? { create: data.blockedByIds.map(bid => ({ blockingTaskId: bid })) }
          : undefined,
      },
      include: {
        createdBy: { select: { id: true, fullName: true, username: true } },
        assignees: { include: { user: { select: { id: true, fullName: true, username: true, email: true, notifyEmail: true, notifyPush: true } } } },
        subtasks: true,
        _count: { select: { comments: true } },
      },
    })

    await prisma.comment.create({
      data: {
        taskId: task.id,
        userId: session.user.id,
        content: `Tâche créée par ${session.user.name}`,
        isSystemLog: true,
      },
    })

    // Notify assignees who are not the creator
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    for (const assignee of task.assignees) {
      if (assignee.user.id === session.user.id) continue
      if (assignee.user.email) {
        const { subject, html } = taskAssignedEmail(
          assignee.user.fullName,
          task.title,
          task.deadline,
          appUrl,
          task.id
        )
        sendEmail({ to: assignee.user.email, subject, html }).catch(err =>
          console.error('Failed to send task-assigned email:', err)
        )
      }
      if (assignee.user.notifyPush) {
        sendPushToUser(assignee.user.id, {
          title: 'Nouvelle tâche assignée 📋',
          body: task.title,
          url: `/tasks/${task.id}`,
        }).catch(console.error)
      }
    }

    return NextResponse.json(task, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 })
    }
    console.error(err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
