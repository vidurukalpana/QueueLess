import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import type { ServerMessage } from '../api/types'

const wsUrl: string = import.meta.env.VITE_WS_URL

function parseMessage(data: unknown): ServerMessage | null {
  if (typeof data !== 'string') {
    return null
  }
  try {
    return JSON.parse(data) as ServerMessage
  } catch {
    return null
  }
}

export function useQueueSocket(queueId: string | undefined) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!queueId) {
      return
    }

    const socket = new WebSocket(`${wsUrl}/ws/queues/${queueId}`)

    socket.onmessage = (event: MessageEvent) => {
      const message = parseMessage(event.data)
      if (message?.type === 'queue_updated') {
        void queryClient.invalidateQueries({ queryKey: ['tickets', queueId] })
        void queryClient.invalidateQueries({ queryKey: ['ticket'] })
        void queryClient.invalidateQueries({ queryKey: ['queues'] })
      }
    }

    return () => socket.close()
  }, [queueId, queryClient])
}
