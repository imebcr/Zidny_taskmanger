'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { motion } from 'framer-motion'
import { Plus, Clock, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react'
import { format, isPast, isWithinInterval, addHours } from 'date-fns'
import { fr } from 'date-fns/locale'
import TaskCard from '@/components/TaskCard'
import TaskModal from '@/components/TaskModal'

type Task = {
  id: string; title: string; deadline: string; status: string; priority: string
  departmentTags: string; recurrence: string
  assignees: { user: { id: string; fullName: string } }[]
  subtasks: { isCompleted: boolean }[]
  _count: { comments: number }
  blockingOn?: { blockingTask: { status: string } }[]
}

const FILTER_CHIPS = [
  { key: '', label: 'Toutes' },
  { key: 'OVERDUE', label: 'En retard' },
  { key: 'soon', label: 'Bientôt' },
  { key: 'IN_PROGRESS', label: 'En cours' },
  { key: 'TODO', label: 'À faire' },
  { key: 'DONE', label: 'Terminées' },
]

export default function DashboardPage() {
  const { data: session } = useSession()
  const [tasks, setTasks] = useState<Task[]>([])
  const [filter, setFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [users, setUsers] = useState<{ id: string; fullName: string; username: string }[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/tasks?mine=true')
    if (res.ok) setTasks(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchTasks()
    fetch('/api/users').then(r => r.json()).then(setUsers)
    const interval = setInterval(fetchTasks, 30000)
    return () => clearInterval(interval)
  }, [fetchTasks])

  const filtered = tasks.filter(t => {
    if (!filter) return true
    if (filter === 'soon') {
      const d = new Date(t.deadline)
      return !isPast(d) && isWithinInterval(d, { start: new Date(), end: addHours(new Date(), 48) }) && t.status !== 'DONE'
    }
    return t.status === filter
  })

  const stats = {
    overdue: tasks.filter(t => t.status === 'OVERDUE').length,
    inProgress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
    done: tasks.filter(t => t.status === 'DONE').length,
    total: tasks.length,
  }

  async function createTask(data: Record<string, unknown>) {
    const isAdmin = session?.user.role === 'ADMIN'
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        assigneeIds: isAdmin ? (data.assigneeIds || []) : [session?.user.id],
      }),
    })
    if (!res.ok) throw new Error('Erreur')
    await fetchTasks()
  }

  const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } }
  const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 400, damping: 28 } } }

  return (
    <div>
      {/* Header */}
      <div className="px-6 py-5 border-b border-white/50 bg-white/20 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-navy font-bold text-xl">
              Bonjour, {session?.user.name?.split(' ')[0]} 👋
            </h1>
            <p className="text-navy/45 text-sm mt-0.5">Vos tâches du jour</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchTasks}
              className="p-2 glass-sm rounded-xl text-navy/40 hover:text-brand transition-colors"
              title="Actualiser"
            >
              <RefreshCw size={16} />
            </button>
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-2 bg-brand hover:bg-ocean text-white font-semibold rounded-xl px-4 py-2 shadow-sm shadow-brand/25 transition-colors text-sm"
            >
              <Plus size={16} />
              Nouvelle tâche
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3"
        >
          {[
            { label: 'Total', value: stats.total, icon: <RefreshCw size={18} />, color: 'text-navy/60' },
            { label: 'En retard', value: stats.overdue, icon: <AlertCircle size={18} />, color: 'text-red-500' },
            { label: 'En cours', value: stats.inProgress, icon: <Clock size={18} />, color: 'text-brand' },
            { label: 'Terminées', value: stats.done, icon: <CheckCircle2 size={18} />, color: 'text-green-500' },
          ].map(s => (
            <div key={s.label} className="glass-sm rounded-2xl p-4">
              <div className={`mb-2 ${s.color}`}>{s.icon}</div>
              <div className="text-2xl font-bold text-navy">{s.value}</div>
              <div className="text-xs text-navy/45 font-medium">{s.label}</div>
            </div>
          ))}
        </motion.div>

        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {FILTER_CHIPS.map(chip => (
            <button
              key={chip.key}
              onClick={() => setFilter(chip.key)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
                filter === chip.key
                  ? 'bg-brand text-white shadow-sm shadow-brand/25'
                  : 'glass-sm text-navy/60 hover:text-navy'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Task list */}
        {loading ? (
          <div className="text-center py-16 text-navy/40">Chargement…</div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <div className="text-5xl mb-4">🎉</div>
            <p className="text-navy font-semibold">Aucune tâche ici</p>
            <p className="text-navy/45 text-sm mt-1">
              {filter ? 'Aucune tâche dans cette catégorie.' : 'Commencez par créer une nouvelle tâche !'}
            </p>
          </motion.div>
        ) : (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-3"
          >
            {filtered.map(task => (
              <motion.div key={task.id} variants={item}>
                <TaskCard task={task} />
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Personal timeline */}
        {tasks.length > 0 && !filter && (
          <div>
            <h2 className="text-navy font-bold text-base mb-4 mt-6">Chronologie personnelle</h2>
            <div className="relative pl-5">
              <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-brand/40 to-transparent" />
              {tasks.filter(t => t.status !== 'DONE').slice(0, 10).map((task, i) => {
                const d = new Date(task.deadline)
                const isLate = isPast(d)
                return (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="relative flex gap-4 mb-4"
                  >
                    <div className={`absolute -left-3 top-2 w-3 h-3 rounded-full border-2 border-white ${isLate ? 'bg-red-400' : 'bg-brand'}`} />
                    <div className="glass-sm rounded-xl p-3 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-navy font-semibold text-sm line-clamp-1">{task.title}</span>
                        <span className={`text-xs font-medium shrink-0 ${isLate ? 'text-red-500' : 'text-navy/45'}`}>
                          {format(d, 'dd MMM', { locale: fr })}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <TaskModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={createTask}
        users={users}
        isAdmin={session?.user.role === 'ADMIN'}
      />
    </div>
  )
}
