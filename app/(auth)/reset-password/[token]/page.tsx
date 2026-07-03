'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { KeyRound, Eye, EyeOff } from 'lucide-react'

export default function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Erreur'); return }
      setSuccess(true)
      setTimeout(() => router.push('/login'), 2000)
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
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand/10 mb-4">
          <KeyRound className="text-brand" size={28} />
        </div>
        <h1 className="text-2xl font-bold text-navy">Nouveau mot de passe</h1>
        <p className="text-navy/45 text-sm mt-1">Choisissez un mot de passe sécurisé</p>
      </div>

      {success ? (
        <div className="text-center space-y-4">
          <div className="text-green-600 text-sm bg-green-50 border border-green-200 rounded-xl px-4 py-4">
            Mot de passe réinitialisé. Redirection…
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-navy/50 mb-1.5">Nouveau mot de passe</label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Minimum 8 caractères"
                required
                style={{ paddingRight: '2.5rem' }}
              />
              <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-navy/40">
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-navy/50 mb-1.5">Confirmer</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="••••••••" required />
          </div>
          {error && (
            <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand hover:bg-ocean text-white font-semibold rounded-xl py-2.5 shadow-sm shadow-brand/25 transition-colors disabled:opacity-60"
          >
            {loading ? 'Enregistrement…' : 'Réinitialiser'}
          </button>
          <Link href="/login" className="block text-center text-sm text-navy/45 hover:text-navy transition-colors">
            Retour à la connexion
          </Link>
        </form>
      )}
    </motion.div>
  )
}
