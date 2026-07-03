'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, CalendarDays, ExternalLink, Download } from 'lucide-react'
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, isSameMonth, isSameDay, isToday, addMonths, subMonths
} from 'date-fns'
import { fr } from 'date-fns/locale'
import StatusBadge from '@/components/StatusBadge'

type Task = { id: string; title: string; description?: string | null; deadline: string; status: string; priority: string; departmentTags: string; recurrence: string; assignees: { user: { id: string; fullName: string } }[]; subtasks: { isCompleted: boolean }[]; _count: { comments: number } }

const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'bg-gray-100 text-gray-500',
  NORMAL: 'bg-brand/10 text-brand',
  HIGH: 'bg-amber-50 text-amber-600',
  URGENT: 'bg-red-50 text-red-600',
}

function toGCalDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
}

function gcalUrl(task: Task): string {
  const start = new Date(task.deadline)
  const end = new Date(start.getTime() + 60 * 60 * 1000)
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: task.title,
    dates: `${toGCalDate(start)}/${toGCalDate(end)}`,
    ...(task.description ? { details: task.description } : {}),
  })
  return `https://calendar.google.com/calendar/render?${params}`
}

function generateICS(tasks: Task[]): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Zidny//Task Manager//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ]
  for (const t of tasks) {
    if (t.status === 'DONE') continue
    const start = new Date(t.deadline)
    const end = new Date(start.getTime() + 60 * 60 * 1000)
    lines.push(
      'BEGIN:VEVENT',
      `UID:${t.id}@zidny.ma`,
      `DTSTAMP:${toGCalDate(new Date())}`,
      `DTSTART:${toGCalDate(start)}`,
      `DTEND:${toGCalDate(end)}`,
      `SUMMARY:${t.title.replace(/[,;\\]/g, c => '\\' + c)}`,
      ...(t.description ? [`DESCRIPTION:${t.description.replace(/\n/g, '\\n').replace(/[,;\\]/g, c => '\\' + c)}`] : []),
      'END:VEVENT',
    )
  }
  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}

function downloadICS(tasks: Task[]) {
  const content = generateICS(tasks)
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'zidny-taches.ics'
  a.click()
  URL.revokeObjectURL(url)
}

