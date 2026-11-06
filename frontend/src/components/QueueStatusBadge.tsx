import type { QueueStatus } from '../api/types'

const statusLabels: Record<QueueStatus, string> = {
  open: 'Open',
  paused: 'Paused',
  closed: 'Closed',
}

const statusClasses: Record<QueueStatus, string> = {
  open: 'border-gray-900 bg-gray-900 text-white',
  paused: 'border-gray-900 text-gray-900',
  closed: 'border-gray-400 text-gray-500',
}

interface QueueStatusBadgeProps {
  status: QueueStatus
}

export function QueueStatusBadge({ status }: QueueStatusBadgeProps) {
  return (
    <span
      className={`rounded-full border-2 px-3 text-xs font-bold ${statusClasses[status]}`}
    >
      {statusLabels[status]}
    </span>
  )
}
