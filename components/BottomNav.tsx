'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
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

  return (
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
        onClick={() => signOut({ callbackUrl: '/login' })}
        className="flex-1 flex flex-col items-center py-2 gap-0.5 text-navy/40 hover:text-red-500 transition-colors"
      >
        <LogOut size={21} />
        <span className="text-[10px] font-semibold">Quitter</span>
      </button>
    </nav>
  )
}
