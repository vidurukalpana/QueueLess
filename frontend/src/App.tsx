import { Navigate, Route, Routes } from 'react-router'
import { ApiStatus } from './components/ApiStatus'
import { OwnerLayout } from './components/OwnerLayout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { PlaceholderPage } from './pages/PlaceholderPage'
import { QueuePage } from './pages/QueuePage'
import { RegisterPage } from './pages/RegisterPage'

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<OwnerLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/dashboard/queues/:id" element={<QueuePage />} />
          </Route>
        </Route>
        <Route
          path="/q/:queueId"
          element={<PlaceholderPage title="Join queue" />}
        />
        <Route
          path="/ticket/:ticketId"
          element={<PlaceholderPage title="Ticket" />}
        />
      </Routes>
      <ApiStatus />
    </>
  )
}
