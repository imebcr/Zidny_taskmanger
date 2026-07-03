'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Users, ShieldCheck, UserX, UserCheck, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

type Member = {
  id: string; fullName: string; username: string; email: string
  role: string; isActive: boolean; createdAt: string; lastLogin: string | null
  _count: { assignedTasks: number }
}

export default function MembersPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (session?.user.role !== 'ADMIN') { router.push('/dashboard'); return }
    fetch('/api/admin/members').then(r => r.json()).then(data => { setMembers(data); setLoading(false) })
  }, [session, router])

  async function updateMember(userId: string, update: { isActive?: boolean; role?: string }) {
    await fetch('/api/admin/members', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, ...update }),
    })
    setMembers(prev => prev.map(m => m.id === userId ? { ...m, ...update } : m))
  }

  const container = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } }
  const item = { hidden: { opacity: 0, x: -10 }, show: { opacity: 1, x: 0 } }

  return (
    <div>
      <div className="px-6 py-5 border-b border-white/50 bg-white/20 backdrop-blur-sm flex items-center gap-3">
        <Users className="text-brand" size={22} />
        <div>
          <h1 className="text-navy font-bold text-xl">Gestion des membres</h1>
          <p className="text-navy/45 text-sm">{members.filter(m => m.isActive).length} membres actifs</p>
        </div>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="text-center py-16 text-navy/40">Chargement…</div>
        ) : (
          <motion.div variants={container} initial="hidden" animate="show" className="space-y-3">
            {members.map(member => (
              <motion.div key={member.id} variants={item} className="glass rounded-2xl p-4">
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${member.isActive ? 'bg-brand/20 text-brand' : 'bg-silver text-navy/30'}`}>
                    {member.fullName[0]}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-navy font-bold text-sm">{member.fullName}</span>
                      {member.role === 'ADMIN' && (
                        <span className="flex items-center gap-1 text-[10px] font-bold bg-brand/10 text-brand rounded-full px-2 py-0.5">
                          <ShieldCheck size={10} /> Admin
                        </span>
                      )}
                      {!member.isActive && (
                        <span className="text-[10px] font-bold bg-red-50 text-red-500 rounded-full px-2 py-0.5">Désactivé</span>
                      )}
                    </div>
                    <p className="text-navy/45 text-xs">@{member.username} · {member.email}</p>
                    <p className="text-navy/30 text-xs mt-0.5">
                      Inscrit le {format(new Date(member.createdAt), 'dd MMM yyyy', { locale: fr })}
                      {member.lastLogin && ` · Dernière connexion ${format(new Date(member.lastLogin), 'dd MMM', { locale: fr })}`}
                    </p>
                  </div>

                  {/* Stats */}
                  <div className="hidden sm:flex items-center gap-1 text-xs text-navy/40 shrink-0">
                    <RefreshCw size={12} />
                    {member._count.assignedTasks} tâche{member._count.assignedTasks !== 1 ? 's' : ''}
                  </div>

                  {/* Actions */}
                  {member.id !== session?.user.id && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => updateMember(member.id, { isActive: !member.isActive })}
                        title={member.isActive ? 'Désactiver' : 'Activer'}
                        className={`p-2 rounded-xl transition-colors ${member.isActive ? 'hover:bg-red-50 hover:text-red-500 text-navy/40' : 'hover:bg-green-50 hover:text-green-500 text-navy/40'}`}
                      >
                        {member.isActive ? <UserX size={17} /> : <UserCheck size={17} />}
                      </button>
                      {member.role !== 'ADMIN' && (
                        <button
                          onClick={() => updateMember(member.id, { role: 'ADMIN' })}
                          title="Promouvoir Admin"
                          className="p-2 rounded-xl text-navy/40 hover:text-brand hover:bg-brand/10 transition-colors"
                        >
                          <ShieldCheck size={17} />
                        </button>
                      )}
                      {member.role === 'ADMIN' && (
                        <button
                          onClick={() => updateMember(member.id, { role: 'MEMBER' })}
                          title="Rétrograder Membre"
                          className="p-2 rounded-xl text-brand hover:text-navy/40 hover:bg-silver transition-colors"
                        >
                          <ShieldCheck size={17} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  )
}
