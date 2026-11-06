import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  CircleCheck,
  Hourglass,
  SkipForward,
  Timer,
  type LucideIcon,
} from 'lucide-react'
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
  icon: LucideIcon
}

function StatCard({ label, value, icon: Icon }: StatCardProps) {
  return (
    <div className="card p-5">
      <span className="flex size-10 items-center justify-center rounded-xl bg-orange-100 text-brand">
        <Icon className="size-5" />
      </span>
      <p className="mt-4 text-sm font-medium text-stone-600">{label}</p>
      <p className="mt-0.5 text-3xl font-extrabold tracking-tight">{value}</p>
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
    stats.error instanceof ApiError &&
    (stats.error.status === 400 || stats.error.status === 404)

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <Link to={`/dashboard/queues/${id}`} className="back-link">
        <ArrowLeft className="size-4" />
        Back to queue
      </Link>

      {isMissing ? (
        <p className="card mt-4 p-6 font-medium text-stone-600">
          Queue not found.
        </p>
      ) : (
        <>
          <div className="mt-3 mb-6 flex flex-wrap items-end justify-between gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight break-words">
              {queue ? `${queue.name}: stats` : 'Stats'}
            </h1>
            <div>
              <label htmlFor="date" className="field-label">
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
                className="field"
              />
            </div>
          </div>

          {stats.isPending && <p className="text-stone-600">Loading stats…</p>}
          {stats.isError && (
            <p role="alert" className="notice-error">
              {getErrorMessage(stats.error)}
            </p>
          )}
          {stats.data && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Served"
                value={stats.data.served}
                icon={CircleCheck}
              />
              <StatCard
                label="Skipped"
                value={stats.data.skipped}
                icon={SkipForward}
              />
              <StatCard
                label="Average wait"
                value={formatMinutes(stats.data.avgWaitMinutes)}
                icon={Hourglass}
              />
              <StatCard
                label="Average service"
                value={formatMinutes(stats.data.avgServiceMinutes)}
                icon={Timer}
              />
            </div>
          )}
        </>
      )}
    </main>
  )
}
