'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { User, Bell, Lock, Check, Eye, EyeOff } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface Profile {
  id: string; fullName: string; username: string; email: string
  role: string; notifyEmail: boolean; notifyPush: boolean
  createdAt: string; lastLogin: string | null
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [notifyEmail, setNotifyEmail] = useState(true)
  const [notifyPush, setNotifyPush] = useState(true)
  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/profile').then(r => r.json()).then((p: Profile) => {
      setProfile(p)
      setFullName(p.fullName)
      setUsername(p.username)
      setEmail(p.email)
      setNotifyEmail(p.notifyEmail)
      setNotifyPush(p.notifyPush)
    })
  }, [])

  async function save() {
    setError(''); setSaving(true)
    try {
      const body: Record<string, unknown> = { fullName, username, email, notifyEmail, notifyPush }
      if (currentPwd && newPwd) { body.currentPassword = currentPwd; body.newPassword = newPwd }
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setCurrentPwd(''); setNewPwd('')
      setSaved(true); setTimeout(() => setSaved(false), 3000)
    } finally { setSaving(false) }
  }

  const [pushStatus, setPushStatus] = useState<'idle' | 'loading' | 'done' | 'error' | 'denied'>('idle')

  async function subscribePush() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPushStatus('error')
      return
    }
    setPushStatus('loading')
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setPushStatus('denied')
        return
      }
      const reg = await navigator.serviceWorker.ready
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidKey) { setPushStatus('error'); return }

      let sub = await reg.pushManager.getSubscription()
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        })
      }
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub),
      })
      setPushStatus(res.ok ? 'done' : 'error')
    } catch (err) {
      console.error('Push subscription error:', err)
      setPushStatus('error')
    }
  }

  function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const rawData = window.atob(base64)
    return new Uint8Array([...rawData].map(c => c.charCodeAt(0)))
  }

  if (!profile) return <div className="flex items-center justify-center min-h-screen"><div className="text-navy/40">Chargement…</div></div>

  return (
    <div>
      <div className="px-6 py-5 border-b border-white/50 bg-white/20 backdrop-blur-sm">
        <h1 className="text-navy font-bold text-xl">Mon profil</h1>
        <p className="text-navy/45 text-sm mt-0.5">Paramètres et préférences</p>
      </div>

      <div className="p-6 max-w-2xl mx-auto space-y-5">
        {/* Profile info */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-5">
            <User size={18} className="text-brand" />
            <h2 className="text-navy font-bold">Informations personnelles</h2>
          </div>

          {/* Avatar */}
          <div className="flex items-center gap-4 mb-5">
            <div className="w-14 h-14 rounded-2xl bg-brand/20 flex items-center justify-center text-xl font-bold text-brand">
              {profile.fullName[0]}
            </div>
            <div>
              <p className="text-navy font-bold">{profile.fullName}</p>
              <p className="text-navy/45 text-sm">@{profile.username} · {profile.role === 'ADMIN' ? 'Administrateur' : 'Membre'}</p>
              <p className="text-navy/35 text-xs">
                Membre depuis {format(new Date(profile.createdAt), 'MMMM yyyy', { locale: fr })}
                {profile.lastLogin && ` · Dernière connexion ${format(new Date(profile.lastLogin), 'dd MMM', { locale: fr })}`}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-navy/50 mb-1.5">Nom complet</label>
              <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-navy/50 mb-1.5">{"Nom d'utilisateur"}</label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value.toLowerCase())} placeholder="sara" />
            </div>
            <div>
              <label className="block text-xs font-medium text-navy/50 mb-1.5">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="sara@agence.ma" />
            </div>
          </div>
        </motion.div>

        {/* Notifications */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }} className="glass rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-5">
            <Bell size={18} className="text-brand" />
            <h2 className="text-navy font-bold">Préférences de notification</h2>
          </div>

          <div className="space-y-4">
            {[
              { label: 'Notifications par email', desc: 'Rappels d\'échéance, tâches assignées, mentions', value: notifyEmail, set: setNotifyEmail },
              { label: 'Notifications push', desc: 'Alertes en temps réel dans le navigateur', value: notifyPush, set: setNotifyPush },
            ].map(item => (
              <label key={item.label} className="flex items-start gap-3 cursor-pointer">
                <div className="relative mt-0.5">
                  <input
                    type="checkbox"
                    checked={item.value}
                    onChange={e => item.set(e.target.checked)}
                    style={{ width: 'auto' }}
                    className="sr-only"
                  />
                  <div
                    onClick={() => item.set(!item.value)}
                    className={`w-10 h-6 rounded-full transition-colors ${item.value ? 'bg-brand' : 'bg-silver'} relative`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${item.value ? 'translate-x-5' : 'translate-x-1'}`} />
                  </div>
                </div>
                <div>
                  <p className="text-navy font-semibold text-sm">{item.label}</p>
                  <p className="text-navy/45 text-xs">{item.desc}</p>
                </div>
              </label>
            ))}

            {notifyPush && (
              <button
                onClick={subscribePush}
                disabled={pushStatus === 'loading' || pushStatus === 'done'}
                className="text-sm font-semibold transition-colors disabled:opacity-60
                  text-brand hover:text-ocean"
              >
                {pushStatus === 'loading' && 'Activation…'}
                {pushStatus === 'done' && '✓ Notifications activées dans ce navigateur'}
                {pushStatus === 'denied' && '⚠ Permission refusée — autorisez dans les paramètres du navigateur'}
                {pushStatus === 'error' && '✗ Erreur — réessayez ou vérifiez la console'}
                {pushStatus === 'idle' && 'Activer les notifications push dans ce navigateur →'}
              </button>
            )}
          </div>
        </motion.div>

        {/* Change password */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="glass rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-5">
            <Lock size={18} className="text-brand" />
            <h2 className="text-navy font-bold">Changer le mot de passe</h2>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-navy/50 mb-1.5">Mot de passe actuel</label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={currentPwd}
                  onChange={e => setCurrentPwd(e.target.value)}
                  placeholder="••••••••"
                  style={{ paddingRight: '2.5rem' }}
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-navy/40">
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-navy/50 mb-1.5">Nouveau mot de passe</label>
              <input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="Minimum 8 caractères" />
            </div>
          </div>
        </motion.div>

        {error && <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</div>}

        <button
          onClick={save}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 bg-brand hover:bg-ocean text-white font-semibold rounded-xl py-3 shadow-sm shadow-brand/25 transition-colors disabled:opacity-60"
        >
          {saved ? <><Check size={16} /> Enregistré</> : saving ? 'Enregistrement…' : 'Enregistrer les modifications'}
        </button>
      </div>
    </div>
  )
}
