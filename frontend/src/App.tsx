import { Navigate, Route, Routes } from 'react-router'
import { ApiStatus } from './components/ApiStatus'
import { PlaceholderPage } from './pages/PlaceholderPage'

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<PlaceholderPage title="Login" />} />
        <Route
          path="/register"
          element={<PlaceholderPage title="Register" />}
        />
        <Route
          path="/dashboard"
          element={<PlaceholderPage title="Dashboard" />}
        />
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
