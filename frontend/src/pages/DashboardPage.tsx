import { useQuery } from '@tanstack/react-query'
import { apiGet, getErrorMessage } from '../api/client'
import type { Queue } from '../api/types'
import { CreateQueueForm } from '../components/CreateQueueForm'
import { QueueCard } from '../components/QueueCard'
import { useAuth } from '../hooks/useAuth'

export function DashboardPage() {
  const { token } = useAuth()
  const queues = useQuery({
    queryKey: ['queues'],
    queryFn: () => apiGet<Queue[]>('/api/queues', token ?? undefined),
  })

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold">Your queues</h1>
      <p className="mb-5 text-gray-600">
        Create a queue, then share its QR code with customers.
      </p>
      <CreateQueueForm />
      {queues.isPending && <p className="text-gray-600">Loading queues…</p>}
      {queues.isError && <p role="alert">{getErrorMessage(queues.error)}</p>}
      {queues.data?.length === 0 && (
        <p className="text-gray-600">No queues yet.</p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {queues.data?.map((queue) => (
          <QueueCard key={queue.id} queue={queue} />
        ))}
      </div>
    </main>
  )
}
