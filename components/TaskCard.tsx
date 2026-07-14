'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useSession } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Clock, MessageSquare, CheckSquare, AlertCircle, RefreshCw, Check, Play } from 'lucide-react'
import { formatDistanceToNow, isPast, isWithinInterval, addHours } from 'date-fns'
import { fr } from 'date-fns/locale'
import StatusBadge from './StatusBadge'
import PriorityBadge from './PriorityBadge'
import { DEPARTMENTS } from '@/lib/types'

interface TaskCardProps {
  task: {
    id: string
    title: string
    deadline: string
    status: string
    priority: string
    departmentTags: string
    recurrence: string
    assignees: { user: { id: string; fullName: string } }[]
    subtasks: { isCompleted: boolean }[]
    _count: { comments: number }
    blockingOn?: { blockingTask: { status: string } }[]
  }
  compact?: boolean
}

export default function TaskCard({ task: initialTask, compact }: TaskCardProps) {
  const { data: session } = useSession()
  const [status, setStatus] = useState(initialTask.status)
  const router = useRouter()

  const deadline = new Date(initialTask.deadline)
  const isOverdue = isPast(deadline) && status !== 'DONE'
  const isDueSoon = !isOverdue && isWithinInterval(deadline, { start: new Date(), end: addHours(new Date(), 48) })
  const tags = JSON.parse(initialTask.departmentTags || '[]') as string[]
  const doneSubtasks = initialTask.subtasks.filter(s => s.isCompleted).length
  const totalSubtasks = initialTask.subtasks.length
  const isBlocked = initialTask.blockingOn?.some(d => d.blockingTask.status !== 'DONE')

  const [showDoneConfirm, setShowDoneConfirm] = useState(false)

  const isAdmin = session?.user.role === 'ADMIN'
  const isAssignee = initialTask.assignees.some(a => a.user.id === session?.user.id)
  const canAct = isAssignee || isAdmin
  const canStart = canAct && status === 'TODO'
  const canComplete = canAct && status === 'IN_PROGRESS'

  async function markInProgress(e: React.MouseEvent) {
    e.stopPropagation()
    const res = await fetch(`/api/tasks/${initialTask.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'IN_PROGRESS' }),
    })
    if (res.ok) setStatus('IN_PROGRESS')
  }

  function requestDone(e: React.MouseEvent) {
    e.stopPropagation()
    setShowDoneConfirm(true)
  }

  async function confirmMarkDone() {
    const res = await fetch(`/api/tasks/${initialTask.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'DONE' }),
    })
    if (res.ok) { setStatus('DONE'); setShowDoneConfirm(false) }
  }

  return (
    <>
    <motion.div
      whileHover={{ y: -4, scale: 1.015 }}
      transition={{ type: 'spring' as const, stiffness: 500, damping: 28 }}
      onClick={() => router.push(`/tasks/${initialTask.id}`)}
      className="glass-sm rounded-2xl p-4 cursor-pointer group"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <h3 className="text-navy font-semibold text-sm leading-snug line-clamp-2 flex-1">{initialTask.title}</h3>
        <StatusBadge status={status} />
      </div>

      {!compact && (
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <PriorityBadge priority={initialTask.priority} />
          {tags.slice(0, 2).map(tag => {
            const dept = DEPARTMENTS.find(d => d.value === tag)
            return dept ? (
              <span key={tag} className="text-[10px] font-medium bg-brand/10 text-brand rounded-full px-2 py-0.5">
                {dept.label}
              </span>
            ) : null
          })}
          {initialTask.recurrence !== 'NONE' && (
            <RefreshCw size={12} className="text-navy/40" />
          )}
          {isBlocked && (
            <span className="text-[10px] font-semibold text-orange-500 bg-orange-50 rounded-full px-2 py-0.5 flex items-center gap-1">
              <AlertCircle size={10} /> Bloquée
            </span>
          )}
        </div>
      )}

      {totalSubtasks > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs text-navy/45 mb-1">
            <span className="flex items-center gap-1"><CheckSquare size={11} /> Sous-tâches</span>
            <span>{doneSubtasks}/{totalSubtasks}</span>
          </div>
          <div className="h-1 bg-silver rounded-full overflow-hidden">
            <div
              className="h-full bg-brand rounded-full transition-all"
              style={{ width: `${totalSubtasks ? (doneSubtasks / totalSubtasks) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mt-auto pt-1">
        <div className={`flex items-center gap-1 text-xs font-medium ${isOverdue ? 'text-red-500' : isDueSoon ? 'text-amber-500' : 'text-navy/45'}`}>
          <Clock size={12} />
          {formatDistanceToNow(deadline, { addSuffix: true, locale: fr })}
        </div>
        <div className="flex items-center gap-2">
          {initialTask._count.comments > 0 && (
            <span className="flex items-center gap-0.5 text-xs text-navy/40">
              <MessageSquare size={11} />
              {initialTask._count.comments}
            </span>
          )}
          <div className="flex -space-x-1.5">
            {initialTask.assignees.slice(0, 3).map(({ user }) => (
              <div key={user.id} className="w-6 h-6 rounded-full bg-brand/20 border border-white flex items-center justify-center text-[10px] font-bold text-brand">
                {user.fullName[0]}
              </div>
            ))}
            {initialTask.assignees.length > 3 && (
              <div className="w-6 h-6 rounded-full bg-silver border border-white flex items-center justify-center text-[10px] font-bold text-navy/40">
                +{initialTask.assignees.length - 3}
              </div>
            )}
          </div>
          {/* Quick action icon buttons — always visible */}
          {canStart && (
            <button
              onClick={markInProgress}
              title="Démarrer"
              className="w-6 h-6 rounded-full bg-brand/10 text-brand flex items-center justify-center hover:bg-brand hover:text-white transition-colors shrink-0"
            >
              <Play size={10} />
            </button>
          )}
          {canComplete && (
            <button
              onClick={requestDone}
              title="Marquer terminée"
              className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center hover:bg-green-500 hover:text-white transition-colors shrink-0"
            >
              <Check size={10} />
            </button>
          )}
        </div>
      </div>

      {/* Mobile: full-width "Terminée" button for IN_PROGRESS tasks */}
      {canComplete && (
        <div className="mt-2 pt-2 border-t border-white/40 lg:hidden">
          <button
            onClick={requestDone}
            className="w-full flex items-center justify-center gap-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-semibold rounded-xl py-1.5 transition-colors"
          >
            <Check size={12} />
            Marquer comme terminée
          </button>
        </div>
      )}

      {/* Desktop: full-width button on hover */}
      {canComplete && (
        <div className="max-h-0 group-hover:max-h-12 overflow-hidden transition-all duration-200 hidden lg:block">
          <div className="pt-2 mt-2 border-t border-white/40">
            <button
              onClick={requestDone}
              className="w-full flex items-center justify-center gap-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-semibold rounded-xl py-1.5 transition-colors"
            >
              <Check size={12} />
              Marquer comme terminée
            </button>
          </div>
        </div>
      )}

    </motion.div>

    {/* Portal: renders at document.body to escape card's transform stacking context */}
    {typeof document !== 'undefined' && createPortal(
      <AnimatePresence>
        {showDoneConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDoneConfirm(false)}
              className="absolute inset-0 bg-navy/20 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.88, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.88, y: 24 }}
              transition={{ type: 'spring' as const, stiffness: 360, damping: 26 }}
              className="glass rounded-2xl p-6 max-w-sm w-full relative z-10 text-center"
              onClick={e => e.stopPropagation()}
            >
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring' as const, stiffness: 400, damping: 14, delay: 0.08 }}
                className="text-5xl mb-3 select-none"
              >
                🎉
              </motion.div>
              <h3 className="text-navy font-bold text-lg mb-1">Félicitations !</h3>
              <p className="text-navy/50 text-sm mb-3">Cette tâche est-elle vraiment terminée ?</p>
              <p className="text-navy text-sm font-semibold line-clamp-2 bg-white/30 rounded-xl px-3 py-2 mb-5">
                &ldquo;{initialTask.title}&rdquo;
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDoneConfirm(false)}
                  className="flex-1 border border-silver text-navy/50 hover:text-navy hover:bg-white/50 rounded-xl py-2.5 text-sm font-semibold transition-all"
                >
                  Non, continuer
                </button>
                <button
                  onClick={confirmMarkDone}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl py-2.5 text-sm transition-colors flex items-center justify-center gap-1.5"
                >
                  <Check size={15} />
                  Oui, terminée !
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>,
      document.body
    )}
    </>
  )
}
