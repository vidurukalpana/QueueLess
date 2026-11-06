import type { QueueStatus } from '../api/types'

const statusLabels: Record<QueueStatus, string> = {
  open: 'Open',
  paused: 'Paused',
  closed: 'Closed',
}

const statusClasses: Record<QueueStatus, string> = {
  open: 'bg-emerald-100 text-emerald-800',
  paused: 'bg-amber-100 text-amber-900',
  closed: 'bg-stone-200 text-stone-700',
}

const dotClasses: Record<QueueStatus, string> = {
  open: 'bg-emerald-500',
  paused: 'bg-amber-500',
  closed: 'bg-stone-500',
}

interface QueueStatusBadgeProps {
  status: QueueStatus
}

export function QueueStatusBadge({ status }: QueueStatusBadgeProps) {
  return (
    <span className={`pill ${statusClasses[status]}`}>
      <span className={`size-1.5 rounded-full ${dotClasses[status]}`} />
      {statusLabels[status]}
    </span>
  )
}
