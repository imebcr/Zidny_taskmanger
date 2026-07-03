import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { format } from 'date-fns'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')

  const tasks = await prisma.task.findMany({
    where: status ? { status } : undefined,
    include: {
      createdBy: { select: { fullName: true } },
      assignees: { include: { user: { select: { fullName: true } } } },
      subtasks: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  const STATUS_LABELS: Record<string, string> = { TODO: 'À faire', IN_PROGRESS: 'En cours', OVERDUE: 'En retard', DONE: 'Terminé' }
  const PRIORITY_LABELS: Record<string, string> = { LOW: 'Faible', NORMAL: 'Normal', HIGH: 'Élevé', URGENT: 'Urgent' }

  const headers = [
    'ID', 'Titre', 'Description', 'Statut', 'Priorité', 'Échéance',
    'Créée le', 'Terminée le', 'Créée par', 'Assigné(s)', 'Départements',
    'Sous-tâches total', 'Sous-tâches terminées', 'Récurrence',
  ]

  const rows = tasks.map(t => [
    t.id,
    `"${t.title.replace(/"/g, '""')}"`,
    `"${(t.description || '').replace(/"/g, '""')}"`,
    STATUS_LABELS[t.status] || t.status,
    PRIORITY_LABELS[t.priority] || t.priority,
    format(new Date(t.deadline), 'dd/MM/yyyy HH:mm'),
    format(new Date(t.createdAt), 'dd/MM/yyyy'),
    t.completedAt ? format(new Date(t.completedAt), 'dd/MM/yyyy') : '',
    t.createdBy.fullName,
    `"${t.assignees.map(a => a.user.fullName).join(', ')}"`,
    `"${JSON.parse(t.departmentTags || '[]').join(', ')}"`,
    t.subtasks.length,
    t.subtasks.filter(s => s.isCompleted).length,
    t.recurrence,
  ])

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
  const bom = '﻿'

  return new NextResponse(bom + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="zidny-export-${format(new Date(), 'yyyyMMdd')}.csv"`,
    },
  })
}
