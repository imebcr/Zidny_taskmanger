import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, fullName: true, username: true, role: true, email: true },
    orderBy: { fullName: 'asc' },
  })
  return NextResponse.json(users)
}
