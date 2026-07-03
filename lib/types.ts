export type Role = 'MEMBER' | 'ADMIN'
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'OVERDUE' | 'DONE'
export type Priority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
export type Recurrence = 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY'
export type Department = 'COMMERCIAL' | 'MARKETING' | 'RND' | 'MOBILE' | 'WEB' | 'DESIGN' | 'FILMMAKING' | 'RH' | 'FINANCE' | 'CEO' | 'COO'
export type NotificationType = 'ASSIGNED' | 'DEADLINE_48H' | 'DEADLINE_24H' | 'OVERDUE' | 'MENTION' | 'WEEKLY_REMINDER'
export type NotificationChannel = 'EMAIL' | 'PUSH'

export const DEPARTMENTS: { value: Department; label: string }[] = [
  { value: 'COMMERCIAL', label: 'Commercial' },
  { value: 'MARKETING', label: 'Marketing' },
  { value: 'RND', label: 'R&D' },
  { value: 'MOBILE', label: 'Mobile' },
  { value: 'WEB', label: 'Web' },
  { value: 'DESIGN', label: 'Design' },
  { value: 'FILMMAKING', label: 'Filmmaking' },
  { value: 'RH', label: 'RH' },
  { value: 'FINANCE', label: 'Finance' },
  { value: 'CEO', label: 'CEO' },
  { value: 'COO', label: 'COO' },
]

export const STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: 'À faire',
  IN_PROGRESS: 'En cours',
  OVERDUE: 'En retard',
  DONE: 'Terminé',
}

export const PRIORITY_LABELS: Record<Priority, string> = {
  LOW: 'Faible',
  NORMAL: 'Normal',
  HIGH: 'Élevé',
  URGENT: 'Urgent',
}

export const RECURRENCE_LABELS: Record<Recurrence, string> = {
  NONE: 'Aucune',
  DAILY: 'Quotidienne',
  WEEKLY: 'Hebdomadaire',
  MONTHLY: 'Mensuelle',
}
