import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router'
import {
  ApiError,
  cancelTicket,
  getErrorMessage,
  getTicket,
} from '../api/client'
import { clearSavedTicket, findTicketToken } from '../api/ticketStorage'
import type { TicketStatus } from '../api/types'
import { ReconnectingBanner } from '../components/ReconnectingBanner'
import { useQueueSocket } from '../hooks/useQueueSocket'

const TURN_VIBRATION_MS = [200, 100, 200]

const statusLabels: Record<TicketStatus, string> = {
  waiting: 'Waiting',
  called: 'Called',
  done: 'Done',
  skipped: 'Skipped',
  cancelled: 'Cancelled',
}

export function TicketPage() {
  const { ticketId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const token = findTicketToken(ticketId ?? '')
  const ticket = useQuery({
    queryKey: ['ticket', ticketId],
    queryFn: () => getTicket(ticketId ?? '', token ?? ''),
    enabled: Boolean(ticketId && token),
    retry: false,
  })

  const status = ticket.data?.status
  const previousStatus = useRef(status)

  const { isReconnecting } = useQueueSocket(ticket.data?.queueId)

  useEffect(() => {
    const wasWaiting = previousStatus.current === 'waiting'
    previousStatus.current = status
    if (wasWaiting && status === 'called' && 'vibrate' in navigator) {
      navigator.vibrate(TURN_VIBRATION_MS)
    }
  }, [status])

  const cancel = useMutation({
    mutationFn: () => cancelTicket(ticketId ?? '', token ?? ''),
    onSuccess: () => {
      const queueId = ticket.data?.queueId ?? ''
      clearSavedTicket(queueId)
      queryClient.removeQueries({ queryKey: ['ticket', ticketId] })
      navigate(`/q/${queueId}`, { replace: true })
    },
  })

  const isActive = status === 'waiting' || status === 'called'
  const isMissing =
    !token || (ticket.error instanceof ApiError && ticket.error.status === 404)

  return (
    <main className="mx-auto flex max-w-sm flex-col gap-4 px-5 pt-8">
      <p className="text-center text-lg font-bold">QueueLess</p>

      {isMissing && (
        <p className="text-center text-gray-600">Ticket not found.</p>
      )}
      {ticket.isError && !isMissing && (
        <p role="alert" className="text-center">
          {getErrorMessage(ticket.error)}
        </p>
      )}

      {ticket.data && (
        <>
          {isReconnecting && <ReconnectingBanner />}
          <p className="text-center text-sm text-gray-600">
            {ticket.data.queueName}
          </p>
          <div className="text-center">
            {status === 'called' ? (
              <p className="text-4xl font-bold">Your turn!</p>
            ) : (
              <p className="text-sm text-gray-600">Your ticket</p>
            )}
            <p className="text-7xl font-bold">#{ticket.data.number}</p>
            <p className="mt-2 font-bold">
              {status === 'called'
                ? 'Please go to the counter now.'
                : statusLabels[ticket.data.status]}
            </p>
          </div>

          {ticket.data.position !== null && ticket.data.etaMinutes !== null && (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md border-2 border-gray-900 p-3 text-center">
                <p className="text-2xl font-bold">{ticket.data.position}</p>
                <p className="text-sm text-gray-600">people ahead</p>
              </div>
              <div className="rounded-md border-2 border-gray-900 p-3 text-center">
                <p className="text-2xl font-bold">
                  {ticket.data.etaMinutes} min
                </p>
                <p className="text-sm text-gray-600">estimated wait</p>
              </div>
            </div>
          )}

          {cancel.isError && (
            <p role="alert" className="text-center">
              {getErrorMessage(cancel.error)}
            </p>
          )}
          {isActive && (
            <button
              type="button"
              disabled={cancel.isPending}
              onClick={() => cancel.mutate()}
              className="mt-4 w-full rounded-md border-2 border-gray-900 px-4 py-2 font-bold disabled:opacity-60"
            >
              Cancel ticket
            </button>
          )}
        </>
      )}
    </main>
  )
}
