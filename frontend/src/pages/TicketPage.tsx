import { useQuery } from '@tanstack/react-query'
import { useLocation, useParams } from 'react-router'
import { ApiError, getErrorMessage, getTicket } from '../api/client'
import type { TicketStatus } from '../api/types'

const POLL_INTERVAL_MS = 10_000

const statusLabels: Record<TicketStatus, string> = {
  waiting: 'Waiting',
  called: 'Called',
  done: 'Done',
  skipped: 'Skipped',
  cancelled: 'Cancelled',
}

interface TicketLocationState {
  token?: string
}

export function TicketPage() {
  const { ticketId } = useParams()
  const location = useLocation()
  const state = location.state as TicketLocationState | null
  const token = state?.token
  const ticket = useQuery({
    queryKey: ['ticket', ticketId],
    queryFn: () => getTicket(ticketId ?? '', token ?? ''),
    enabled: Boolean(ticketId && token),
    refetchInterval: POLL_INTERVAL_MS,
    retry: false,
  })

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
          <p className="text-center text-sm text-gray-600">
            {ticket.data.queueName}
          </p>
          <div className="text-center">
            <p className="text-sm text-gray-600">Your ticket</p>
            <p className="text-7xl font-bold">#{ticket.data.number}</p>
            <p className="mt-2 font-bold">{statusLabels[ticket.data.status]}</p>
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
        </>
      )}
    </main>
  )
}
