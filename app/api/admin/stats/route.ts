import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { subWeeks, startOfWeek, endOfWeek, differenceInHours } from 'date-fns'

export async function GET() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const [tasks, users] = await Promise.all([
    prisma.task.findMany({
      include: {
        assignees: { include: { user: { select: { id: true, fullName: true } } } },
        _count: { select: { comments: true } },
      },
    }),
    prisma.user.findMany({ select: { id: true, fullName: true, role: true, isActive: true, createdAt: true } }),
  ])

  // Status distribution
  const statusDist = tasks.reduce((acc: Record<string, number>, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1
    return acc
  }, {})

  // Workload per member (open tasks)
  const workload: Record<string, { fullName: string; openTasks: number; overdueTasks: number }> = {}
  for (const user of users) {
    workload[user.id] = { fullName: user.fullName, openTasks: 0, overdueTasks: 0 }
  }
  for (const task of tasks) {
    if (task.status !== 'DONE') {
      for (const { user } of task.assignees) {
        if (workload[user.id]) {
          workload[user.id].openTasks++
          if (task.status === 'OVERDUE') workload[user.id].overdueTasks++
        }
      }
    }
  }

  // Overdue tasks sorted by how long overdue
  const overdueTasks = tasks
    .filter(t => t.status === 'OVERDUE')
    .map(t => ({
      id: t.id,
      title: t.title,
      deadline: t.deadline,
      daysLate: Math.floor((Date.now() - new Date(t.deadline).getTime()) / 86400000),
      assignees: t.assignees.map(a => a.user.fullName),
    }))
    .sort((a, b) => b.daysLate - a.daysLate)

  // Weekly throughput (last 8 weeks)
  const weeklyData = []
  for (let i = 7; i >= 0; i--) {
    const start = startOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 })
    const end = endOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 })
    const count = tasks.filter(t => t.completedAt && new Date(t.completedAt) >= start && new Date(t.completedAt) <= end).length
    weeklyData.push({ week: start.toISOString(), count })
  }

  // Average completion time (hours)
  const completedWithTime = tasks.filter(t => t.completedAt && t.createdAt)
  const avgHours = completedWithTime.length
    ? completedWithTime.reduce((sum, t) => sum + differenceInHours(new Date(t.completedAt!), new Date(t.createdAt)), 0) / completedWithTime.length
    : 0

  // On-time completion rate
  const completedTasks = tasks.filter(t => t.status === 'DONE' && t.completedAt)
  const onTime = completedTasks.filter(t => new Date(t.completedAt!) <= new Date(t.deadline)).length
  const onTimeRate = completedTasks.length ? Math.round((onTime / completedTasks.length) * 100) : 0

  // Department distribution
  const deptDist: Record<string, number> = {}
  for (const task of tasks.filter(t => t.status !== 'DONE')) {
    const tags = JSON.parse(task.departmentTags || '[]') as string[]
    for (const tag of tags) { deptDist[tag] = (deptDist[tag] || 0) + 1 }
  }

  // Unassigned tasks
  const unassignedTasks = tasks
    .filter(t => t.status !== 'DONE' && t.assignees.length === 0)
    .map(t => ({ id: t.id, title: t.title, deadline: t.deadline, priority: t.priority }))

  return NextResponse.json({
    statusDist,
    workload: Object.values(workload),
    overdueTasks,
    weeklyThroughput: weeklyData,
    avgCompletionHours: Math.round(avgHours),
    onTimeRate,
    deptDist,
    unassignedTasks,
    totalTasks: tasks.length,
    totalUsers: users.filter(u => u.isActive).length,
  })
}
