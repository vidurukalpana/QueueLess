import { useMutation, useQuery } from '@tanstack/react-query'
import { ArrowRight } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router'
import {
  ApiError,
  apiGet,
  apiPost,
  getErrorMessage,
  getTicket,
} from '../api/client'
import { getSavedTicket, saveTicket } from '../api/ticketStorage'
import type {
  JoinQueueRequest,
  JoinQueueResponse,
  PublicQueue,
} from '../api/types'
import { CustomerShell } from '../components/CustomerShell'
import { QueueStatusBadge } from '../components/QueueStatusBadge'

const MAX_NAME_LENGTH = 40
const FORBIDDEN = 403
const CONFLICT = 409

function getJoinErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === FORBIDDEN) {
    return 'Please scan the QR code at the shop'
  }
  if (error instanceof ApiError && error.status === CONFLICT) {
    return error.message === 'queue is full'
      ? 'This queue is full. Please try again soon.'
      : 'This queue is not open right now. Please try again soon.'
  }
  return getErrorMessage(error)
}

export function JoinPage() {
  const { queueId } = useParams()
  const [searchParams] = useSearchParams()
  const code = searchParams.get('code') ?? undefined
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const queue = useQuery({
    queryKey: ['public-queue', queueId],
    queryFn: () => apiGet<PublicQueue>(`/api/queues/${queueId}`),
    retry: false,
  })
  const join = useMutation({
    mutationFn: (input: JoinQueueRequest) =>
      apiPost<JoinQueueResponse>(`/api/queues/${queueId}/tickets`, input),
    onSuccess: ({ ticketId, token }) => {
      saveTicket(queueId ?? '', { ticketId, token })
      navigate(`/ticket/${ticketId}`)
    },
  })
  const saved = getSavedTicket(queueId ?? '')
  const savedTicket = useQuery({
    queryKey: ['ticket', saved?.ticketId],
    queryFn: () => getTicket(saved?.ticketId ?? '', saved?.token ?? ''),
    enabled: Boolean(saved),
    retry: false,
  })

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    join.mutate({ name, code })
  }

  const status = savedTicket.data?.status
  if (saved && (status === 'waiting' || status === 'called')) {
    return <Navigate to={`/ticket/${saved.ticketId}`} replace />
  }

  const isMissing =
    queue.error instanceof ApiError &&
    (queue.error.status === 400 || queue.error.status === 404)
  const isCheckingTicket = saved && savedTicket.isPending

  return (
    <CustomerShell>
      {(queue.isPending || isCheckingTicket) && (
        <p className="text-center text-stone-600">Loading queue…</p>
      )}
      {isMissing && (
        <p className="card p-6 text-center font-medium text-stone-600">
          Queue not found.
        </p>
      )}
      {queue.isError && !isMissing && (
        <p role="alert" className="notice-error">
          {getErrorMessage(queue.error)}
        </p>
      )}

      {queue.data && !isCheckingTicket && (
        <div className="card overflow-hidden">
          <div className="hero px-6 py-8 text-center">
            <div className="relative">
              <h1 className="mb-3 text-2xl font-extrabold tracking-tight break-words">
                {queue.data.name}
              </h1>
              <QueueStatusBadge status={queue.data.status} />
            </div>
          </div>

          <div className="flex flex-col gap-4 p-6">
            {join.isError && (
              <p
                role="alert"
                className="notice-error justify-center text-center"
              >
                {getJoinErrorMessage(join.error)}
              </p>
            )}

            {queue.data.status === 'open' ? (
              <form onSubmit={handleSubmit}>
                <label htmlFor="name" className="field-label">
                  Your name
                </label>
                <input
                  id="name"
                  required
                  maxLength={MAX_NAME_LENGTH}
                  placeholder="1–40 characters"
                  autoComplete="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="field mb-4"
                />
                <button
                  type="submit"
                  disabled={join.isPending}
                  className="btn-primary w-full"
                >
                  Join queue
                  <ArrowRight className="size-4" />
                </button>
              </form>
            ) : (
              <p className="notice-warning justify-center text-center">
                This queue is {queue.data.status}. Please try again soon.
              </p>
            )}
          </div>
        </div>
      )}
    </CustomerShell>
  )
}
