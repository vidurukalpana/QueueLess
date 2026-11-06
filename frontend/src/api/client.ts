import type { ErrorResponse, TicketStatusResponse } from './types'

const baseUrl: string = import.meta.env.VITE_API_URL
const NO_CONTENT = 204

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as ErrorResponse
    return body.error
  } catch {
    return `Request failed with status ${response.status}`
  }
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, init)
  if (!response.ok) {
    throw new ApiError(response.status, await readErrorMessage(response))
  }
  if (response.status === NO_CONTENT) {
    return undefined as T
  }
  return response.json() as Promise<T>
}

function authHeaders(token?: string): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export function apiGet<T>(path: string, token?: string): Promise<T> {
  return request<T>(path, { headers: authHeaders(token) })
}

function sendJson<T>(
  method: string,
  path: string,
  body: unknown,
  token?: string,
): Promise<T> {
  return request<T>(path, {
    method,
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(body),
  })
}

export function apiPost<T>(
  path: string,
  body: unknown,
  token?: string,
): Promise<T> {
  return sendJson<T>('POST', path, body, token)
}

export function apiPatch<T>(
  path: string,
  body: unknown,
  token?: string,
): Promise<T> {
  return sendJson<T>('PATCH', path, body, token)
}

export function getTicket(
  ticketId: string,
  token: string,
): Promise<TicketStatusResponse> {
  return request<TicketStatusResponse>(`/api/tickets/${ticketId}`, {
    headers: { 'X-Ticket-Token': token },
  })
}

export function cancelTicket(ticketId: string, token: string): Promise<void> {
  return request<void>(`/api/tickets/${ticketId}`, {
    method: 'DELETE',
    headers: { 'X-Ticket-Token': token },
  })
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message
  }
  return 'Could not reach the server. Please try again.'
}
