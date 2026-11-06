import { Link } from 'react-router'
import type { Queue } from '../api/types'
import { QueueStatusBadge } from './QueueStatusBadge'

interface QueueCardProps {
  queue: Queue
}

export function QueueCard({ queue }: QueueCardProps) {
  return (
    <article className="rounded-md border-2 border-gray-900 p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-bold">{queue.name}</h2>
        <QueueStatusBadge status={queue.status} />
      </div>
      <p className="mt-2 text-sm text-gray-600">
        {queue.status === 'open'
          ? 'Accepting customers'
          : 'Not accepting new customers'}
      </p>
      <Link
        to={`/dashboard/queues/${queue.id}`}
        className="mt-2 inline-block text-sm underline"
      >
        Manage
      </Link>
    </article>
  )
}
