import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { Link, Outlet } from 'react-router'
import { ApiError, apiGet } from '../api/client'
import type { Owner } from '../api/types'
import { useAuth } from '../hooks/useAuth'

export function OwnerLayout() {
  const { token, logout } = useAuth()
  const { data: owner, error } = useQuery({
    queryKey: ['me', token],
    queryFn: () => apiGet<Owner>('/api/auth/me', token ?? undefined),
    retry: false,
  })

  useEffect(() => {
    if (error instanceof ApiError && error.status === 401) {
      logout()
    }
  }, [error, logout])

  return (
    <>
      <header className="flex items-center justify-between border-b-2 border-gray-900 px-6 py-3">
        <Link to="/dashboard" className="text-lg font-bold">
          QueueLess
        </Link>
        <span className="flex items-center gap-3">
          <span className="text-gray-600">{owner?.email}</span>
          <button
            type="button"
            onClick={logout}
            className="rounded-md border-2 border-gray-900 px-3 py-1 text-sm font-bold"
          >
            Log out
          </button>
        </span>
      </header>
      <Outlet />
    </>
  )
}
