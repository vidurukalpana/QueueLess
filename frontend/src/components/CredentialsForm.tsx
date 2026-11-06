import { useState, type FormEvent, type ReactNode } from 'react'
import type { Credentials } from '../api/types'
import { AuthLayout } from './AuthLayout'

interface CredentialsFormProps {
  title: string
  subtitle: string
  submitLabel: string
  isPending: boolean
  minPasswordLength?: number
  notice?: string
  error?: string
  footer: ReactNode
  passwordHelp?: ReactNode
  onSubmit: (credentials: Credentials) => void
}

export function CredentialsForm({
  title,
  subtitle,
  submitLabel,
  isPending,
  minPasswordLength,
  notice,
  error,
  footer,
  passwordHelp,
  onSubmit,
}: CredentialsFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit({ email, password })
  }

  return (
    <AuthLayout>
      <form onSubmit={handleSubmit} className="card p-6 sm:p-8">
        <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
        <p className="mt-1 mb-6 text-sm text-stone-600">{subtitle}</p>

        {notice && (
          <p role="status" className="notice-success mb-4">
            {notice}
          </p>
        )}
        {error && (
          <p role="alert" className="notice-error mb-4">
            {error}
          </p>
        )}

        <label htmlFor="email" className="field-label">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="field mb-4"
        />

        <label htmlFor="password" className="field-label">
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={minPasswordLength}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="field mb-5"
        />
        {passwordHelp}

        <button
          type="submit"
          disabled={isPending}
          className="btn-primary w-full"
        >
          {submitLabel}
        </button>

        <p className="mt-4 text-center text-sm text-stone-600">{footer}</p>
      </form>
    </AuthLayout>
  )
}
