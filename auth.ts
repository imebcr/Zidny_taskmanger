import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        login: { label: 'Email ou nom d\'utilisateur', type: 'text' },
        password: { label: 'Mot de passe', type: 'password' },
      },
      async authorize(credentials) {
        const login = (credentials?.login as string)?.trim().toLowerCase()
        const password = credentials?.password as string
        if (!login || !password) return null

        const user = await prisma.user.findFirst({
          where: {
            OR: [{ email: login }, { username: login }],
          },
        })
        if (!user || !user.isActive) return null

        const valid = await bcrypt.compare(password, user.passwordHash)
        if (!valid) return null

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLogin: new Date() },
        })

        return {
          id: user.id,
          name: user.fullName,
          email: user.email,
          image: null,
          role: user.role,
          username: user.username,
        }
      },
    }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as { role?: string }).role
        token.username = (user as { username?: string }).username
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.username = token.username as string
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
})
