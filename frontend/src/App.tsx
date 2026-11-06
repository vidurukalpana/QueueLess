import { Navigate, Route, Routes } from 'react-router'
import { ApiStatus } from './components/ApiStatus'
import { OwnerLayout } from './components/OwnerLayout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { DashboardPage } from './pages/DashboardPage'
import { JoinPage } from './pages/JoinPage'
import { LoginPage } from './pages/LoginPage'
import { QueuePage } from './pages/QueuePage'
import { RegisterPage } from './pages/RegisterPage'
import { StatsPage } from './pages/StatsPage'
import { TicketPage } from './pages/TicketPage'

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
            <Route path="/dashboard/queues/:id/stats" element={<StatsPage />} />
          </Route>
        </Route>
        <Route path="/q/:queueId" element={<JoinPage />} />
        <Route path="/ticket/:ticketId" element={<TicketPage />} />
      </Routes>
      <ApiStatus />
    </>
  )
}
