import { useQuery } from '@tanstack/react-query'
import { LogOut } from 'lucide-react'
import { useEffect } from 'react'
import { Link, Outlet } from 'react-router'
import { ApiError, apiGet } from '../api/client'
import type { Owner } from '../api/types'
import { useAuth } from '../hooks/useAuth'
import { Logo } from './Logo'

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
      <header className="sticky top-0 z-20 border-b border-stone-200/70 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link to="/dashboard" className="rounded-lg">
            <Logo />
          </Link>
          <span className="flex min-w-0 items-center gap-3">
            <span className="hidden truncate text-sm font-medium text-stone-600 sm:inline">
              {owner?.email}
            </span>
            <button
              type="button"
              onClick={logout}
              className="btn-secondary btn-small"
            >
              <LogOut className="size-3.5" />
              Log out
            </button>
          </span>
        </div>
      </header>
      <Outlet />
    </>
  )
}
