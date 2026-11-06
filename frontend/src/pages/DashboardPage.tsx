import { useQuery } from '@tanstack/react-query'
import { ListPlus } from 'lucide-react'
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
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-extrabold tracking-tight">Your queues</h1>
      <p className="mt-1 mb-6 text-stone-600">
        Create a queue, then share its QR code with customers.
      </p>
      <CreateQueueForm />
      {queues.isPending && <p className="text-stone-600">Loading queues…</p>}
      {queues.isError && (
        <p role="alert" className="notice-error">
          {getErrorMessage(queues.error)}
        </p>
      )}
      {queues.data?.length === 0 && (
        <div className="card flex flex-col items-center gap-3 px-5 py-12 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-orange-100 text-brand">
            <ListPlus className="size-6" />
          </span>
          <p className="font-medium text-stone-600">No queues yet.</p>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {queues.data?.map((queue) => (
          <QueueCard key={queue.id} queue={queue} />
        ))}
      </div>
    </main>
  )
}
