'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Loader2 } from 'lucide-react'
import { PRIORITY_LABELS, RECURRENCE_LABELS, STATUS_LABELS } from '@/lib/types'
import { GlassSelect } from '@/components/ui/GlassSelect'
import { DatePicker } from '@/components/ui/DatePicker'

interface User { id: string; fullName: string; username: string }
interface TaskModalProps {
  open: boolean
  onClose: () => void
  onSave: (data: Record<string, unknown>) => Promise<void>
  initialData?: Record<string, unknown>
  isAdmin?: boolean
  users?: User[]
}

export default function TaskModal({ open, onClose, onSave, initialData, isAdmin, users = [] }: TaskModalProps) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    deadline: '',
    status: 'TODO',
    priority: 'NORMAL',
    assigneeIds: [] as string[],
    recurrence: 'NONE',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (initialData) {
      setForm({
        title: (initialData.title as string) || '',
        description: (initialData.description as string) || '',
        deadline: initialData.deadline
          ? new Date(initialData.deadline as string).toISOString().slice(0, 16)
          : '',
        status: (initialData.status as string) || 'TODO',
        priority: (initialData.priority as string) || 'NORMAL',
        assigneeIds: ((initialData.assignees as { user: { id: string } }[]) || []).map(a => a.user.id),
        recurrence: (initialData.recurrence as string) || 'NONE',
      })
    } else {
      setForm({ title: '', description: '', deadline: '', status: 'TODO', priority: 'NORMAL', assigneeIds: [], recurrence: 'NONE' })
    }
    setError('')
  }, [initialData, open])

  function toggleAssignee(id: string) {
    setForm(f => ({
      ...f,
      assigneeIds: f.assigneeIds.includes(id)
        ? f.assigneeIds.filter(a => a !== id)
        : [...f.assigneeIds, id],
    }))
  }

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    setError('')
    if (!form.title.trim()) { setError('Le titre est requis'); return }
    if (!form.deadline) { setError('L\'échéance est requise'); return }
    setLoading(true)
    try {
      await onSave(form)
      onClose()
    } catch {
      setError('Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-navy/20 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring' as const, stiffness: 340, damping: 28 }}
            className="glass rounded-2xl p-6 w-full max-w-xl relative z-10 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-navy font-bold text-lg">
                {initialData ? 'Modifier la tâche' : 'Nouvelle tâche'}
              </h2>
              <button onClick={onClose} className="text-navy/40 hover:text-navy transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-navy/50 mb-1.5">Titre *</label>
                <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Titre de la tâche" />
              </div>

              <div>
                <label className="block text-xs font-medium text-navy/50 mb-1.5">Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description optionnelle…" rows={3} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-navy/50 mb-1.5">Échéance *</label>
                  <DatePicker
                    value={form.deadline}
                    onChange={v => setForm(f => ({ ...f, deadline: v }))}
                    placeholder="Choisir une date…"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-navy/50 mb-1.5">Priorité</label>
                  <GlassSelect
                    value={form.priority}
                    onChange={v => setForm(f => ({ ...f, priority: v }))}
                    options={Object.entries(PRIORITY_LABELS).map(([v, l]) => ({ value: v, label: l }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {isAdmin && (
                  <div>
                    <label className="block text-xs font-medium text-navy/50 mb-1.5">Statut</label>
                    <GlassSelect
                      value={form.status}
                      onChange={v => setForm(f => ({ ...f, status: v }))}
                      options={Object.entries(STATUS_LABELS).map(([v, l]) => ({ value: v, label: l }))}
                    />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-navy/50 mb-1.5">Récurrence</label>
                  <GlassSelect
                    value={form.recurrence}
                    onChange={v => setForm(f => ({ ...f, recurrence: v }))}
                    options={Object.entries(RECURRENCE_LABELS).map(([v, l]) => ({ value: v, label: l }))}
                  />
                </div>
              </div>

              {users.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-navy/50 mb-2">Assigné(s) à</label>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                    {users.map(user => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => toggleAssignee(user.id)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                          form.assigneeIds.includes(user.id)
                            ? 'bg-brand text-white'
                            : 'bg-white/50 text-navy/60 border border-silver hover:border-brand/40'
                        }`}
                      >
                        {user.fullName}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {error && (
                <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 border border-silver text-navy/50 hover:text-navy hover:bg-white/50 rounded-xl py-2.5 text-sm font-semibold transition-all"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-brand hover:bg-ocean text-white font-semibold rounded-xl py-2.5 shadow-sm shadow-brand/25 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                  {loading ? 'Enregistrement…' : initialData ? 'Mettre à jour' : 'Créer la tâche'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
