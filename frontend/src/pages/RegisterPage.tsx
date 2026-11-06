import { useMutation } from '@tanstack/react-query'
import { Link, Navigate, useNavigate } from 'react-router'
import { apiPost, getErrorMessage } from '../api/client'
import type { Credentials, Owner } from '../api/types'
import { CredentialsForm } from '../components/CredentialsForm'
import { useAuth } from '../hooks/useAuth'

const MIN_PASSWORD_LENGTH = 8

export function RegisterPage() {
  const { token } = useAuth()
  const navigate = useNavigate()
  const mutation = useMutation({
    mutationFn: (credentials: Credentials) =>
      apiPost<Owner>('/api/auth/register', credentials),
    onSuccess: () => navigate('/login', { state: { registered: true } }),
  })

  if (token) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <CredentialsForm
      title="Register"
      subtitle="Create your owner account"
      submitLabel="Create account"
      isPending={mutation.isPending}
      minPasswordLength={MIN_PASSWORD_LENGTH}
      error={mutation.isError ? getErrorMessage(mutation.error) : undefined}
      onSubmit={mutation.mutate}
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="underline">
            Log in
          </Link>
        </>
      }
    />
  )
}
