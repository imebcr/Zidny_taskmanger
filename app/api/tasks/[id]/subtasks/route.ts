import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const { id } = await params
  const { title } = await req.json()
  if (!title?.trim()) return NextResponse.json({ error: 'Titre requis' }, { status: 400 })

  const count = await prisma.subtask.count({ where: { taskId: id } })
  const subtask = await prisma.subtask.create({
    data: { taskId: id, title: title.trim(), order: count },
  })
  return NextResponse.json(subtask, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const { subtaskId, isCompleted, title } = await req.json()

  const updateData: Record<string, unknown> = {}
  if (isCompleted !== undefined) updateData.isCompleted = isCompleted
  if (title !== undefined) updateData.title = title

  const subtask = await prisma.subtask.update({
    where: { id: subtaskId },
    data: updateData,
  })
  return NextResponse.json(subtask)
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const subtaskId = searchParams.get('subtaskId')
  if (!subtaskId) return NextResponse.json({ error: 'ID requis' }, { status: 400 })
  await prisma.subtask.delete({ where: { id: subtaskId } })
  return NextResponse.json({ success: true })
}
