import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { ApiError, apiGet, getErrorMessage } from '../api/client'
import type { Queue, QueueStats } from '../api/types'
import { useAuth } from '../hooks/useAuth'

const sriLankaDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Colombo',
})

function formatMinutes(minutes: number | null): string {
  return minutes === null ? '–' : `${minutes} min`
}

interface StatCardProps {
  label: string
  value: string | number
}

function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="rounded-md border-2 border-gray-900 p-4 text-center">
      <p className="text-sm text-gray-600">{label}</p>
      <p className="mt-1 text-3xl font-bold">{value}</p>
    </div>
  )
}

export function StatsPage() {
  const { id } = useParams()
  const { token } = useAuth()
  const [today] = useState(() => sriLankaDate.format(new Date()))
  const [date, setDate] = useState(today)
  const queues = useQuery({
    queryKey: ['queues'],
    queryFn: () => apiGet<Queue[]>('/api/queues', token ?? undefined),
  })
  const stats = useQuery({
    queryKey: ['stats', id, date],
    queryFn: () =>
      apiGet<QueueStats>(
        `/api/queues/${id}/stats?date=${date}`,
        token ?? undefined,
      ),
    retry: false,
  })
  const queue = queues.data?.find((item) => item.id === id)
  const isMissing =
    stats.error instanceof ApiError && stats.error.status === 404

  return (
    <main className="p-6">
      <Link to={`/dashboard/queues/${id}`} className="text-sm underline">
        ← Back to queue
      </Link>

      {isMissing ? (
        <p className="mt-3 text-gray-600">Queue not found.</p>
      ) : (
        <>
          <div className="mt-1 mb-5 flex flex-wrap items-end justify-between gap-3">
            <h1 className="text-2xl font-bold">
              {queue ? `${queue.name}: stats` : 'Stats'}
            </h1>
            <div>
              <label htmlFor="date" className="mb-1 block text-sm font-bold">
                Date (Sri Lanka time)
              </label>
              <input
                id="date"
                type="date"
                max={today}
                value={date}
                onChange={(event) => {
                  if (event.target.value) {
                    setDate(event.target.value)
                  }
                }}
                className="rounded-md border-2 border-gray-400 px-3 py-2"
              />
            </div>
          </div>

          {stats.isPending && <p className="text-gray-600">Loading stats…</p>}
          {stats.isError && <p role="alert">{getErrorMessage(stats.error)}</p>}
          {stats.data && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Served" value={stats.data.served} />
              <StatCard label="Skipped" value={stats.data.skipped} />
              <StatCard
                label="Average wait"
                value={formatMinutes(stats.data.avgWaitMinutes)}
              />
              <StatCard
                label="Average service"
                value={formatMinutes(stats.data.avgServiceMinutes)}
              />
            </div>
          )}
        </>
      )}
    </main>
  )
}
