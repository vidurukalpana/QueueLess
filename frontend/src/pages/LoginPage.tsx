import { useMutation } from '@tanstack/react-query'
import { Link, Navigate, useLocation } from 'react-router'
import { apiPost, getErrorMessage } from '../api/client'
import type { Credentials, LoginResponse } from '../api/types'
import { CredentialsForm } from '../components/CredentialsForm'
import { useAuth } from '../hooks/useAuth'

interface LoginLocationState {
  registered?: boolean
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
      notice={state?.registered ? 'Account created. Please log in.' : undefined}
      error={mutation.isError ? getErrorMessage(mutation.error) : undefined}
      onSubmit={mutation.mutate}
      footer={
        <>
          New here?{' '}
          <Link to="/register" className="underline">
            Register
          </Link>
        </>
      }
    />
  )
}
