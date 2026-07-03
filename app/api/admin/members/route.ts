import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export async function GET() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const users = await prisma.user.findMany({
    select: {
      id: true, fullName: true, username: true, email: true,
      role: true, isActive: true, createdAt: true, lastLogin: true,
      _count: { select: { assignedTasks: true } },
    },
    orderBy: { fullName: 'asc' },
  })
  return NextResponse.json(users)
}

const updateSchema = z.object({
  userId: z.string(),
  isActive: z.boolean().optional(),
  role: z.enum(['MEMBER', 'ADMIN']).optional(),
})

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const body = updateSchema.parse(await req.json())
  const data: Record<string, unknown> = {}
  if (body.isActive !== undefined) data.isActive = body.isActive
  if (body.role !== undefined) data.role = body.role

  const user = await prisma.user.update({ where: { id: body.userId }, data })
  return NextResponse.json(user)
}
