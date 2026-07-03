import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

const schema = z.object({ email: z.string().email() })

export async function POST(req: NextRequest) {
  try {
    const { email } = schema.parse(await req.json())
    const user = await prisma.user.findUnique({ where: { email } })

    // Always return success to avoid email enumeration
    if (!user || !user.isActive) {
      return NextResponse.json({ success: true })
    }

    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000) // 30 min

    await prisma.passwordResetToken.create({
      data: { userId: user.id, token, expiresAt },
    })

    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password/${token}`
    console.log(`[DEV] Reset link for ${email}: ${resetUrl}`)

    if (process.env.RESEND_API_KEY) {
      try {
        const { Resend } = await import('resend')
        const resend = new Resend(process.env.RESEND_API_KEY)
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'noreply@example.com',
          to: email,
          subject: 'Réinitialisation de votre mot de passe — Zidny',
          html: `
            <p>Bonjour ${user.fullName},</p>
            <p>Vous avez demandé à réinitialiser votre mot de passe.</p>
            <p><a href="${resetUrl}" style="color:#2AA4E7">Cliquez ici pour réinitialiser</a></p>
            <p>Ce lien expire dans 30 minutes.</p>
            <p>Si vous n'avez pas effectué cette demande, ignorez cet email.</p>
          `,
        })
      } catch (e) {
        console.error('Email error:', e)
      }
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
