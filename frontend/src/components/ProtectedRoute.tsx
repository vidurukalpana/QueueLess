import { Navigate, Outlet } from 'react-router'
import { useAuth } from '../hooks/useAuth'

export function ProtectedRoute() {
  const { token } = useAuth()

  if (!token) {
    return <Navigate to="/login" replace />
  }
  return <Outlet />
}
