'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import * as Popover from '@radix-ui/react-popover'
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, isToday,
  addMonths, subMonths,
} from 'date-fns'
import { fr } from 'date-fns/locale'

interface DatePickerProps {
  value: string        // datetime-local format: "YYYY-MM-DDTHH:mm" or ''
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

const DAY_NAMES = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di']

function toLocalIso(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const TRIGGER_BASE: React.CSSProperties = {
  padding: '0.5rem 0.75rem',
  background: 'rgba(255,255,255,0.55)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  border: '1px solid rgba(42,164,231,0.25)',
  borderRadius: '0.625rem',
  color: '#0C224B',
  fontSize: '0.875rem',
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '0.375rem',
  cursor: 'pointer',
  textAlign: 'left' as const,
  transition: 'border-color 0.15s, box-shadow 0.15s, background 0.15s',
  outline: 'none',
}

const TRIGGER_OPEN: React.CSSProperties = {
  ...TRIGGER_BASE,
  background: 'rgba(255,255,255,0.8)',
  borderColor: '#2AA4E7',
  boxShadow: '0 0 0 3px rgba(42,164,231,0.18)',
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Choisir une date…',
  className = '',
}: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const selected = value ? new Date(value) : null
  const [viewMonth, setViewMonth] = useState<Date>(selected || new Date())

  const monthStart = startOfMonth(viewMonth)
  const calDays = eachDayOfInterval({
    start: startOfWeek(monthStart, { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(viewMonth), { weekStartsOn: 1 }),
  })

  function pickDay(day: Date) {
    const d = new Date(day)
    if (selected) {
      d.setHours(selected.getHours(), selected.getMinutes(), 0, 0)
    } else {
      d.setHours(12, 0, 0, 0)
    }
    onChange(toLocalIso(d))
    // keep popover open so user can adjust time
  }

  function handleTimeChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!selected) return
    const [h, m] = e.target.value.split(':').map(Number)
    const d = new Date(selected)
    d.setHours(h, m, 0, 0)
    onChange(toLocalIso(d))
  }

  const label = selected
    ? format(selected, "dd MMM yyyy, HH:mm", { locale: fr })
    : ''

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          style={open ? TRIGGER_OPEN : TRIGGER_BASE}
          className={className}
        >
          <span style={{ color: label ? '#0C224B' : 'rgba(12,34,75,0.4)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {label || placeholder}
          </span>
          <CalendarDays size={15} style={{ color: 'rgba(12,34,75,0.4)', flexShrink: 0 }} />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          forceMount
          sideOffset={4}
          align="start"
          style={{ zIndex: 9999, pointerEvents: open ? 'auto' : 'none' }}
          onOpenAutoFocus={e => e.preventDefault()}
        >
          <AnimatePresence>
            {open && (
              <motion.div
                key="datepicker"
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                transition={{ type: 'spring', stiffness: 340, damping: 28 }}
                style={{
                  background: 'rgba(255,255,255,0.4)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255,255,255,0.65)',
                  borderRadius: '1rem',
                  boxShadow: '0 4px 24px rgba(10,96,173,0.08)',
                  padding: '1rem',
                  width: '272px',
                  userSelect: 'none',
                }}
              >
                {/* Month navigation */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.625rem' }}>
                  <button
                    type="button"
                    onClick={() => setViewMonth(v => subMonths(v, 1))}
                    style={{ padding: '0.25rem', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(12,34,75,0.4)', borderRadius: '0.375rem', display: 'flex' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(42,164,231,0.1)'; e.currentTarget.style.color = '#0C224B' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'rgba(12,34,75,0.4)' }}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0C224B', textTransform: 'capitalize' }}>
                    {format(viewMonth, 'MMMM yyyy', { locale: fr })}
                  </span>
                  <button
                    type="button"
                    onClick={() => setViewMonth(v => addMonths(v, 1))}
                    style={{ padding: '0.25rem', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(12,34,75,0.4)', borderRadius: '0.375rem', display: 'flex' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(42,164,231,0.1)'; e.currentTarget.style.color = '#0C224B' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'rgba(12,34,75,0.4)' }}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>

                {/* Day headers */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '0.25rem' }}>
                  {DAY_NAMES.map(d => (
                    <div key={d} style={{ textAlign: 'center', fontSize: '0.6875rem', fontWeight: 600, color: 'rgba(12,34,75,0.4)', paddingBottom: '0.25rem' }}>
                      {d}
                    </div>
                  ))}
                </div>

                {/* Day grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
                  {calDays.map(day => {
                    const inMonth = isSameMonth(day, viewMonth)
                    const isSel = selected && isSameDay(day, selected)
                    const todayDay = isToday(day)
                    return (
                      <button
                        key={day.toISOString()}
                        type="button"
                        onClick={() => pickDay(day)}
                        style={{
                          textAlign: 'center',
                          fontSize: '0.75rem',
                          padding: '0.375rem 0',
                          borderRadius: '0.375rem',
                          border: 'none',
                          cursor: 'pointer',
                          background: isSel ? '#2AA4E7' : todayDay ? 'rgba(42,164,231,0.1)' : 'transparent',
                          color: isSel ? '#fff' : todayDay ? '#2AA4E7' : inMonth ? '#0C224B' : 'rgba(12,34,75,0.25)',
                          fontWeight: isSel || todayDay ? 700 : 400,
                          transition: 'background 0.1s',
                        }}
                        onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = 'rgba(42,164,231,0.15)' }}
                        onMouseLeave={e => {
                          if (!isSel) e.currentTarget.style.background = todayDay ? 'rgba(42,164,231,0.1)' : 'transparent'
                        }}
                      >
                        {format(day, 'd')}
                      </button>
                    )
                  })}
                </div>

                {/* Time row — visible only after day is picked */}
                {selected && (
                  <div style={{ marginTop: '0.75rem', paddingTop: '0.625rem', borderTop: '1px solid rgba(255,255,255,0.55)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'rgba(12,34,75,0.5)', fontWeight: 500, flexShrink: 0 }}>Heure</span>
                    <input
                      type="time"
                      value={value.slice(11, 16)}
                      onChange={handleTimeChange}
                      style={{ flex: 1, fontSize: '0.875rem' }}
                    />
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      style={{
                        padding: '0.25rem 0.625rem',
                        background: '#2AA4E7',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '0.375rem',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                    >
                      OK
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
