'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, ListTodo, KanbanSquare, Calendar, BarChart3,
  Users, User, LogOut, Clock,
} from 'lucide-react'
import ThemeToggle from '@/components/ThemeToggle'

const navItems = [
  { href: '/dashboard', label: 'Mes tâches', icon: LayoutDashboard },
  { href: '/tasks', label: 'Équipe', icon: ListTodo },
  { href: '/kanban', label: 'Kanban', icon: KanbanSquare },
  { href: '/timeline', label: 'Chronologie', icon: Clock },
  { href: '/calendar', label: 'Calendrier', icon: Calendar },
]

const adminItems = [
  { href: '/admin', label: 'Tableau de bord', icon: BarChart3 },
  { href: '/admin/members', label: 'Membres', icon: Users },
]

interface SidebarProps {
  role: string
  fullName: string
}

export default function Sidebar({ role, fullName }: SidebarProps) {
  const pathname = usePathname()
  const [showConfirm, setShowConfirm] = useState(false)

  return (
    <>
      <aside className="glass-sidebar fixed inset-y-0 left-0 w-56 z-30 flex flex-col hidden lg:flex">
        {/* Logo */}
        <div className="px-5 py-4 border-b border-white/40 flex items-center">
          <img src="/zidny-logo.svg" alt="Zidny" className="h-9 w-auto" />
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 no-scrollbar">
          <p className="text-navy/40 text-xs font-medium uppercase tracking-widest px-2 mb-2">Navigation</p>
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
            return (
              <Link key={href} href={href}>
                <motion.div
                  whileHover={{ x: 2 }}
                  transition={{ type: 'spring' as const, stiffness: 400, damping: 30 }}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
                    active
                      ? 'bg-brand/15 text-brand'
                      : 'text-navy/60 hover:text-navy hover:bg-white/40'
                  }`}
                >
                  <Icon size={17} />
                  {label}
                  {active && (
                    <motion.div
                      layoutId="sidebar-active"
                      className="ml-auto w-1.5 h-1.5 rounded-full bg-brand"
                    />
                  )}
                </motion.div>
              </Link>
            )
          })}

          {role === 'ADMIN' && (
            <>
              <p className="text-navy/40 text-xs font-medium uppercase tracking-widest px-2 mb-2 mt-5">Administration</p>
              {adminItems.map(({ href, label, icon: Icon }) => {
                const active = pathname === href || pathname.startsWith(href + '/')
                return (
                  <Link key={href} href={href}>
                    <motion.div
                      whileHover={{ x: 2 }}
                      transition={{ type: 'spring' as const, stiffness: 400, damping: 30 }}
                      className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
                        active
                          ? 'bg-brand/15 text-brand'
                          : 'text-navy/60 hover:text-navy hover:bg-white/40'
                      }`}
                    >
                      <Icon size={17} />
                      {label}
                    </motion.div>
                  </Link>
                )
              })}
            </>
          )}
        </nav>

        {/* Bottom */}
        <div className="px-3 py-4 border-t border-white/40 space-y-1">
          <Link href="/profile">
            <div className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold text-navy/60 hover:text-navy hover:bg-white/40 transition-all">
              <User size={17} />
              Profil
            </div>
          </Link>
          <ThemeToggle mode="nav" />
          <button
            onClick={() => setShowConfirm(true)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold text-navy/60 hover:text-red-500 hover:bg-red-50 transition-all"
          >
            <LogOut size={17} />
            Déconnexion
          </button>
          <div className="flex items-center gap-2 px-3 pt-2">
            <div className="w-7 h-7 rounded-full bg-brand/20 flex items-center justify-center text-brand text-xs font-bold">
              {fullName[0]?.toUpperCase()}
            </div>
            <span className="text-navy/70 text-xs font-medium truncate">{fullName}</span>
          </div>
        </div>
      </aside>

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
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
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
