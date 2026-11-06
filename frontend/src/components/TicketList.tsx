import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Megaphone, SkipForward, Users } from 'lucide-react'
import { apiGet, apiPost, getErrorMessage } from '../api/client'
import type { CallNextResponse, OwnerTicket } from '../api/types'
import { useAuth } from '../hooks/useAuth'
import { useQueueSocket } from '../hooks/useQueueSocket'
import { ArrivalBadge } from './ArrivalBadge'
import { ReconnectingBanner } from './ReconnectingBanner'

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
    <section className="flex min-w-0 flex-col gap-4">
      {isReconnecting && <ReconnectingBanner />}

      <div className="hero rounded-2xl p-6 shadow-lg shadow-orange-900/15">
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold">Now serving</p>
            <p className="text-3xl font-extrabold tracking-tight break-words">
              {nowServing
                ? `#${nowServing.number} ${nowServing.customerName}`
                : 'Nobody'}
            </p>
          </div>
          <button
            type="button"
            disabled={isBusy || !tickets.data?.length}
            onClick={() => callNext.mutate()}
            className="btn min-h-12 bg-white px-6 text-base text-brand-dark shadow-lg hover:bg-orange-50"
          >
            <Megaphone className="size-5" />
            Call next
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        {actionError && (
          <p role="alert" className="notice-error m-4">
            {getErrorMessage(actionError)}
          </p>
        )}
        {tickets.isPending && (
          <p className="p-5 text-stone-600">Loading tickets…</p>
        )}
        {tickets.isError && (
          <p role="alert" className="notice-error m-4">
            {getErrorMessage(tickets.error)}
          </p>
        )}
        {tickets.data?.length === 0 && (
          <div className="flex flex-col items-center gap-3 px-5 py-12 text-center">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-orange-100 text-brand">
              <Users className="size-6" />
            </span>
            <p className="font-medium text-stone-600">
              No customers in the queue.
            </p>
          </div>
        )}

        {!!tickets.data?.length && (
          <div>
            <table className="w-full text-left text-sm max-sm:block">
              <thead className="max-sm:hidden">
                <tr className="border-b border-stone-200 bg-stone-50 text-xs font-bold tracking-wide text-stone-500">
                  <th className="px-3 py-3 sm:px-4">TICKET</th>
                  <th className="px-3 py-3 sm:px-4">NAME</th>
                  <th className="hidden px-4 py-3 sm:table-cell">STATUS</th>
                  <th className="px-3 py-3 sm:px-4">ARRIVAL</th>
                  <th className="px-3 py-3 sm:px-4">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 max-sm:block">
                {tickets.data.map((ticket) => (
                  <tr
                    key={ticket.id}
                    className={`max-sm:grid max-sm:grid-cols-[auto_1fr_auto] max-sm:items-center ${
                      ticket.status === 'called'
                        ? 'bg-orange-50'
                        : 'transition hover:bg-stone-50'
                    }`}
                  >
                    <td className="px-3 py-3 font-extrabold text-brand-dark sm:px-4">
                      #{ticket.number}
                    </td>
                    <td className="px-3 py-3 font-semibold break-words sm:px-4">
                      {ticket.customerName}
                    </td>
                    <td className="hidden px-4 py-3 text-stone-600 capitalize sm:table-cell">
                      {ticket.status}
                    </td>
                    <td className="px-3 py-3 sm:px-4">
                      <ArrivalBadge checkedIn={ticket.checkedIn} />
                    </td>
                    <td className="flex gap-2 px-3 py-3 max-sm:col-span-3 max-sm:pt-0 sm:px-4 max-sm:[&>button]:flex-1">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() =>
                          changeTicket.mutate({ id: ticket.id, action: 'skip' })
                        }
                        className="btn-secondary btn-small"
                      >
                        <SkipForward className="size-3.5" />
                        Skip
                      </button>
                      {ticket.status === 'called' && (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() =>
                            changeTicket.mutate({
                              id: ticket.id,
                              action: 'done',
                            })
                          }
                          className="btn-primary btn-small"
                        >
                          <Check className="size-3.5" strokeWidth={3} />
                          Done
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}
