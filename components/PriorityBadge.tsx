import { PRIORITY_LABELS } from '@/lib/types'
import type { Priority } from '@/lib/types'
import { AlertTriangle, ChevronDown, Minus, ChevronsUp } from 'lucide-react'

const iconMap: Record<Priority, React.ReactNode> = {
  LOW: <ChevronDown size={12} />,
  NORMAL: <Minus size={12} />,
  HIGH: <AlertTriangle size={12} />,
  URGENT: <ChevronsUp size={12} />,
}

const classMap: Record<Priority, string> = {
  LOW: 'priority-low',
  NORMAL: 'priority-normal',
  HIGH: 'priority-high',
  URGENT: 'priority-urgent',
}

export default function PriorityBadge({ priority }: { priority: string }) {
  const p = priority as Priority
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${classMap[p] || ''}`}>
      {iconMap[p]}
      {PRIORITY_LABELS[p] || priority}
    </span>
  )
}
