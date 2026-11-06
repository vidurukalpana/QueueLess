import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router'
import {
  ApiError,
  cancelTicket,
  checkInTicket,
  getErrorMessage,
  getTicket,
} from '../api/client'
import { clearSavedTicket, findTicketToken } from '../api/ticketStorage'
import type { TicketStatus, TicketStatusResponse } from '../api/types'
import { AlertPermission } from '../components/AlertPermission'
import { ReconnectingBanner } from '../components/ReconnectingBanner'
import { useQueueSocket } from '../hooks/useQueueSocket'
import { isNearTurn, useTurnAlerts } from '../hooks/useTurnAlerts'

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

  const { isReconnecting } = useQueueSocket(ticket.data?.queueId)

  useTurnAlerts(ticketId, ticket.data)

  const ticketKey = ['ticket', ticketId]
  const checkIn = useMutation({
    mutationFn: () => checkInTicket(ticketId ?? '', token ?? ''),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ticketKey })
      const previous = queryClient.getQueryData<TicketStatusResponse>(ticketKey)
      if (previous) {
        queryClient.setQueryData(ticketKey, { ...previous, checkedIn: true })
      }
      return { previous }
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(ticketKey, context?.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ticketKey }),
  })

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
          {isNearTurn(ticket.data) && (
            <p
              role="status"
              className="rounded-md border-2 border-dashed border-gray-500 bg-gray-100 px-3 py-2 text-center"
            >
              Almost your turn! Please head to the shop.
            </p>
          )}
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

          {status === 'waiting' &&
            (ticket.data.checkedIn ? (
              <p className="text-center">
                <span className="rounded-full bg-gray-900 px-3 py-1 text-sm font-bold text-white">
                  Checked in
                </span>
              </p>
            ) : (
              <button
                type="button"
                onClick={() => checkIn.mutate()}
                className="w-full rounded-md bg-gray-900 px-4 py-2 font-bold text-white"
              >
                I'm here
              </button>
            ))}
          {status === 'waiting' && <AlertPermission />}
          {checkIn.isError && (
            <p role="alert" className="text-center">
              {getErrorMessage(checkIn.error)}
            </p>
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
