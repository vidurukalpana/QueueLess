import { useMutation } from '@tanstack/react-query'
import { ArrowLeft, MailCheck } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { apiPost, getErrorMessage } from '../api/client'
import type { MessageResponse } from '../api/types'
import { AuthLayout } from '../components/AuthLayout'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const mutation = useMutation({
    mutationFn: () =>
      apiPost<MessageResponse>('/api/auth/forgot-password', { email }),
  })

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    mutation.mutate()
  }

  return (
    <AuthLayout>
      <form onSubmit={handleSubmit} className="card p-6 sm:p-8">
        <h1 className="text-2xl font-extrabold tracking-tight">
          Forgot password
        </h1>
        <p className="mt-1 mb-6 text-sm text-stone-600">
          Enter your email to get a reset link.
        </p>

        {mutation.isError && (
          <p role="alert" className="notice-error mb-4">
            {getErrorMessage(mutation.error)}
          </p>
        )}

        {mutation.isSuccess ? (
          <p role="status" className="notice-success">
            <MailCheck className="mt-0.5 size-4 shrink-0" />
            {mutation.data.message}
          </p>
        ) : (
          <>
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
              className="field mb-5"
            />
            <button
              type="submit"
              disabled={mutation.isPending}
              className="btn-primary w-full"
            >
              Send reset link
            </button>
          </>
        )}

        <p className="mt-4 text-center text-sm">
          <Link to="/login" className="back-link">
            <ArrowLeft className="size-4" />
            Back to log in
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}
