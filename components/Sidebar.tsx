'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { motion } from 'framer-motion'
import {
  LayoutDashboard, ListTodo, KanbanSquare, Calendar, BarChart3,
  Users, User, LogOut, Clock,
} from 'lucide-react'

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

  return (
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
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
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
  )
}
