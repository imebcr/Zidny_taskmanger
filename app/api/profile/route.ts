import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const schema = z.object({
  fullName: z.string().min(2).optional(),
  username: z.string().min(2).regex(/^[a-z0-9_]+$/).optional(),
  email: z.string().email('Email invalide').optional(),
  department: z.string().optional(),
  notifyEmail: z.boolean().optional(),
  notifyPush: z.boolean().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8).optional(),
})

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  try {
    const body = schema.parse(await req.json())
    const data: Record<string, unknown> = {}

    if (body.fullName) data.fullName = body.fullName
    if (body.department !== undefined) data.department = body.department
    if (body.notifyEmail !== undefined) data.notifyEmail = body.notifyEmail
    if (body.notifyPush !== undefined) data.notifyPush = body.notifyPush

    if (body.username) {
      const taken = await prisma.user.findFirst({ where: { username: body.username, NOT: { id: session.user.id } } })
      if (taken) return NextResponse.json({ error: "Ce nom d'utilisateur est déjà pris" }, { status: 400 })
      data.username = body.username
    }

    if (body.email) {
      const taken = await prisma.user.findFirst({ where: { email: body.email, NOT: { id: session.user.id } } })
      if (taken) return NextResponse.json({ error: 'Cet email est déjà utilisé' }, { status: 400 })
      data.email = body.email
    }

    if (body.currentPassword && body.newPassword) {
      const user = await prisma.user.findUnique({ where: { id: session.user.id } })
      if (!user || !(await bcrypt.compare(body.currentPassword, user.passwordHash))) {
        return NextResponse.json({ error: 'Mot de passe actuel incorrect' }, { status: 400 })
      }
      data.passwordHash = await bcrypt.hash(body.newPassword, 12)
    }

    const user = await prisma.user.update({ where: { id: session.user.id }, data })
    return NextResponse.json({ success: true, user: { fullName: user.fullName, notifyEmail: user.notifyEmail, notifyPush: user.notifyPush } })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues[0].message }, { status: 400 })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, fullName: true, username: true, email: true, role: true, department: true, notifyEmail: true, notifyPush: true, createdAt: true, lastLogin: true },
  })
  return NextResponse.json(user)
}
