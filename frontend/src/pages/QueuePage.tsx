import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router'
import { apiGet, apiPatch, getErrorMessage } from '../api/client'
import type { Queue, QueueStatus } from '../api/types'
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
    <main className="p-6">
      <Link to="/dashboard" className="text-sm underline">
        ← Back to queues
      </Link>

      {queues.isPending && <p className="mt-3 text-gray-600">Loading queue…</p>}
      {queues.isError && (
        <p role="alert" className="mt-3">
          {getErrorMessage(queues.error)}
        </p>
      )}
      {queues.isSuccess && !queue && (
        <p className="mt-3 text-gray-600">Queue not found.</p>
      )}

      {queue && (
        <>
          <div className="mt-1 mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{queue.name}</h1>
              <QueueStatusBadge status={queue.status} />
            </div>
            <div className="flex gap-3">
              {statusActions.map(({ status, label }) => (
                <button
                  key={status}
                  type="button"
                  disabled={queue.status === status || updateStatus.isPending}
                  onClick={() => updateStatus.mutate(status)}
                  className="rounded-md border-2 border-gray-900 px-4 py-2 font-bold disabled:bg-gray-200"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {updateStatus.isError && (
            <p
              role="alert"
              className="mb-4 rounded-md border-2 border-dashed border-gray-500 bg-gray-100 px-3 py-2"
            >
              {getErrorMessage(updateStatus.error)}
            </p>
          )}
          <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
            <TicketList queueId={queue.id} />
            <ShareQueue queueId={queue.id} />
          </div>
        </>
      )}
    </main>
  )
}
