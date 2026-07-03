import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

const schema = z.object({
  fullName: z.string().min(2, 'Le nom complet est requis'),
  username: z.string().min(3, 'Minimum 3 caractères').regex(/^[a-zA-Z0-9_]+$/, 'Lettres, chiffres et underscore uniquement'),
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Minimum 8 caractères'),
  confirmPassword: z.string(),
  department: z.string().optional(),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = schema.parse(body)

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: data.email }, { username: data.username }] },
    })
    if (existing) {
      const field = existing.email === data.email ? 'email' : 'username'
      return NextResponse.json(
        { error: field === 'email' ? 'Cet email est déjà utilisé' : 'Ce nom d\'utilisateur est déjà pris' },
        { status: 409 }
      )
    }

    const passwordHash = await bcrypt.hash(data.password, 12)
    const user = await prisma.user.create({
      data: {
        fullName: data.fullName,
        username: data.username.toLowerCase().trim(),
        email: data.email.toLowerCase().trim(),
        department: data.department || '',
        passwordHash,
        role: 'MEMBER',
        isActive: true,
      },
    })

    return NextResponse.json({ success: true, userId: user.id }, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 })
    }
    console.error(err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
