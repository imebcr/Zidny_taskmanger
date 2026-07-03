'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, ChevronDown } from 'lucide-react'
import * as Popover from '@radix-ui/react-popover'

export interface SelectOption {
  value: string
  label: string
}

interface GlassSelectProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  className?: string
}

const TRIGGER: React.CSSProperties = {
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
  ...TRIGGER,
  background: 'rgba(255,255,255,0.8)',
  borderColor: '#2AA4E7',
  boxShadow: '0 0 0 3px rgba(42,164,231,0.18)',
}

export function GlassSelect({
  value,
  onChange,
  options,
  placeholder = 'Choisir…',
  className = '',
}: GlassSelectProps) {
  const [open, setOpen] = useState(false)
  const selected = options.find(o => o.value === value)

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          style={open ? TRIGGER_OPEN : TRIGGER}
          className={className}
          onFocus={e => {
            Object.assign(e.currentTarget.style, TRIGGER_OPEN)
          }}
          onBlur={e => {
            if (!open) Object.assign(e.currentTarget.style, TRIGGER)
          }}
        >
          <span style={{ color: selected ? '#0C224B' : 'rgba(12,34,75,0.4)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {selected ? selected.label : placeholder}
          </span>
          <ChevronDown
            size={15}
            style={{
              color: 'rgba(12,34,75,0.4)',
              flexShrink: 0,
              transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s',
            }}
          />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          forceMount
          sideOffset={4}
          align="start"
          style={{
            width: 'var(--radix-popover-trigger-width)',
            zIndex: 9999,
            pointerEvents: open ? 'auto' : 'none',
          }}
          onOpenAutoFocus={e => e.preventDefault()}
        >
          <AnimatePresence>
            {open && (
              <motion.div
                key="select-dropdown"
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                transition={{ type: 'spring', stiffness: 340, damping: 28 }}
                style={{
                  background: 'rgba(255,255,255,0.6)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255,255,255,0.65)',
                  borderRadius: '0.625rem',
                  boxShadow: '0 4px 24px rgba(10,96,173,0.08)',
                  overflow: 'hidden',
                  maxHeight: '220px',
                  overflowY: 'auto',
                }}
              >
                {options.map(opt => {
                  const isSel = opt.value === value
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => { onChange(opt.value); setOpen(false) }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        padding: '0.5rem 0.75rem',
                        fontSize: '0.875rem',
                        color: isSel ? '#2AA4E7' : '#0C224B',
                        fontWeight: isSel ? 600 : 400,
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(42,164,231,0.12)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                    >
                      <span>{opt.label}</span>
                      {isSel && <Check size={13} style={{ color: '#2AA4E7', flexShrink: 0 }} />}
                    </button>
                  )
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
