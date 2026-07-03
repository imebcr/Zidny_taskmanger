'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { motion } from 'framer-motion'
import { Plus } from 'lucide-react'
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

function KanbanCard({ task, isDragging }: { task: Task; isDragging?: boolean }) {
  const router = useRouter()
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task.id })
  const deadline = new Date(task.deadline)
  const isLate = isPast(deadline) && task.status !== 'DONE'
  const doneSubtasks = task.subtasks.filter(s => s.isCompleted).length

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
    </div>
  )
}

export default function KanbanPage() {
  const { data: session } = useSession()
  const [tasks, setTasks] = useState<Task[]>([])
  const [users, setUsers] = useState<{ id: string; fullName: string; username: string }[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const fetchTasks = useCallback(async () => {
    const url = session?.user.role === 'ADMIN' ? '/api/tasks' : '/api/tasks?mine=true'
    const res = await fetch(url)
    if (res.ok) setTasks(await res.json())
  }, [session?.user.role])

  useEffect(() => {
    fetchTasks()
    fetch('/api/users').then(r => r.json()).then(setUsers)
  }, [fetchTasks])

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id))
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)
    if (!over || active.id === over.id) return

    const draggedTask = tasks.find(t => t.id === active.id)
    if (!draggedTask) return

    // Check if dropped on a column header
    const targetColumn = COLUMNS.find(c => c.id === over.id)
    if (targetColumn) {
      if (draggedTask.status === targetColumn.id) return
      setTasks(prev => prev.map(t => t.id === active.id ? { ...t, status: targetColumn.id } : t))
      await fetch(`/api/tasks/${active.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetColumn.id }),
      })
    } else {
      // Dropped on another card — find which column the target is in
      const targetTask = tasks.find(t => t.id === over.id)
      if (targetTask && draggedTask.status !== targetTask.status) {
        setTasks(prev => prev.map(t => t.id === active.id ? { ...t, status: targetTask.status } : t))
        await fetch(`/api/tasks/${active.id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: targetTask.status }),
        })
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
                  {/* Column header — also a drop target */}
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

                  {/* Cards */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-3">
                    <SortableContext items={colTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                      {colTasks.map(task => (
                        <motion.div key={task.id} layout>
                          <KanbanCard task={task} isDragging={task.id === activeId} />
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
    </div>
  )
}
