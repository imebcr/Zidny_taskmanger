'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Mail, ArrowLeft } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    setLoading(true)
    await fetch('/api/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    setSent(true)
    setLoading(false)
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
          <Mail className="text-brand" size={28} />
        </div>
        <h1 className="text-2xl font-bold text-navy">Mot de passe oublié</h1>
        <p className="text-navy/45 text-sm mt-1">Saisissez votre email pour recevoir un lien de réinitialisation</p>
      </div>

      {sent ? (
        <div className="text-center space-y-4">
          <div className="text-green-600 text-sm bg-green-50 border border-green-200 rounded-xl px-4 py-4">
            Si un compte correspond à cet email, vous recevrez un lien dans quelques minutes.
          </div>
          <Link href="/login" className="flex items-center justify-center gap-2 text-brand hover:text-ocean text-sm font-semibold transition-colors">
            <ArrowLeft size={16} /> Retour à la connexion
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-navy/50 mb-1.5">Adresse email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="sara@agence.ma"
              required
              autoFocus
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand hover:bg-ocean text-white font-semibold rounded-xl py-2.5 shadow-sm shadow-brand/25 transition-colors disabled:opacity-60"
          >
            {loading ? 'Envoi…' : 'Envoyer le lien'}
          </button>
          <Link href="/login" className="flex items-center justify-center gap-2 text-navy/45 hover:text-navy text-sm transition-colors">
            <ArrowLeft size={16} /> Retour à la connexion
          </Link>
        </form>
      )}
    </motion.div>
  )
}