export default function CalendarPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [tasks, setTasks] = useState<Task[]>([])
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [view, setView] = useState<'month' | 'week'>('month')

  useEffect(() => {
    const url = session?.user.role === 'ADMIN' ? '/api/tasks' : '/api/tasks?mine=true'
    fetch(url).then(r => r.json()).then(setTasks)
  }, [session?.user.role])

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: calStart, end: calEnd })

  const weekStart = startOfWeek(currentMonth, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(currentMonth, { weekStartsOn: 1 })
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })

  function tasksForDay(day: Date) {
    return tasks.filter(t => isSameDay(new Date(t.deadline), day))
  }

  const viewDays = view === 'week' ? weekDays : days
  const DAY_NAMES = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
  const selectedTasks = selectedDay ? tasksForDay(selectedDay) : []

  return (
    <div>
      <div className="px-4 py-3 border-b border-white/50 bg-white/20 backdrop-blur-sm">
        {/* Row 1: title + export */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <CalendarDays className="text-brand" size={20} />
            <h1 className="text-navy font-bold text-lg">Calendrier</h1>
          </div>
          <button
            onClick={() => downloadICS(tasks)}
            title="Exporter vers Google Agenda (.ics)"
            className="flex items-center gap-1.5 px-3 py-1.5 glass-sm rounded-xl text-sm font-semibold text-navy/60 hover:text-brand transition-colors border border-silver hover:border-brand/30"
          >
            <Download size={15} />
            <span className="hidden sm:inline ml-0.5">Google Agenda</span>
          </button>
        </div>
        {/* Row 2: view toggle + month navigation */}
        <div className="flex items-center gap-2">
          <div className="glass-sm rounded-xl overflow-hidden flex shrink-0">
            {(['month', 'week'] as const).map(v => (
              <button
                key={v}
                onClick={() => { setView(v); setCurrentMonth(new Date()) }}
                className={`px-3 py-1.5 text-sm font-semibold transition-all ${view === v ? 'bg-brand text-white' : 'text-navy/60 hover:text-navy'}`}
              >
                {v === 'month' ? 'Mois' : 'Sem.'}
              </button>
            ))}
          </div>
          <button onClick={() => setCurrentMonth(v => subMonths(v, 1))} className="p-1.5 glass-sm rounded-xl text-navy/40 hover:text-navy transition-colors shrink-0">
            <ChevronLeft size={18} />
          </button>
          <span className="text-navy font-semibold text-sm flex-1 text-center truncate">
            {view === 'month'
              ? format(currentMonth, 'MMMM yyyy', { locale: fr })
              : `Sem. ${format(weekStart, 'dd MMM', { locale: fr })}`}
          </span>
          <button onClick={() => setCurrentMonth(v => addMonths(v, 1))} className="p-1.5 glass-sm rounded-xl text-navy/40 hover:text-navy transition-colors shrink-0">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="p-6 grid lg:grid-cols-4 gap-6">
        {/* Calendar grid */}
        <div className="lg:col-span-3">
          <div className="glass rounded-2xl p-4">
            {/* Day headers */}
            <div className="grid grid-cols-7 mb-2">
              {DAY_NAMES.map(d => (
                <div key={d} className="text-center text-xs font-semibold text-navy/40 py-2">{d}</div>
              ))}
            </div>

            {/* Days */}
            <div className="grid grid-cols-7 gap-1">
              {viewDays.map(day => {
                const dayTasks = tasksForDay(day)
                const inMonth = isSameMonth(day, currentMonth)
                const isSelected = selectedDay && isSameDay(day, selectedDay)
                const today = isToday(day)

                return (
                  <motion.div
                    key={day.toISOString()}
                    whileHover={{ scale: 1.02 }}
                    onClick={() => setSelectedDay(isSameDay(day, selectedDay!) ? null : day)}
                    className={`min-h-20 rounded-xl p-1.5 cursor-pointer transition-all border ${
                      isSelected ? 'bg-brand/10 border-brand/30' :
                      today ? 'bg-ocean/5 border-ocean/20' :
                      inMonth ? 'border-transparent hover:bg-white/40' : 'border-transparent opacity-40'
                    }`}
                  >
                    <div className={`text-xs font-bold mb-1 w-6 h-6 flex items-center justify-center rounded-full ${
                      today ? 'bg-brand text-white' : 'text-navy/60'
                    }`}>
                      {format(day, 'd')}
                    </div>
                    <div className="space-y-0.5">
                      {dayTasks.slice(0, 3).map(task => (
                        <div
                          key={task.id}
                          onClick={e => { e.stopPropagation(); router.push(`/tasks/${task.id}`) }}
                          className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-md truncate cursor-pointer ${PRIORITY_COLORS[task.priority]}`}
                        >
                          {task.title}
                        </div>
                      ))}
                      {dayTasks.length > 3 && (
                        <div className="text-[9px] text-navy/40 px-1.5">+{dayTasks.length - 3}</div>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Day detail panel */}
        <div className="space-y-4">
          {selectedDay ? (
            <motion.div
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass rounded-2xl p-4"
            >
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-navy font-bold">{format(selectedDay, 'EEEE dd MMMM', { locale: fr })}</h3>
              </div>
              <p className="text-navy/40 text-xs mb-4">{selectedTasks.length} tâche{selectedTasks.length !== 1 ? 's' : ''}</p>
              {selectedTasks.length === 0 ? (
                <p className="text-navy/35 text-sm text-center py-4">Aucune tâche ce jour</p>
              ) : (
                <div className="space-y-2">
                  {selectedTasks.map(task => (
                    <div key={task.id} className="glass-sm rounded-xl p-3">
                      <div
                        onClick={() => router.push(`/tasks/${task.id}`)}
                        className="cursor-pointer hover:opacity-80 transition-opacity"
                      >
                        <p className="text-navy font-semibold text-sm line-clamp-2 mb-1">{task.title}</p>
                        <StatusBadge status={task.status} />
                      </div>
                      <a
                        href={gcalUrl(task)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-brand hover:text-ocean transition-colors"
                      >
                        <ExternalLink size={11} />
                        Ajouter à Google Agenda
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <div className="glass rounded-2xl p-4 text-center text-navy/35 text-sm">
              Sélectionnez un jour pour voir les tâches
            </div>
          )}

          {/* Upcoming */}
          <div className="glass rounded-2xl p-4">
            <h3 className="text-navy font-bold text-sm mb-3">À venir (7j)</h3>
            {tasks
              .filter(t => {
                const d = new Date(t.deadline)
                const now = new Date()
                const in7 = new Date(); in7.setDate(in7.getDate() + 7)
                return d >= now && d <= in7 && t.status !== 'DONE'
              })
              .slice(0, 5)
              .map(task => (
                <div
                  key={task.id}
                  className="flex items-center gap-2 py-1.5 rounded-lg px-1 group"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-brand shrink-0" />
                  <span
                    onClick={() => router.push(`/tasks/${task.id}`)}
                    className="text-navy/70 text-xs font-medium truncate flex-1 cursor-pointer hover:text-navy transition-colors"
                  >
                    {task.title}
                  </span>
                  <span className="text-navy/35 text-[10px] shrink-0">
                    {format(new Date(task.deadline), 'dd/MM')}
                  </span>
                  <a
                    href={gcalUrl(task)}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Ajouter à Google Agenda"
                    className="opacity-0 group-hover:opacity-100 text-brand transition-opacity shrink-0"
                  >
                    <ExternalLink size={11} />
                  </a>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  )
}
