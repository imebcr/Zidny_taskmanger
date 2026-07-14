'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import { LayoutDashboard, ListTodo, KanbanSquare, Calendar, User, LogOut } from 'lucide-react'

const items = [
  { href: '/dashboard', label: 'Tâches', icon: LayoutDashboard },
  { href: '/tasks', label: 'Équipe', icon: ListTodo },
  { href: '/kanban', label: 'Kanban', icon: KanbanSquare },
  { href: '/calendar', label: 'Agenda', icon: Calendar },
  { href: '/profile', label: 'Profil', icon: User },
]

export default function BottomNav() {
  const pathname = usePathname()
  const [showConfirm, setShowConfirm] = useState(false)

  return (
    <>
      <nav className="glass-nav fixed bottom-0 left-0 right-0 z-30 flex lg:hidden">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link key={href} href={href} className="flex-1 flex flex-col items-center py-2 gap-0.5">
              <Icon size={21} className={active ? 'text-brand' : 'text-navy/40'} />
              <span className={`text-[10px] font-semibold ${active ? 'text-brand' : 'text-navy/40'}`}>
                {label}
              </span>
            </Link>
          )
        })}
        <button
          onClick={() => setShowConfirm(true)}
          className="flex-1 flex flex-col items-center py-2 gap-0.5 text-navy/40 hover:text-red-500 transition-colors"
        >
          <LogOut size={21} />
          <span className="text-[10px] font-semibold">Quitter</span>
        </button>
      </nav>

      {/* Logout confirmation */}
      <AnimatePresence>
        {showConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowConfirm(false)}
              className="absolute inset-0 bg-navy/20 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring' as const, stiffness: 340, damping: 28 }}
              className="glass rounded-2xl p-6 max-w-sm w-full relative z-10"
            >
              <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
                <LogOut size={22} className="text-red-500" />
              </div>
              <h3 className="text-navy font-bold text-lg mb-1">Déconnexion</h3>
              <p className="text-navy/50 text-sm mb-6">Êtes-vous sûr de vouloir vous déconnecter de Zidny ?</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 border border-silver text-navy/50 hover:text-navy hover:bg-white/50 rounded-xl py-2.5 text-sm font-semibold transition-all"
                >
                  Annuler
                </button>
                <button
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl py-2.5 text-sm transition-colors"
                >
                  Déconnexion
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
