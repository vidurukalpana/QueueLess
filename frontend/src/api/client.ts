import type { ErrorResponse } from './types'

const baseUrl: string = import.meta.env.VITE_API_URL

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
  return response.json() as Promise<T>
}

export function apiGet<T>(path: string, token?: string): Promise<T> {
  const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {}
  return request<T>(path, { headers })
}

export function apiPost<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message
  }
  return 'Could not reach the server. Please try again.'
}
