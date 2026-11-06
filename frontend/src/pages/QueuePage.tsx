import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, BarChart3 } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { apiGet, apiPatch, getErrorMessage } from '../api/client'
import type { Queue, QueueStatus } from '../api/types'
import { QueueSettings } from '../components/QueueSettings'
import { QueueStatusBadge } from '../components/QueueStatusBadge'
import { ShareQueue } from '../components/ShareQueue'
import { TicketList } from '../components/TicketList'
import { useAuth } from '../hooks/useAuth'

const statusActions: { status: QueueStatus; label: string }[] = [
  { status: 'open', label: 'Open' },
  { status: 'paused', label: 'Pause' },
  { status: 'closed', label: 'Close' },
]

export function QueuePage() {
  const { id } = useParams()
  const { token } = useAuth()
  const queryClient = useQueryClient()
  const queues = useQuery({
    queryKey: ['queues'],
    queryFn: () => apiGet<Queue[]>('/api/queues', token ?? undefined),
  })
  const updateStatus = useMutation({
    mutationFn: (status: QueueStatus) =>
      apiPatch<Queue>(`/api/queues/${id}`, { status }, token ?? undefined),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['queues'] }),
  })
  const queue = queues.data?.find((item) => item.id === id)

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <Link to="/dashboard" className="back-link">
        <ArrowLeft className="size-4" />
        Back to queues
      </Link>

      {queues.isPending && (
        <p className="mt-4 text-stone-600">Loading queue…</p>
      )}
      {queues.isError && (
        <p role="alert" className="notice-error mt-4">
          {getErrorMessage(queues.error)}
        </p>
      )}
      {queues.isSuccess && !queue && (
        <p className="card mt-4 p-6 font-medium text-stone-600">
          Queue not found.
        </p>
      )}

      {queue && (
        <>
          <div className="mt-3 mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 flex-wrap items-center gap-3">
              <h1 className="text-3xl font-extrabold tracking-tight break-words">
                {queue.name}
              </h1>
              <QueueStatusBadge status={queue.status} />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex rounded-xl bg-stone-200/70 p-1">
                {statusActions.map(({ status, label }) => (
                  <button
                    key={status}
                    type="button"
                    disabled={queue.status === status || updateStatus.isPending}
                    onClick={() => updateStatus.mutate(status)}
                    className={`min-h-9 cursor-pointer rounded-lg px-4 text-sm font-bold transition disabled:cursor-not-allowed ${
                      queue.status === status
                        ? 'bg-white text-brand-dark shadow-sm'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <Link
                to={`/dashboard/queues/${queue.id}/stats`}
                className="btn-secondary"
              >
                <BarChart3 className="size-4" />
                View stats
              </Link>
            </div>
          </div>
          {updateStatus.isError && (
            <p role="alert" className="notice-error mb-4">
              {getErrorMessage(updateStatus.error)}
            </p>
          )}
          <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
            <TicketList queueId={queue.id} />
            <div className="flex flex-col gap-5">
              <ShareQueue queueId={queue.id} joinCode={queue.joinCode} />
              <QueueSettings queue={queue} />
            </div>
          </div>
        </>
      )}
    </main>
  )
}
