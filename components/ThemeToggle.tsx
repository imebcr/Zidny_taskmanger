'use client'

import { useState, useEffect } from 'react'
import { Moon, Sun } from 'lucide-react'

export default function ThemeToggle({ mode = 'nav' }: { mode?: 'nav' | 'toggle' }) {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    setDark(document.documentElement.dataset.theme === 'dark')
  }, [])

  function toggle() {
    const next = dark ? 'light' : 'dark'
    document.documentElement.dataset.theme = next
    try { localStorage.setItem('theme', next) } catch (_) {}
    setDark(!dark)
  }

  if (mode === 'nav') {
    return (
      <button
        onClick={toggle}
        className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold text-navy/60 hover:text-navy hover:bg-white/40 transition-all"
      >
        {dark ? <Sun size={17} /> : <Moon size={17} />}
        {dark ? 'Mode clair' : 'Mode sombre'}
      </button>
    )
  }

  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-navy font-semibold text-sm">Mode sombre</p>
        <p className="text-navy/45 text-xs">Réduire la luminosité de l&apos;interface</p>
      </div>
      <button
        onClick={toggle}
        aria-label={dark ? 'Désactiver le mode sombre' : 'Activer le mode sombre'}
        className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${dark ? 'bg-brand' : 'bg-silver'}`}
      >
        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow flex items-center justify-center transition-transform ${dark ? 'translate-x-5' : 'translate-x-1'}`}>
          {dark ? <Moon size={9} className="text-brand" /> : <Sun size={9} className="text-navy/40" />}
        </div>
      </button>
    </div>
  )
}
