'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import { addDays, differenceInDays, format, startOfDay, subDays } from 'date-fns'
import { fr } from 'date-fns/locale'

type Task = {
  id: string; title: string; deadline: string; status: string; priority: string
  createdAt: string; departmentTags: string; recurrence: string
  assignees: { user: { id: string; fullName: string } }[]
  subtasks: { isCompleted: boolean }[]
  _count: { comments: number }
}

const STATUS_COLORS: Record<string, string> = {
  TODO: 'bg-navy/30',
  IN_PROGRESS: 'bg-brand',
  OVERDUE: 'bg-red-400',
  DONE: 'bg-green-400',
}

export default function TimelinePage() {
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>([])
  const [viewStart, setViewStart] = useState(() => subDays(new Date(), 3))
  const DAYS_SHOWN = 21
  const DAY_WIDTH = 48

  useEffect(() => { fetch('/api/tasks').then(r => r.json()).then(setTasks) }, [])

  const days = Array.from({ length: DAYS_SHOWN }, (_, i) => addDays(viewStart, i))
  const today = startOfDay(new Date())

  function getBar(task: Task) {
    const start = startOfDay(new Date(task.createdAt))
    const end = startOfDay(new Date(task.deadline))
    const viewEnd = addDays(viewStart, DAYS_SHOWN - 1)

    const barStart = start < viewStart ? viewStart : start
    const barEnd = end > viewEnd ? viewEnd : end

    const left = differenceInDays(barStart, viewStart)
    const width = Math.max(1, differenceInDays(barEnd, barStart) + 1)

    if (barEnd < viewStart || barStart > viewEnd) return null
    return { left, width }
  }

  return (
    <div>
      <div className="px-6 py-5 border-b border-white/50 bg-white/20 backdrop-blur-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Clock className="text-brand" size={22} />
          <h1 className="text-navy font-bold text-xl">Chronologie Gantt</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewStart(d => subDays(d, 7))}
            className="p-1.5 glass-sm rounded-xl text-navy/40 hover:text-navy transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => setViewStart(subDays(new Date(), 3))}
            className="px-3 py-1.5 glass-sm rounded-xl text-sm font-semibold text-navy/60 hover:text-navy transition-colors"
          >
            Aujourd&apos;hui
          </button>
          <button
            onClick={() => setViewStart(d => addDays(d, 7))}
            className="p-1.5 glass-sm rounded-xl text-navy/40 hover:text-navy transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="p-6 overflow-x-auto">
        <div className="glass rounded-2xl p-4" style={{ minWidth: `${280 + DAYS_SHOWN * DAY_WIDTH}px` }}>
          {/* Day header */}
          <div className="flex" style={{ marginLeft: '280px' }}>
            {days.map(day => {
              const isT = format(day, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')
              return (
                <div
                  key={day.toISOString()}
                  style={{ width: `${DAY_WIDTH}px` }}
                  className={`text-center text-xs shrink-0 py-2 ${isT ? 'text-brand font-bold' : 'text-navy/40 font-medium'}`}
                >
                  <div>{format(day, 'EEE', { locale: fr })}</div>
                  <div className={`text-sm font-bold ${isT ? 'bg-brand text-white rounded-full w-6 h-6 flex items-center justify-center mx-auto' : ''}`}>
                    {format(day, 'd')}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Today marker */}
          <div className="relative">
            {(() => {
              const todayOffset = differenceInDays(today, viewStart)
              if (todayOffset >= 0 && todayOffset < DAYS_SHOWN) {
                return (
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-brand/40 z-10 pointer-events-none"
                    style={{ left: `${280 + todayOffset * DAY_WIDTH + DAY_WIDTH / 2}px` }}
                  />
                )
              }
            })()}

            {/* Rows */}
            {tasks.length === 0 && (
              <div className="text-center py-16 text-navy/35">Aucune tâche à afficher</div>
            )}
            {tasks.map((task, i) => {
              const bar = getBar(task)
              return (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center border-b border-white/30 hover:bg-white/20 transition-colors"
                  style={{ minHeight: '48px' }}
                >
                  {/* Task label */}
                  <div
                    className="w-72 shrink-0 px-3 py-2 cursor-pointer"
                    onClick={() => router.push(`/tasks/${task.id}`)}
                  >
                    <p className="text-navy font-semibold text-sm line-clamp-1">{task.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className={`w-2 h-2 rounded-full ${STATUS_COLORS[task.status]}`} />
                      <span className="text-navy/40 text-xs">{format(new Date(task.deadline), 'dd/MM', { locale: fr })}</span>
                    </div>
                  </div>

                  {/* Bar */}
                  <div className="flex-1 relative h-8">
                    {bar && (
                      <motion.div
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ delay: i * 0.03 + 0.1, type: 'spring' as const, stiffness: 300, damping: 28 }}
                        onClick={() => router.push(`/tasks/${task.id}`)}
                        className={`absolute top-1/2 -translate-y-1/2 h-6 rounded-full cursor-pointer opacity-80 hover:opacity-100 transition-opacity flex items-center px-2 ${STATUS_COLORS[task.status]}`}
                        style={{
                          left: `${bar.left * DAY_WIDTH}px`,
                          width: `${bar.width * DAY_WIDTH - 4}px`,
                          transformOrigin: 'left',
                        }}
                        title={task.title}
                      >
                        <span className="text-white text-[10px] font-semibold truncate">{task.title}</span>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex gap-4 mt-4 flex-wrap">
          {Object.entries({ TODO: 'À faire', IN_PROGRESS: 'En cours', OVERDUE: 'En retard', DONE: 'Terminé' }).map(([k, v]) => (
            <div key={k} className="flex items-center gap-1.5">
              <div className={`w-3 h-3 rounded-full ${STATUS_COLORS[k]}`} />
              <span className="text-xs text-navy/50">{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
