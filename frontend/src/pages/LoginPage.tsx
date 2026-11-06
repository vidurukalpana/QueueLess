import { useMutation } from '@tanstack/react-query'
import { Link, Navigate, useLocation } from 'react-router'
import { apiPost, getErrorMessage } from '../api/client'
import type { Credentials, LoginResponse } from '../api/types'
import { CredentialsForm } from '../components/CredentialsForm'
import { useAuth } from '../hooks/useAuth'

interface LoginLocationState {
  registered?: boolean
  passwordReset?: boolean
}

export function LoginPage() {
  const { token, login } = useAuth()
  const location = useLocation()
  const state = location.state as LoginLocationState | null
  const mutation = useMutation({
    mutationFn: (credentials: Credentials) =>
      apiPost<LoginResponse>('/api/auth/login', credentials),
    onSuccess: (response) => login(response.token),
  })

  if (token) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <CredentialsForm
      title="Log in"
      subtitle="Manage your shop's queue"
      submitLabel="Log in"
      isPending={mutation.isPending}
      notice={
        state?.registered
          ? 'Account created. Please log in.'
          : state?.passwordReset
            ? 'Password changed. Please log in.'
            : undefined
      }
      passwordHelp={
        <p className="-mt-3 mb-4 text-sm">
          <Link to="/forgot-password" className="text-brand-dark underline">
            Forgot password?
          </Link>
        </p>
      }
      error={mutation.isError ? getErrorMessage(mutation.error) : undefined}
      onSubmit={mutation.mutate}
      footer={
        <>
          Don't have an account?{' '}
          <Link to="/register" className="underline">
            Create One
          </Link>
        </>
      }
    />
  )
}
