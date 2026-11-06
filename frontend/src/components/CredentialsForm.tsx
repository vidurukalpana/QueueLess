import { Check } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import type { Credentials } from '../api/types'
import { Logo } from './Logo'

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

const highlights = [
  'Customers wait anywhere, not in your shop',
  'A QR code ready in seconds',
  'See who has arrived, live',
]

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
    <main className="mx-auto grid min-h-dvh w-full max-w-6xl items-center gap-8 px-4 py-6 lg:grid-cols-2 lg:gap-12">
      <section className="hero hidden rounded-3xl p-10 shadow-xl shadow-orange-900/20 lg:block">
        <div className="relative">
          <Logo light />
          <p className="mt-16 text-4xl leading-tight font-extrabold tracking-tight">
            Skip the line.
            <br />
            Keep your customers.
          </p>
          <ul className="mt-8 space-y-3 font-medium">
            {highlights.map((highlight) => (
              <li key={highlight} className="flex items-center gap-3">
                <span className="flex size-6 items-center justify-center rounded-full bg-white/20">
                  <Check className="size-3.5" strokeWidth={3} />
                </span>
                {highlight}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="mx-auto w-full max-w-md">
        <p className="mb-6 text-center lg:hidden">
          <Logo />
        </p>
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

          <button
            type="submit"
            disabled={isPending}
            className="btn-primary w-full"
          >
            {submitLabel}
          </button>

          <p className="mt-4 text-center text-sm text-stone-600">{footer}</p>
        </form>
      </div>
    </main>
  )
}
