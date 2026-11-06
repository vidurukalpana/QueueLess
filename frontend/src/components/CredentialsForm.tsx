import { useState, type FormEvent, type ReactNode } from 'react'
import type { Credentials } from '../api/types'

interface CredentialsFormProps {
  title: string
  subtitle: string
  submitLabel: string
  isPending: boolean
  minPasswordLength?: number
  notice?: string
  error?: string
  footer: ReactNode
  onSubmit: (credentials: Credentials) => void
}

const inputClass = 'mb-3 w-full rounded-md border-2 border-gray-400 px-3 py-2'

export function CredentialsForm({
  title,
  subtitle,
  submitLabel,
  isPending,
  minPasswordLength,
  notice,
  error,
  footer,
  onSubmit,
}: CredentialsFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit({ email, password })
  }

  return (
    <main className="flex flex-col items-center gap-3 px-4 pt-16">
      <p className="text-2xl font-bold">QueueLess</p>
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-md border-2 border-gray-900 p-4"
      >
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="mb-4 text-sm text-gray-600">{subtitle}</p>

        {notice && (
          <p role="status" className="mb-3 rounded-md bg-gray-100 px-3 py-2">
            {notice}
          </p>
        )}
        {error && (
          <p
            role="alert"
            className="mb-3 rounded-md border-2 border-dashed border-gray-500 bg-gray-100 px-3 py-2"
          >
            {error}
          </p>
        )}

        <label htmlFor="email" className="mb-1 block text-sm font-bold">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={inputClass}
        />

        <label htmlFor="password" className="mb-1 block text-sm font-bold">
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={minPasswordLength}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={inputClass}
        />

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-md bg-gray-900 px-4 py-2 font-bold text-white disabled:opacity-60"
        >
          {submitLabel}
        </button>

        <p className="mt-3 text-center text-sm">{footer}</p>
      </form>
    </main>
  )
}
