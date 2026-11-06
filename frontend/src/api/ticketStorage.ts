const STORAGE_KEY = 'queueless.tickets'

export interface SavedTicket {
  ticketId: string
  token: string
}

type SavedTickets = Record<string, SavedTicket>

function readAll(): SavedTickets {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? (JSON.parse(stored) as SavedTickets) : {}
  } catch {
    return {}
  }
}

function writeAll(tickets: SavedTickets) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets))
}

export function saveTicket(queueId: string, ticket: SavedTicket) {
  writeAll({ ...readAll(), [queueId]: ticket })
}

export function getSavedTicket(queueId: string): SavedTicket | undefined {
  return readAll()[queueId]
}

export function findTicketToken(ticketId: string): string | undefined {
  return Object.values(readAll()).find((ticket) => ticket.ticketId === ticketId)
    ?.token
}

export function clearSavedTicket(queueId: string) {
  const tickets = readAll()
  delete tickets[queueId]
  writeAll(tickets)
}

const ALERTS_KEY = 'queueless.alerts'

export type TicketAlert = 'near' | 'turn'

function readAlerts(): string[] {
  try {
    const stored = localStorage.getItem(ALERTS_KEY)
    return stored ? (JSON.parse(stored) as string[]) : []
  } catch {
    return []
  }
}

export function hasSentAlert(ticketId: string, alert: TicketAlert): boolean {
  return readAlerts().includes(`${ticketId}:${alert}`)
}

export function markAlertSent(ticketId: string, alert: TicketAlert) {
  const alerts = [...readAlerts(), `${ticketId}:${alert}`]
  localStorage.setItem(ALERTS_KEY, JSON.stringify(alerts))
}
