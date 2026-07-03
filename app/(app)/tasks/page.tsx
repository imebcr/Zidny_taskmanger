'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { motion } from 'framer-motion'
import { Plus, Search, Filter, X } from 'lucide-react'
import TaskCard from '@/components/TaskCard'
import TaskModal from '@/components/TaskModal'
import { DEPARTMENTS, STATUS_LABELS, PRIORITY_LABELS } from '@/lib/types'
import { GlassSelect } from '@/components/ui/GlassSelect'

type Task = {
  id: string; title: string; deadline: string; status: string; priority: string
  departmentTags: string; recurrence: string
  assignees: { user: { id: string; fullName: string } }[]
  subtasks: { isCompleted: boolean }[]
  _count: { comments: number }
  blockingOn?: { blockingTask: { status: string } }[]
}

type User = { id: string; fullName: string; username: string }

export default function TeamTasksPage() {
  const { data: session } = useSession()
  const [tasks, setTasks] = useState<Task[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({
    status: '', priority: '', department: '', assigneeId: '', deadline: '',
  })
  const [showFilters, setShowFilters] = useState(false)

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (filters.status) params.set('status', filters.status)
    if (filters.priority) params.set('priority', filters.priority)
    if (filters.department) params.set('department', filters.department)
    if (filters.assigneeId) params.set('assigneeId', filters.assigneeId)
    if (filters.deadline) params.set('deadline', filters.deadline)
    const res = await fetch(`/api/tasks?${params}`)
    if (res.ok) setTasks(await res.json())
    setLoading(false)
  }, [search, filters])

  useEffect(() => { fetchTasks() }, [fetchTasks])
  useEffect(() => { fetch('/api/users').then(r => r.json()).then(setUsers) }, [])

  function clearFilters() { setFilters({ status: '', priority: '', department: '', assigneeId: '', deadline: '' }); setSearch('') }
  const hasFilters = search || Object.values(filters).some(Boolean)

  async function createTask(data: Record<string, unknown>) {
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Erreur')
    await fetchTasks()
  }

  const container = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } }
  const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 400, damping: 28 } } }

  return (
    <div>
      <div className="px-6 py-5 border-b border-white/50 bg-white/20 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-navy font-bold text-xl">Tâches de l&apos;équipe</h1>
            <p className="text-navy/45 text-sm mt-0.5">{tasks.length} tâche{tasks.length !== 1 ? 's' : ''} au total</p>
          </div>
          {session?.user.role === 'ADMIN' && (
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-2 bg-brand hover:bg-ocean text-white font-semibold rounded-xl px-4 py-2 shadow-sm shadow-brand/25 transition-colors text-sm"
            >
              <Plus size={16} />
              Nouvelle tâche
            </button>
          )}
        </div>
      </div>

      <div className="p-6 space-y-4">
        {/* Search + Filter bar */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy/40" />
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher une tâche…"
              style={{ paddingLeft: '2.25rem' }}
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
              showFilters || hasFilters ? 'bg-brand text-white border-brand' : 'glass-sm border-silver text-navy/60 hover:text-navy'
            }`}
          >
            <Filter size={16} />
            Filtres
            {hasFilters && <span className="w-2 h-2 rounded-full bg-white" />}
          </button>
          {hasFilters && (
            <button onClick={clearFilters} className="p-2 glass-sm rounded-xl text-navy/40 hover:text-red-500 transition-colors">
              <X size={16} />
            </button>
          )}
        </div>

        {/* Filter panel */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3"
          >
            <div>
              <label className="block text-xs font-medium text-navy/50 mb-1.5">Statut</label>
              <GlassSelect
                value={filters.status}
                onChange={v => setFilters(f => ({ ...f, status: v }))}
                options={[{ value: '', label: 'Tous' }, ...Object.entries(STATUS_LABELS).map(([v, l]) => ({ value: v, label: l }))]}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-navy/50 mb-1.5">Priorité</label>
              <GlassSelect
                value={filters.priority}
                onChange={v => setFilters(f => ({ ...f, priority: v }))}
                options={[{ value: '', label: 'Toutes' }, ...Object.entries(PRIORITY_LABELS).map(([v, l]) => ({ value: v, label: l }))]}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-navy/50 mb-1.5">Département</label>
              <GlassSelect
                value={filters.department}
                onChange={v => setFilters(f => ({ ...f, department: v }))}
                options={[{ value: '', label: 'Tous' }, ...DEPARTMENTS.map(d => ({ value: d.value, label: d.label }))]}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-navy/50 mb-1.5">Membre</label>
              <GlassSelect
                value={filters.assigneeId}
                onChange={v => setFilters(f => ({ ...f, assigneeId: v }))}
                options={[{ value: '', label: 'Tous' }, ...users.map(u => ({ value: u.id, label: u.fullName }))]}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-navy/50 mb-1.5">Échéance</label>
              <GlassSelect
                value={filters.deadline}
                onChange={v => setFilters(f => ({ ...f, deadline: v }))}
                options={[
                  { value: '', label: 'Toutes' },
                  { value: 'today', label: "Aujourd'hui" },
                  { value: 'week', label: 'Cette semaine' },
                  { value: 'month', label: 'Ce mois' },
                ]}
              />
            </div>
          </motion.div>
        )}

        {/* Task grid */}
        {loading ? (
          <div className="text-center py-16 text-navy/40">Chargement…</div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">📭</div>
            <p className="text-navy font-semibold">Aucune tâche trouvée</p>
            <p className="text-navy/45 text-sm mt-1">Essayez de modifier vos filtres.</p>
          </div>
        ) : (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          >
            {tasks.map(task => (
              <motion.div key={task.id} variants={item}>
                <TaskCard task={task} />
              </motion.div>
            ))}
          </motion.div>
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
