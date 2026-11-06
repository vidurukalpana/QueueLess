import { Bell, BellOff, BellRing } from 'lucide-react'
import { useState } from 'react'

type AlertPermissionState = NotificationPermission | 'unsupported'

function currentPermission(): AlertPermissionState {
  if (!window.isSecureContext || !('Notification' in window)) {
    return 'unsupported'
  }
  return Notification.permission
}

export function AlertPermission() {
  const [permission, setPermission] = useState(currentPermission)

  async function requestPermission() {
    try {
      setPermission(await Notification.requestPermission())
    } catch {
      setPermission('unsupported')
    }
  }

  if (permission === 'default') {
    return (
      <button
        type="button"
        onClick={requestPermission}
        className="btn-secondary w-full"
      >
        <Bell className="size-4" />
        Get an alert near your turn
      </button>
    )
  }

  if (permission === 'granted') {
    return (
      <p className="notice-success justify-center">
        <BellRing className="size-4 shrink-0" />
        Alerts are on. We will notify you near your turn.
      </p>
    )
  }

  return (
    <p className="notice-warning">
      <BellOff className="mt-0.5 size-4 shrink-0" />
      Notifications are off. Keep this page open to see a banner near your turn.
    </p>
  )
}
