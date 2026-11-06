import { Navigate, Route, Routes } from 'react-router'
import { ApiStatus } from './components/ApiStatus'
import { ProtectedRoute } from './components/ProtectedRoute'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { PlaceholderPage } from './pages/PlaceholderPage'
import { RegisterPage } from './pages/RegisterPage'

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
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
