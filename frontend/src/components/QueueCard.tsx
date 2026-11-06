import type { Queue, QueueStatus } from '../api/types'

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

interface QueueCardProps {
  queue: Queue
}

export function QueueCard({ queue }: QueueCardProps) {
  return (
    <article className="rounded-md border-2 border-gray-900 p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-bold">{queue.name}</h2>
        <span
          className={`rounded-full border-2 px-3 text-xs font-bold ${statusClasses[queue.status]}`}
        >
          {statusLabels[queue.status]}
        </span>
      </div>
      <p className="mt-2 text-sm text-gray-600">
        {queue.status === 'open'
          ? 'Accepting customers'
          : 'Not accepting new customers'}
      </p>
    </article>
  )
}
