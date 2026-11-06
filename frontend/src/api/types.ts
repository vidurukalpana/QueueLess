export interface ErrorResponse {
  error: string
}

export interface HealthResponse {
  status: string
}

export interface Credentials {
  email: string
  password: string
}

export interface Owner {
  id: string
  email: string
}

export interface LoginResponse {
  token: string
}

export type QueueStatus = 'open' | 'paused' | 'closed'

export interface Queue {
  id: string
  name: string
  status: QueueStatus
  avgServiceMinutes: number
  createdAt: string
}

export interface CreateQueueRequest {
  name: string
}

export type TicketStatus =
  'waiting' | 'called' | 'done' | 'skipped' | 'cancelled'

export interface OwnerTicket {
  id: string
  number: number
  customerName: string
  status: TicketStatus
  createdAt: string
  calledAt: string | null
}

export interface CallNextResponse {
  ticket: OwnerTicket | null
}
