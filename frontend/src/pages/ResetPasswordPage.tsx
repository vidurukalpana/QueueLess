import { useMutation } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { apiPost, getErrorMessage } from '../api/client'
import type { MessageResponse } from '../api/types'
import { AuthLayout } from '../components/AuthLayout'

const MIN_PASSWORD_LENGTH = 8

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')
  const [password, setPassword] = useState('')
  const mutation = useMutation({
    mutationFn: () =>
      apiPost<MessageResponse>('/api/auth/reset-password', { token, password }),
    onSuccess: () =>
      navigate('/login', { replace: true, state: { passwordReset: true } }),
  })

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    mutation.mutate()
  }

  return (
    <AuthLayout>
      <form onSubmit={handleSubmit} className="card p-6 sm:p-8">
        <h1 className="text-2xl font-extrabold tracking-tight">
          Set a new password
        </h1>
        <p className="mt-1 mb-6 text-sm text-stone-600">
          Choose a password of at least 8 characters.
        </p>

        {mutation.isError && (
          <p role="alert" className="notice-error mb-4">
            {getErrorMessage(mutation.error)}
          </p>
        )}

        {token ? (
          <>
            <label htmlFor="password" className="field-label">
              New password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={MIN_PASSWORD_LENGTH}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="field mb-5"
            />
            <button
              type="submit"
              disabled={mutation.isPending}
              className="btn-primary w-full"
            >
              Change password
            </button>
          </>
        ) : (
          <p role="alert" className="notice-error">
            This reset link is invalid or has expired.
          </p>
        )}

        <p className="mt-4 text-center text-sm text-stone-600">
          <Link to="/forgot-password" className="underline">
            Request a new link
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}
