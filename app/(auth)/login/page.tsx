'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Eye, EyeOff } from 'lucide-react'
import { ZidnyIcon } from '@/components/ui/ZidnyIcon'

export default function LoginPage() {
  const router = useRouter()
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [remember, setRemember] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await signIn('credentials', {
        login,
        password,
        redirect: false,
      })
      if (res?.error) {
        setError('Identifiants incorrects. Vérifiez votre email/nom d\'utilisateur et mot de passe.')
      } else {
        router.push('/dashboard')
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="glass rounded-2xl p-8"
    >
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center mb-4">
          <ZidnyIcon size={80} className="rounded-2xl shadow-sm" />
        </div>
        <h1 className="text-2xl font-bold text-navy">Bienvenue</h1>
        <p className="text-navy/45 text-sm mt-1">Connectez-vous à votre espace Zidny</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-navy/50 mb-1.5">Email ou nom d&apos;utilisateur</label>
          <input
            type="text"
            value={login}
            onChange={e => setLogin(e.target.value)}
            placeholder="ex: ali ou ali@agence.ma"
            required
            autoFocus
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-navy/50 mb-1.5">Mot de passe</label>
          <div className="relative">
            <input
              type={showPwd ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{ paddingRight: '2.5rem' }}
            />
            <button
              type="button"
              onClick={() => setShowPwd(!showPwd)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-navy/40 hover:text-navy/70 transition-colors"
            >
              {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-navy/60 cursor-pointer">
            <input
              type="checkbox"
              checked={remember}
              onChange={e => setRemember(e.target.checked)}
              style={{ width: 'auto' }}
              className="rounded"
            />
            Se souvenir de moi
          </label>
          <Link href="/forgot-password" className="text-sm text-brand hover:text-ocean transition-colors">
            Mot de passe oublié ?
          </Link>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-3"
          >
            {error}
          </motion.div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand hover:bg-ocean text-white font-semibold rounded-xl py-2.5 shadow-sm shadow-brand/25 transition-colors disabled:opacity-60"
        >
          {loading ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>

      <p className="text-center text-sm text-navy/45 mt-6">
        Pas encore de compte ?{' '}
        <Link href="/register" className="text-brand hover:text-ocean font-semibold transition-colors">
          S&apos;inscrire
        </Link>
      </p>
    </motion.div>
  )
}
