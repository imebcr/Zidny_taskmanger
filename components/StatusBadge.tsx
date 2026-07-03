import { STATUS_LABELS } from '@/lib/types'
import type { TaskStatus } from '@/lib/types'

const classMap: Record<TaskStatus, string> = {
  TODO: 'status-todo',
  IN_PROGRESS: 'status-in-progress',
  OVERDUE: 'status-overdue',
  DONE: 'status-done',
}

export default function StatusBadge({ status }: { status: string }) {
  const s = status as TaskStatus
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${classMap[s] || 'status-todo'}`}>
      {STATUS_LABELS[s] || status}
    </span>
  )
}
