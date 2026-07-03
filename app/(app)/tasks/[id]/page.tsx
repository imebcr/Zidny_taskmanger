'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Edit2, Trash2, Plus, Check, X, Send, RefreshCw,
  AlertCircle, Calendar, Clock, User, ChevronDown, CheckSquare
} from 'lucide-react'
import { format, formatDistanceToNow, isPast } from 'date-fns'
import { fr } from 'date-fns/locale'
import StatusBadge from '@/components/StatusBadge'
import PriorityBadge from '@/components/PriorityBadge'
import TaskModal from '@/components/TaskModal'
import { STATUS_LABELS, DEPARTMENTS } from '@/lib/types'

type Subtask = { id: string; title: string; isCompleted: boolean; order: number }
type Comment = { id: string; content: string; createdAt: string; isSystemLog: boolean; user: { id: string; fullName: string; username: string } }
type Task = {
  id: string; title: string; description: string | null; deadline: string
  status: string; priority: string; departmentTags: string; recurrence: string
  createdAt: string; completedAt: string | null; parentTaskId: string | null
  createdBy: { id: string; fullName: string }
  assignees: { user: { id: string; fullName: string } }[]
  subtasks: Subtask[]
  blockingOn: { blockingTask: { id: string; title: string; status: string } }[]
  blockedTasks: { blockedTask: { id: string; title: string; status: string } }[]
  _count: { comments: number }
}

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: session } = useSession()
  const [task, setTask] = useState<Task | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [users, setUsers] = useState<{ id: string; fullName: string; username: string }[]>([])
  const [editOpen, setEditOpen] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [newSubtask, setNewSubtask] = useState('')
  const [showDelete, setShowDelete] = useState(false)
  const [statusOpen, setStatusOpen] = useState(false)
  const commentsEndRef = useRef<HTMLDivElement>(null)

  const fetchTask = useCallback(async () => {
    const res = await fetch(`/api/tasks/${id}`)
    if (res.ok) setTask(await res.json())
  }, [id])

  const fetchComments = useCallback(async () => {
    const res = await fetch(`/api/tasks/${id}/comments`)
    if (res.ok) setComments(await res.json())
  }, [id])

  useEffect(() => {
    fetchTask()
    fetchComments()
    fetch('/api/users').then(r => r.json()).then(setUsers)
  }, [fetchTask, fetchComments])

  async function updateStatus(status: string) {
    await fetch(`/api/tasks/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setStatusOpen(false)
    fetchTask()
    fetchComments()
  }

  async function toggleSubtask(subtask: Subtask) {
    // Optimistic update
    setTask(t => t ? { ...t, subtasks: t.subtasks.map(s => s.id === subtask.id ? { ...s, isCompleted: !s.isCompleted } : s) } : t)
    const res = await fetch(`/api/tasks/${id}/subtasks`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subtaskId: subtask.id, isCompleted: !subtask.isCompleted }),
    })
    if (!res.ok) fetchTask() // revert on failure
  }

  async function addSubtask() {
    if (!newSubtask.trim()) return
    const title = newSubtask.trim()
    setNewSubtask('')
    const res = await fetch(`/api/tasks/${id}/subtasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    })
    if (res.ok) {
      const created = await res.json()
      setTask(t => t ? { ...t, subtasks: [...t.subtasks, created] } : t)
    }
  }

  async function deleteSubtask(subtaskId: string) {
    setTask(t => t ? { ...t, subtasks: t.subtasks.filter(s => s.id !== subtaskId) } : t)
    await fetch(`/api/tasks/${id}/subtasks?subtaskId=${subtaskId}`, { method: 'DELETE' })
  }

  async function postComment(e: { preventDefault(): void }) {
    e.preventDefault()
    if (!newComment.trim()) return
    const content = newComment.trim()
    setNewComment('')
    const res = await fetch(`/api/tasks/${id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    })
    if (res.ok) {
      const created = await res.json()
      setComments(c => [...c, created])
      setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    }
  }

  async function deleteComment(commentId: string) {
    await fetch(`/api/tasks/${id}/comments?commentId=${commentId}`, { method: 'DELETE' })
    fetchComments()
  }

  async function deleteTask() {
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
    router.push('/tasks')
  }

  async function updateTask(data: Record<string, unknown>) {
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Erreur')
    fetchTask()
    fetchComments()
  }

  if (!task) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-navy/40">Chargement…</div>
      </div>
    )
  }

  const isAdmin = session?.user.role === 'ADMIN'
  const isAssignee = task.assignees.some(a => a.user.id === session?.user.id)
  const canEdit = isAdmin || task.createdBy.id === session?.user.id || isAssignee

  const tags = JSON.parse(task.departmentTags || '[]') as string[]
  const deadline = new Date(task.deadline)
  const isLate = isPast(deadline) && task.status !== 'DONE'
  const doneSubtasks = task.subtasks.filter(s => s.isCompleted).length
  const subtaskPct = task.subtasks.length ? Math.round((doneSubtasks / task.subtasks.length) * 100) : 0
  const isBlocked = task.blockingOn.some(d => d.blockingTask.status !== 'DONE')

  return (
    <div>
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/50 bg-white/20 backdrop-blur-sm flex items-center gap-3">
        <button onClick={() => router.back()} className="text-navy/40 hover:text-navy transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-navy font-bold text-lg leading-tight truncate">{task.title}</h1>
        </div>
        {canEdit && (
          <div className="flex items-center gap-2">
            <button onClick={() => setEditOpen(true)} className="text-navy/40 hover:text-brand transition-colors p-1.5">
              <Edit2 size={18} />
            </button>
            {(isAdmin || task.createdBy.id === session?.user.id) && (
              <button onClick={() => setShowDelete(true)} className="text-navy/40 hover:text-red-500 transition-colors p-1.5">
                <Trash2 size={18} />
              </button>
            )}
          </div>
        )}
      </div>

      <div className="p-6 grid lg:grid-cols-3 gap-6">
        {/* Main */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status + priority */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl p-5 space-y-4"
          >
            <div className="flex items-center gap-3 flex-wrap">
              {/* Status dropdown */}
              <div className="relative">
                <button
                  onClick={() => setStatusOpen(!statusOpen)}
                  className="flex items-center gap-1.5"
                >
                  <StatusBadge status={task.status} />
                  {canEdit && <ChevronDown size={14} className="text-navy/40" />}
                </button>
                <AnimatePresence>
                  {statusOpen && canEdit && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="absolute top-full left-0 mt-1 glass rounded-xl p-1 z-20 min-w-36 shadow-lg"
                    >
                      {(isAdmin
                        ? Object.entries(STATUS_LABELS)
                        : (['IN_PROGRESS', 'DONE'] as const).map(v => [v, STATUS_LABELS[v]] as [string, string])
                      ).map(([v, l]) => (
                        <button
                          key={v}
                          onClick={() => updateStatus(v)}
                          className="w-full text-left px-3 py-1.5 rounded-lg text-sm text-navy hover:bg-brand/10 transition-colors"
                        >
                          {l}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <PriorityBadge priority={task.priority} />
              {task.recurrence !== 'NONE' && (
                <span className="flex items-center gap-1 text-xs text-navy/45"><RefreshCw size={12} /> Récurrente</span>
              )}
              {isBlocked && (
                <span className="flex items-center gap-1 text-xs text-orange-500 bg-orange-50 rounded-full px-2 py-0.5 font-semibold">
                  <AlertCircle size={12} /> Bloquée
                </span>
              )}
            </div>

            {task.description && (
              <p className="text-navy/70 text-sm leading-relaxed">{task.description}</p>
            )}

            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-navy/60">
                <Calendar size={15} className="text-brand" />
                <span>Créée le {format(new Date(task.createdAt), 'dd MMM yyyy', { locale: fr })}</span>
              </div>
              <div className={`flex items-center gap-2 ${isLate ? 'text-red-500' : 'text-navy/60'}`}>
                <Clock size={15} className={isLate ? 'text-red-400' : 'text-brand'} />
                <span>Échéance : {format(deadline, 'dd MMM yyyy à HH:mm', { locale: fr })}</span>
              </div>
              {task.completedAt && (
                <div className="flex items-center gap-2 text-green-600">
                  <Check size={15} />
                  <span>Terminée le {format(new Date(task.completedAt), 'dd MMM yyyy', { locale: fr })}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-navy/60">
                <User size={15} className="text-brand" />
                <span>Créée par {task.createdBy.fullName}</span>
              </div>
            </div>

            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map(tag => {
                  const dept = DEPARTMENTS.find(d => d.value === tag)
                  return dept ? (
                    <span key={tag} className="text-xs font-medium bg-brand/10 text-brand rounded-full px-3 py-1">
                      {dept.label}
                    </span>
                  ) : null
                })}
              </div>
            )}
          </motion.div>

          {/* Subtasks */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 }}
            className="glass rounded-2xl p-5"
          >
            <div className="flex items-center gap-2 mb-4">
              <CheckSquare size={17} className="text-brand" />
              <h2 className="text-navy font-bold">Sous-tâches</h2>
              <span className="text-navy/40 text-sm">({doneSubtasks}/{task.subtasks.length})</span>
              {task.subtasks.length > 0 && (
                <span className="ml-auto text-xs text-navy/40">{subtaskPct}%</span>
              )}
            </div>

            {task.subtasks.length > 0 && (
              <div className="h-1.5 bg-silver rounded-full mb-4 overflow-hidden">
                <div className="h-full bg-brand rounded-full transition-all duration-500" style={{ width: `${subtaskPct}%` }} />
              </div>
            )}

            <div className="space-y-2">
              {task.subtasks.map(subtask => (
                <div key={subtask.id} className="flex items-center gap-3 group">
                  <button
                    onClick={() => toggleSubtask(subtask)}
                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                      subtask.isCompleted ? 'bg-brand border-brand' : 'border-silver hover:border-brand'
                    }`}
                  >
                    {subtask.isCompleted && <Check size={11} className="text-white" strokeWidth={3} />}
                  </button>
                  <span className={`flex-1 text-sm ${subtask.isCompleted ? 'line-through text-navy/35' : 'text-navy/80'}`}>
                    {subtask.title}
                  </span>
                  {canEdit && (
                    <button
                      onClick={() => deleteSubtask(subtask.id)}
                      className="opacity-0 group-hover:opacity-100 text-navy/30 hover:text-red-400 transition-all"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {canEdit && (
              <div className="flex gap-2 mt-3">
                <input
                  type="text"
                  value={newSubtask}
                  onChange={e => setNewSubtask(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addSubtask()}
                  placeholder="Ajouter une sous-tâche…"
                  className="flex-1"
                />
                <button
                  onClick={addSubtask}
                  className="px-3 py-2 bg-brand/10 hover:bg-brand/20 text-brand rounded-xl transition-colors"
                >
                  <Plus size={16} />
                </button>
              </div>
            )}
          </motion.div>

          {/* Dependencies */}
          {(task.blockingOn.length > 0 || task.blockedTasks.length > 0) && (
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.09 }}
              className="glass rounded-2xl p-5 space-y-3"
            >
              <h2 className="text-navy font-bold">Dépendances</h2>
              {task.blockingOn.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-navy/50 mb-2">Bloquée par :</p>
                  {task.blockingOn.map(dep => (
                    <div key={dep.blockingTask.id} className="flex items-center gap-2 text-sm py-1">
                      <AlertCircle size={14} className={dep.blockingTask.status !== 'DONE' ? 'text-orange-400' : 'text-green-400'} />
                      <span className={dep.blockingTask.status !== 'DONE' ? 'text-orange-600' : 'text-green-600 line-through'}>
                        {dep.blockingTask.title}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {task.blockedTasks.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-navy/50 mb-2">Bloque :</p>
                  {task.blockedTasks.map(dep => (
                    <div key={dep.blockedTask.id} className="flex items-center gap-2 text-sm py-1">
                      <span className="text-navy/60">{dep.blockedTask.title}</span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* Comments */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="glass rounded-2xl p-5"
          >
            <h2 className="text-navy font-bold mb-4">Commentaires &amp; Activité</h2>
            <div className="space-y-3 max-h-80 overflow-y-auto mb-4 pr-1">
              {comments.length === 0 && (
                <p className="text-navy/40 text-sm text-center py-4">Aucun commentaire pour l&apos;instant.</p>
              )}
              {comments.map(comment => (
                <div key={comment.id} className={`rounded-xl p-3 text-sm ${comment.isSystemLog ? 'bg-brand/5 border border-brand/10' : 'bg-white/40'}`}>
                  {comment.isSystemLog ? (
                    <p className="text-navy/50 italic">{comment.content}</p>
                  ) : (
                    <>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-navy text-xs">{comment.user.fullName}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-navy/35 text-xs">
                            {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: fr })}
                          </span>
                          {(comment.user.id === session?.user.id || isAdmin) && (
                            <button onClick={() => deleteComment(comment.id)} className="text-navy/30 hover:text-red-400 transition-colors">
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-navy/70 leading-relaxed">{comment.content}</p>
                    </>
                  )}
                </div>
              ))}
              <div ref={commentsEndRef} />
            </div>
            <form onSubmit={postComment} className="flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                placeholder="Ajouter un commentaire (@mention…)"
                className="flex-1"
              />
              <button
                type="submit"
                disabled={!newComment.trim()}
                className="px-3 py-2 bg-brand hover:bg-ocean text-white rounded-xl transition-colors disabled:opacity-40"
              >
                <Send size={16} />
              </button>
            </form>
          </motion.div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Assignees */}
          <motion.div
            initial={{ opacity: 0, x: 14 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.08 }}
            className="glass rounded-2xl p-4"
          >
            <h3 className="text-navy font-bold text-sm mb-3">Assigné(s)</h3>
            {task.assignees.length === 0 ? (
              <p className="text-navy/40 text-sm">Non assignée</p>
            ) : (
              <div className="space-y-2">
                {task.assignees.map(({ user }) => (
                  <div key={user.id} className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-brand/20 flex items-center justify-center text-xs font-bold text-brand">
                      {user.fullName[0]}
                    </div>
                    <span className="text-navy/70 text-sm font-medium">{user.fullName}</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Quick info */}
          <motion.div
            initial={{ opacity: 0, x: 14 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="glass rounded-2xl p-4 space-y-3"
          >
            <h3 className="text-navy font-bold text-sm">Détails</h3>
            <div className="text-sm space-y-2 text-navy/60">
              <div className="flex justify-between">
                <span>Statut</span>
                <StatusBadge status={task.status} />
              </div>
              <div className="flex justify-between">
                <span>Priorité</span>
                <PriorityBadge priority={task.priority} />
              </div>
              <div className="flex justify-between">
                <span>Échéance</span>
                <span className={`text-right text-xs font-semibold ${isLate ? 'text-red-500' : 'text-navy/70'}`}>
                  {format(deadline, 'dd/MM/yyyy', { locale: fr })}
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Delete confirm */}
      <AnimatePresence>
        {showDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowDelete(false)} className="absolute inset-0 bg-navy/20 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass rounded-2xl p-6 max-w-sm w-full relative z-10"
            >
              <h3 className="text-navy font-bold text-lg mb-2">Supprimer la tâche ?</h3>
              <p className="text-navy/60 text-sm mb-5">Cette action est irréversible.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowDelete(false)} className="flex-1 border border-silver text-navy/50 hover:text-navy rounded-xl py-2.5 text-sm font-semibold transition-all">Annuler</button>
                <button onClick={deleteTask} className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors">Supprimer</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <TaskModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSave={updateTask}
        initialData={task}
        users={users}
        isAdmin={isAdmin}
      />
    </div>
  )
}
