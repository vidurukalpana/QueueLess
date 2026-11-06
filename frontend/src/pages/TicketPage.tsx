import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BellRing, CircleCheck, Clock, MapPin, Users } from 'lucide-react'
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
import { CustomerShell } from '../components/CustomerShell'
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
    <CustomerShell>
      {isMissing && (
        <p className="card p-6 text-center font-medium text-stone-600">
          Ticket not found.
        </p>
      )}
      {ticket.isError && !isMissing && (
        <p role="alert" className="notice-error">
          {getErrorMessage(ticket.error)}
        </p>
      )}

      {ticket.data && (
        <>
          {isReconnecting && <ReconnectingBanner />}
          {isNearTurn(ticket.data) && (
            <p role="status" className="notice-warning justify-center">
              <BellRing className="size-4 shrink-0" />
              Almost your turn! Please head to the shop.
            </p>
          )}

          <div className="card overflow-hidden">
            <div className="hero px-6 py-8 text-center">
              {status === 'called' && (
                <span className="absolute inset-0 bg-white/10 motion-safe:animate-pulse" />
              )}
              <div className="relative">
                <p className="text-sm font-semibold">{ticket.data.queueName}</p>
                {status === 'called' ? (
                  <p className="mt-2 text-4xl font-extrabold tracking-tight">
                    Your turn!
                  </p>
                ) : (
                  <p className="mt-2 text-sm font-semibold">Your ticket</p>
                )}
                <p className="mt-1 text-7xl font-extrabold tracking-tight">
                  #{ticket.data.number}
                </p>
                <p className="mt-3 font-bold">
                  {status === 'called'
                    ? 'Please go to the counter now.'
                    : statusLabels[ticket.data.status]}
                </p>
              </div>
            </div>

            {ticket.data.position !== null &&
              ticket.data.etaMinutes !== null && (
                <div className="grid grid-cols-2 divide-x divide-stone-200 border-t-2 border-dashed border-stone-200">
                  <div className="p-4 text-center">
                    <Users className="mx-auto mb-1 size-5 text-brand" />
                    <p className="text-2xl font-extrabold">
                      {ticket.data.position}
                    </p>
                    <p className="text-sm text-stone-600">people ahead</p>
                  </div>
                  <div className="p-4 text-center">
                    <Clock className="mx-auto mb-1 size-5 text-brand" />
                    <p className="text-2xl font-extrabold">
                      {ticket.data.etaMinutes} min
                    </p>
                    <p className="text-sm text-stone-600">estimated wait</p>
                  </div>
                </div>
              )}
          </div>

          {status === 'waiting' &&
            (ticket.data.checkedIn ? (
              <p className="text-center">
                <span className="pill bg-emerald-100 px-4 py-2 text-sm text-emerald-800">
                  <CircleCheck className="size-4" />
                  Checked in
                </span>
              </p>
            ) : (
              <button
                type="button"
                onClick={() => checkIn.mutate()}
                className="btn-primary w-full"
              >
                <MapPin className="size-4" />
                I'm here
              </button>
            ))}
          {status === 'waiting' && <AlertPermission />}
          {checkIn.isError && (
            <p role="alert" className="notice-error">
              {getErrorMessage(checkIn.error)}
            </p>
          )}

          {cancel.isError && (
            <p role="alert" className="notice-error">
              {getErrorMessage(cancel.error)}
            </p>
          )}
          {isActive && (
            <button
              type="button"
              disabled={cancel.isPending}
              onClick={() => cancel.mutate()}
              className="btn-secondary mt-2 w-full"
            >
              Cancel ticket
            </button>
          )}
        </>
      )}
    </CustomerShell>
  )
}
