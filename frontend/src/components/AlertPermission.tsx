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
        className="w-full rounded-md border-2 border-gray-900 px-4 py-2 font-bold"
      >
        Get an alert near your turn
      </button>
    )
  }

  if (permission === 'granted') {
    return (
      <p className="text-center text-sm text-gray-600">
        Alerts are on. We will notify you near your turn.
      </p>
    )
  }

  return (
    <p className="rounded-md border-2 border-dashed border-gray-500 bg-gray-100 px-3 py-2 text-center text-sm">
      Notifications are off. Keep this page open to see a banner near your turn.
    </p>
  )
}
