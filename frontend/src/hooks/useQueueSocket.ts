import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import type { ServerMessage } from '../api/types'

const wsUrl: string = import.meta.env.VITE_WS_URL
const FIRST_RETRY_MS = 1000
const MAX_RETRY_MS = 30_000

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
  const [isReconnecting, setIsReconnecting] = useState(false)

  useEffect(() => {
    if (!queueId) {
      return
    }

    let socket: WebSocket
    let retryTimer: ReturnType<typeof setTimeout>
    let attempts = 0
    let isStopped = false

    function refreshQueueData() {
      void queryClient.invalidateQueries({ queryKey: ['tickets', queueId] })
      void queryClient.invalidateQueries({ queryKey: ['ticket'] })
      void queryClient.invalidateQueries({ queryKey: ['queues'] })
    }

    function connect() {
      socket = new WebSocket(`${wsUrl}/ws/queues/${queueId}`)

      socket.onopen = () => {
        if (attempts > 0) {
          refreshQueueData()
        }
        attempts = 0
        setIsReconnecting(false)
      }

      socket.onmessage = (event: MessageEvent) => {
        const message = parseMessage(event.data)
        if (message?.type === 'queue_updated') {
          refreshQueueData()
        }
      }

      socket.onclose = () => {
        if (isStopped) {
          return
        }
        setIsReconnecting(true)
        const delay = Math.min(FIRST_RETRY_MS * 2 ** attempts, MAX_RETRY_MS)
        attempts += 1
        retryTimer = setTimeout(connect, delay)
      }
    }

    connect()

    return () => {
      isStopped = true
      clearTimeout(retryTimer)
      socket.close()
      setIsReconnecting(false)
    }
  }, [queueId, queryClient])

  return { isReconnecting }
}
