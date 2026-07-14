'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, ChevronLeft, ChevronRight, Check } from 'lucide-react'
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors, closestCenter,
} from '@dnd-kit/core'
import {
  SortableContext, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useRouter } from 'next/navigation'
import { isPast, formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import StatusBadge from '@/components/StatusBadge'
import TaskModal from '@/components/TaskModal'

type Task = {
  id: string; title: string; deadline: string; status: string; priority: string
  departmentTags: string; recurrence: string
  assignees: { user: { id: string; fullName: string } }[]
  subtasks: { isCompleted: boolean }[]
  _count: { comments: number }
  blockingOn?: { blockingTask: { status: string } }[]
}

const COLUMNS: { id: string; label: string; color: string }[] = [
  { id: 'TODO', label: 'À faire', color: 'bg-navy/8 border-navy/15' },
  { id: 'IN_PROGRESS', label: 'En cours', color: 'bg-brand/8 border-brand/20' },
  { id: 'OVERDUE', label: 'En retard', color: 'bg-red-50 border-red-200' },
  { id: 'DONE', label: 'Terminé', color: 'bg-green-50 border-green-200' },
]

// Allowed manual move order (OVERDUE handled separately)
const MOVE_ORDER = ['TODO', 'IN_PROGRESS', 'DONE']

function KanbanCard({
  task,
  isDragging,
  onMove,
  onRequestDone,
}: {
  task: Task
  isDragging?: boolean
  onMove: (taskId: string, newStatus: string) => void
  onRequestDone: (taskId: string) => void
}) {
  const router = useRouter()
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task.id })
  const deadline = new Date(task.deadline)
  const isLate = isPast(deadline) && task.status !== 'DONE'
  const doneSubtasks = task.subtasks.filter(s => s.isCompleted).length

  const currentIdx = task.status === 'OVERDUE' ? 1 : MOVE_ORDER.indexOf(task.status)
  const prevStatus = task.status === 'OVERDUE' ? 'IN_PROGRESS' : (currentIdx > 0 ? MOVE_ORDER[currentIdx - 1] : null)
  const nextStatus = task.status === 'OVERDUE' ? 'DONE' : (currentIdx < MOVE_ORDER.length - 1 ? MOVE_ORDER[currentIdx + 1] : null)

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      className={`glass-sm rounded-xl p-3 cursor-grab active:cursor-grabbing ${isDragging ? 'opacity-50' : ''}`}
      onClick={() => router.push(`/tasks/${task.id}`)}
    >
      <p className="text-navy font-semibold text-sm leading-snug line-clamp-2 mb-2">{task.title}</p>
      <div className={`text-xs font-medium mb-2 ${isLate ? 'text-red-500' : 'text-navy/45'}`}>
        {formatDistanceToNow(deadline, { addSuffix: true, locale: fr })}
      </div>
      {task.subtasks.length > 0 && (
        <div className="h-1 bg-silver rounded-full overflow-hidden mb-2">
          <div className="h-full bg-brand rounded-full" style={{ width: `${(doneSubtasks / task.subtasks.length) * 100}%` }} />
        </div>
      )}
      <div className="flex items-center justify-between">
        <div className="flex -space-x-1.5">
          {task.assignees.slice(0, 3).map(({ user }) => (
            <div key={user.id} className="w-5 h-5 rounded-full bg-brand/20 border border-white flex items-center justify-center text-[9px] font-bold text-brand">
              {user.fullName[0]}
            </div>
          ))}
        </div>
        <span className="text-[10px] text-navy/30">{task._count.comments > 0 && `💬 ${task._count.comments}`}</span>
      </div>

      {/* Arrow buttons to move between states */}
      <div
        className="flex items-center justify-between mt-2 pt-2 border-t border-white/30"
        onClick={e => e.stopPropagation()}
      >
        {prevStatus ? (
          <button
            onClick={e => { e.stopPropagation(); onMove(task.id, prevStatus) }}
            title={`← ${COLUMNS.find(c => c.id === prevStatus)?.label}`}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-navy/40 hover:text-navy hover:bg-white/60 transition-colors text-[10px] font-semibold"
          >
            <ChevronLeft size={13} />
            {COLUMNS.find(c => c.id === prevStatus)?.label}
          </button>
        ) : <div />}
        {nextStatus ? (
          <button
            onClick={e => { e.stopPropagation(); nextStatus === 'DONE' ? onRequestDone(task.id) : onMove(task.id, nextStatus) }}
            title={`${COLUMNS.find(c => c.id === nextStatus)?.label} →`}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-navy/40 hover:text-navy hover:bg-white/60 transition-colors text-[10px] font-semibold"
          >
            {COLUMNS.find(c => c.id === nextStatus)?.label}
            <ChevronRight size={13} />
          </button>
        ) : <div />}
      </div>
    </div>
  )
}

