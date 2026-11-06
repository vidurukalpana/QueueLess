import { BarChart3, SlidersHorizontal } from 'lucide-react'
import { Link } from 'react-router'
import type { Queue } from '../api/types'
import { QueueStatusBadge } from './QueueStatusBadge'

interface QueueCardProps {
  queue: Queue
}

export function QueueCard({ queue }: QueueCardProps) {
  return (
    <article className="card flex flex-col gap-3 p-5 transition duration-150 hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-lg hover:shadow-orange-900/5">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-lg leading-snug font-bold break-words">
          {queue.name}
        </h2>
        <QueueStatusBadge status={queue.status} />
      </div>
      <p className="text-sm text-stone-600">
        {queue.status === 'open'
          ? 'Accepting customers'
          : 'Not accepting new customers'}
      </p>
      <p className="mt-auto flex gap-2 pt-1">
        <Link
          to={`/dashboard/queues/${queue.id}`}
          className="btn-primary btn-small flex-1"
        >
          <SlidersHorizontal className="size-3.5" />
          Manage
        </Link>
        <Link
          to={`/dashboard/queues/${queue.id}/stats`}
          className="btn-secondary btn-small flex-1"
        >
          <BarChart3 className="size-3.5" />
          Stats
        </Link>
      </p>
    </article>
  )
}
