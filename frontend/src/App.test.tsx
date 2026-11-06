import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, apiGet, apiPost } from './api/client'
import { renderApp } from './test/renderApp'

vi.mock('./api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./api/client')>()),
  apiGet: vi.fn(),
  apiPost: vi.fn(),
}))

const owner = { id: 'owner-1', email: 'owner@example.com' }

async function submitCredentials(buttonName: string) {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('Email'), owner.email)
  await user.type(screen.getByLabelText('Password'), 'password123')
  await user.click(screen.getByRole('button', { name: buttonName }))
  return user
}

beforeEach(() => {
  vi.mocked(apiGet).mockReset()
  vi.mocked(apiPost).mockReset()
  vi.mocked(apiGet).mockImplementation((path) =>
    Promise.resolve(path === '/health' ? { status: 'ok' } : owner),
  )
})

describe('protected routes', () => {
  it('redirects to login without a token', async () => {
    renderApp('/dashboard')

    expect(
      await screen.findByRole('heading', { name: 'Log in' }),
    ).toBeInTheDocument()
  })

  it('logs out when the server rejects the saved token', async () => {
    localStorage.setItem('queueless.token', 'expired')
    vi.mocked(apiGet).mockImplementation((path) =>
      path === '/health'
        ? Promise.resolve({ status: 'ok' })
        : Promise.reject(new ApiError(401, 'unauthorized')),
    )

    renderApp('/dashboard')

    expect(
      await screen.findByRole('heading', { name: 'Log in' }),
    ).toBeInTheDocument()
    expect(localStorage.getItem('queueless.token')).toBeNull()
  })
})

describe('login', () => {
  it('opens the dashboard, then logs out', async () => {
    vi.mocked(apiPost).mockResolvedValue({ token: 'jwt-token' })
    renderApp('/login')

    const user = await submitCredentials('Log in')

    expect(await screen.findByText(owner.email)).toBeInTheDocument()
    expect(localStorage.getItem('queueless.token')).toBe('jwt-token')

    await user.click(screen.getByRole('button', { name: 'Log out' }))

    expect(
      await screen.findByRole('heading', { name: 'Log in' }),
    ).toBeInTheDocument()
    expect(localStorage.getItem('queueless.token')).toBeNull()
  })

  it('shows the server error', async () => {
    vi.mocked(apiPost).mockRejectedValue(
      new ApiError(401, 'invalid email or password'),
    )
    renderApp('/login')

    await submitCredentials('Log in')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'invalid email or password',
    )
  })
})

describe('register', () => {
  it('goes to login with a confirmation', async () => {
    vi.mocked(apiPost).mockResolvedValue(owner)
    renderApp('/register')

    await submitCredentials('Create account')

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Account created. Please log in.',
    )
  })

  it('shows the server error', async () => {
    vi.mocked(apiPost).mockRejectedValue(
      new ApiError(409, 'email already registered'),
    )
    renderApp('/register')

    await submitCredentials('Create account')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'email already registered',
    )
  })
})
