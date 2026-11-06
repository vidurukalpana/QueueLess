import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, getErrorMessage } from '../api/client'
import type { CallNextResponse, OwnerTicket } from '../api/types'
import { ArrivalBadge } from './ArrivalBadge'
import { ReconnectingBanner } from './ReconnectingBanner'
import { useAuth } from '../hooks/useAuth'
import { useQueueSocket } from '../hooks/useQueueSocket'

const smallButton =
  'rounded-md border-2 border-gray-900 px-3 py-0.5 text-sm font-bold disabled:opacity-60'

interface TicketListProps {
  queueId: string
}

export function TicketList({ queueId }: TicketListProps) {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  const queryKey = ['tickets', queueId]
  const { isReconnecting } = useQueueSocket(queueId)
  const tickets = useQuery({
    queryKey,
    queryFn: () =>
      apiGet<OwnerTicket[]>(
        `/api/queues/${queueId}/tickets`,
        token ?? undefined,
      ),
  })
  const refresh = () => queryClient.invalidateQueries({ queryKey })
  const callNext = useMutation({
    mutationFn: () =>
      apiPost<CallNextResponse>(
        `/api/queues/${queueId}/next`,
        undefined,
        token ?? undefined,
      ),
    onSuccess: refresh,
  })
  const changeTicket = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'skip' | 'done' }) =>
      apiPost<OwnerTicket>(
        `/api/tickets/${id}/${action}`,
        undefined,
        token ?? undefined,
      ),
    onSuccess: refresh,
  })

  const nowServing = tickets.data?.find((ticket) => ticket.status === 'called')
  const isBusy = callNext.isPending || changeTicket.isPending
  const actionError = callNext.error ?? changeTicket.error

  return (
    <section className="rounded-md border-2 border-gray-900 p-4">
      {isReconnecting && <ReconnectingBanner />}
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-gray-600">Now serving</p>
          <p className="text-2xl font-bold">
            {nowServing
              ? `#${nowServing.number} ${nowServing.customerName}`
              : 'Nobody'}
          </p>
        </div>
        <button
          type="button"
          disabled={isBusy || !tickets.data?.length}
          onClick={() => callNext.mutate()}
          className="rounded-md bg-gray-900 px-6 py-3 text-lg font-bold text-white disabled:opacity-60"
        >
          Call next
        </button>
      </div>

      {actionError && (
        <p
          role="alert"
          className="mb-3 rounded-md border-2 border-dashed border-gray-500 bg-gray-100 px-3 py-2"
        >
          {getErrorMessage(actionError)}
        </p>
      )}
      {tickets.isPending && <p className="text-gray-600">Loading tickets…</p>}
      {tickets.isError && <p role="alert">{getErrorMessage(tickets.error)}</p>}
      {tickets.data?.length === 0 && (
        <p className="text-gray-600">No customers in the queue.</p>
      )}

      {!!tickets.data?.length && (
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-400 text-xs text-gray-600">
              <th className="p-2">TICKET</th>
              <th className="p-2">NAME</th>
              <th className="p-2">STATUS</th>
              <th className="p-2">ARRIVAL</th>
              <th className="p-2">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {tickets.data.map((ticket) => (
              <tr
                key={ticket.id}
                className={`border-b border-gray-300 ${ticket.status === 'called' ? 'bg-gray-100' : ''}`}
              >
                <td className="p-2 font-bold">#{ticket.number}</td>
                <td className="p-2">{ticket.customerName}</td>
                <td className="p-2 capitalize">{ticket.status}</td>
                <td className="p-2">
                  <ArrivalBadge checkedIn={ticket.checkedIn} />
                </td>
                <td className="flex gap-2 p-2">
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() =>
                      changeTicket.mutate({ id: ticket.id, action: 'skip' })
                    }
                    className={smallButton}
                  >
                    Skip
                  </button>
                  {ticket.status === 'called' && (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() =>
                        changeTicket.mutate({ id: ticket.id, action: 'done' })
                      }
                      className={smallButton}
                    >
                      Done
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
