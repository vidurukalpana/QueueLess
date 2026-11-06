import { useEffect } from 'react'
import { hasSentAlert, markAlertSent } from '../api/ticketStorage'
import type { TicketStatusResponse } from '../api/types'

const NEAR_TURN_POSITION = 2
const VIBRATION_MS = [200, 100, 200]

export function isNearTurn(ticket: TicketStatusResponse | undefined): boolean {
  return (
    ticket?.status === 'waiting' &&
    ticket.position !== null &&
    ticket.position <= NEAR_TURN_POSITION
  )
}

function showNotification(body: string) {
  if (
    !window.isSecureContext ||
    !('Notification' in window) ||
    Notification.permission !== 'granted'
  ) {
    return
  }
  try {
    new Notification('QueueLess', { body })
  } catch {
    // Android Chrome rejects this constructor; the page banner still shows.
  }
}

function sendAlert(body: string) {
  showNotification(body)
  if ('vibrate' in navigator) {
    navigator.vibrate(VIBRATION_MS)
  }
}

export function useTurnAlerts(
  ticketId: string | undefined,
  ticket: TicketStatusResponse | undefined,
) {
  const nearTurn = isNearTurn(ticket)
  const status = ticket?.status
  const queueName = ticket?.queueName

  useEffect(() => {
    if (!ticketId) {
      return
    }
    if (nearTurn && !hasSentAlert(ticketId, 'near')) {
      markAlertSent(ticketId, 'near')
      sendAlert(`Almost your turn at ${queueName}.`)
    }
    if (status === 'called' && !hasSentAlert(ticketId, 'turn')) {
      markAlertSent(ticketId, 'turn')
      sendAlert(`Your turn at ${queueName}. Please go to the counter now.`)
    }
  }, [ticketId, nearTurn, status, queueName])
}
