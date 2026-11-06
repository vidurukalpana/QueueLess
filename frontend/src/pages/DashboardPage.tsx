import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { ApiError, apiGet, getErrorMessage } from '../api/client'
import type { Owner, Queue } from '../api/types'
import { CreateQueueForm } from '../components/CreateQueueForm'
import { QueueCard } from '../components/QueueCard'
import { useAuth } from '../hooks/useAuth'

export function DashboardPage() {
  const { token, logout } = useAuth()
  const { data: owner, error } = useQuery({
    queryKey: ['me', token],
    queryFn: () => apiGet<Owner>('/api/auth/me', token ?? undefined),
    retry: false,
  })
  const queues = useQuery({
    queryKey: ['queues'],
    queryFn: () => apiGet<Queue[]>('/api/queues', token ?? undefined),
  })

  useEffect(() => {
    if (error instanceof ApiError && error.status === 401) {
      logout()
    }
  }, [error, logout])

  return (
    <>
      <header className="flex items-center justify-between border-b-2 border-gray-900 px-6 py-3">
        <span className="text-lg font-bold">QueueLess</span>
        <span className="flex items-center gap-3">
          <span className="text-gray-600">{owner?.email}</span>
          <button
            type="button"
            onClick={logout}
            className="rounded-md border-2 border-gray-900 px-3 py-1 text-sm font-bold"
          >
            Log out
          </button>
        </span>
      </header>
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
    </>
  )
}