export default function KanbanPage() {
  const { data: session } = useSession()
  const [tasks, setTasks] = useState<Task[]>([])
  const [users, setUsers] = useState<{ id: string; fullName: string; username: string }[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [pendingDoneId, setPendingDoneId] = useState<string | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const fetchTasks = useCallback(async () => {
    const res = await fetch('/api/tasks')
    if (res.ok) setTasks(await res.json())
  }, [])

  useEffect(() => {
    fetchTasks()
    fetch('/api/users').then(r => r.json()).then(setUsers)
  }, [fetchTasks])

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id))
  }

  async function moveTask(taskId: string, newStatus: string) {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t))
    await fetch(`/api/tasks/${taskId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)
    if (!over || active.id === over.id) return

    const draggedTask = tasks.find(t => t.id === active.id)
    if (!draggedTask) return

    const targetColumn = COLUMNS.find(c => c.id === over.id)
    if (targetColumn) {
      if (draggedTask.status === targetColumn.id) return
      await moveTask(String(active.id), targetColumn.id)
    } else {
      const targetTask = tasks.find(t => t.id === over.id)
      if (targetTask && draggedTask.status !== targetTask.status) {
        await moveTask(String(active.id), targetTask.status)
      }
    }
  }

  async function createTask(data: Record<string, unknown>) {
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Erreur')
    fetchTasks()
  }

  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="px-6 py-5 border-b border-white/50 bg-white/20 backdrop-blur-sm flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-navy font-bold text-xl">Kanban</h1>
          <p className="text-navy/45 text-sm mt-0.5">{tasks.length} tâches</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 bg-brand hover:bg-ocean text-white font-semibold rounded-xl px-4 py-2 shadow-sm shadow-brand/25 transition-colors text-sm"
        >
          <Plus size={16} />
          Nouvelle tâche
        </button>
      </div>

      {/* Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 overflow-x-auto p-6">
          <div className="flex gap-4 h-full min-w-max">
            {COLUMNS.map(col => {
              const colTasks = tasks.filter(t => t.status === col.id)
              return (
                <div key={col.id} className={`flex flex-col w-72 rounded-2xl border ${col.color} overflow-hidden`}>
                  <SortableContext items={[col.id]} strategy={verticalListSortingStrategy}>
                    <div className="px-4 py-3 border-b border-inherit">
                      <div className="flex items-center justify-between">
                        <span className="text-navy font-bold text-sm">{col.label}</span>
                        <span className="glass-sm rounded-full px-2 py-0.5 text-xs font-semibold text-navy/50">
                          {colTasks.length}
                        </span>
                      </div>
                    </div>
                  </SortableContext>

                  <div className="flex-1 overflow-y-auto p-3 space-y-3">
                    <SortableContext items={colTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                      {colTasks.map(task => (
                        <motion.div key={task.id} layout>
                          <KanbanCard task={task} isDragging={task.id === activeId} onMove={moveTask} onRequestDone={setPendingDoneId} />
                        </motion.div>
                      ))}
                    </SortableContext>
                    {colTasks.length === 0 && (
                      <div className="text-center py-8 text-navy/25 text-sm">Vide</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <DragOverlay>
          {activeTask && (
            <div className="glass rounded-xl p-3 w-72 shadow-xl opacity-90">
              <p className="text-navy font-semibold text-sm">{activeTask.title}</p>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <TaskModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={createTask}
        users={users}
        isAdmin={session?.user.role === 'ADMIN'}
      />

      {/* Done confirmation modal */}
      <AnimatePresence>
        {pendingDoneId && (() => {
          const task = tasks.find(t => t.id === pendingDoneId)
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setPendingDoneId(null)}
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
                {task && (
                  <p className="text-navy text-sm font-semibold line-clamp-2 bg-white/30 rounded-xl px-3 py-2 mb-5">
                    &ldquo;{task.title}&rdquo;
                  </p>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={() => setPendingDoneId(null)}
                    className="flex-1 border border-silver text-navy/50 hover:text-navy hover:bg-white/50 rounded-xl py-2.5 text-sm font-semibold transition-all"
                  >
                    Non, continuer
                  </button>
                  <button
                    onClick={async () => { await moveTask(pendingDoneId, 'DONE'); setPendingDoneId(null) }}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl py-2.5 text-sm transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Check size={15} />
                    Oui, terminée !
                  </button>
                </div>
              </motion.div>
            </div>
          )
        })()}
      </AnimatePresence>
    </div>
  )
}
