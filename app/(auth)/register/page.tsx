'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Eye, EyeOff } from 'lucide-react'
import { ZidnyIcon } from '@/components/ui/ZidnyIcon'
import { DEPARTMENTS } from '@/lib/types'
import { GlassSelect } from '@/components/ui/GlassSelect'

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    fullName: '', username: '', email: '', password: '', confirmPassword: '', department: '',
  })
  const [showPwd, setShowPwd] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function set(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Erreur'); return }
      router.push('/login?registered=1')
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
        <h1 className="text-2xl font-bold text-navy">Créer un compte</h1>
        <p className="text-navy/45 text-sm mt-1">Rejoignez l&apos;espace Zidny de votre équipe</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-navy/50 mb-1.5">Nom complet</label>
          <input type="text" value={form.fullName} onChange={set('fullName')} placeholder="Sara Cherkaoui" required />
        </div>
        <div>
          <label className="block text-xs font-medium text-navy/50 mb-1.5">Nom d&apos;utilisateur</label>
          <input type="text" value={form.username} onChange={set('username')} placeholder="sara" required />
        </div>
        <div>
          <label className="block text-xs font-medium text-navy/50 mb-1.5">Email</label>
          <input type="email" value={form.email} onChange={set('email')} placeholder="sara@agence.ma" required />
        </div>

        <div>
          <label className="block text-xs font-medium text-navy/50 mb-1.5">Département</label>
          <GlassSelect
            value={form.department}
            onChange={v => setForm(f => ({ ...f, department: v }))}
            options={DEPARTMENTS.map(({ value, label }) => ({ value, label }))}
            placeholder="Choisir votre département…"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-navy/50 mb-1.5">Mot de passe</label>
          <div className="relative">
            <input
              type={showPwd ? 'text' : 'password'}
              value={form.password}
              onChange={set('password')}
              placeholder="Minimum 8 caractères"
              required
              style={{ paddingRight: '2.5rem' }}
            />
            <button
              type="button"
              onClick={() => setShowPwd(!showPwd)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-navy/40 hover:text-navy/70"
            >
              {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-navy/50 mb-1.5">Confirmer le mot de passe</label>
          <input type="password" value={form.confirmPassword} onChange={set('confirmPassword')} placeholder="••••••••" required />
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
          {loading ? 'Création…' : 'Créer mon compte'}
        </button>
      </form>

      <p className="text-center text-sm text-navy/45 mt-6">
        Déjà un compte ?{' '}
        <Link href="/login" className="text-brand hover:text-ocean font-semibold transition-colors">
          Se connecter
        </Link>
      </p>
    </motion.div>
  )
}
