import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { apiGet } from '../api/client'
import type { HealthResponse } from '../api/types'

const WAKING_DELAY_MS = 2000

export function ApiStatus() {
  const [isSlow, setIsSlow] = useState(false)
  const { data, isError } = useQuery({
    queryKey: ['health'],
    queryFn: () => apiGet<HealthResponse>('/health'),
  })

  useEffect(() => {
    const timer = setTimeout(() => setIsSlow(true), WAKING_DELAY_MS)
    return () => clearTimeout(timer)
  }, [])

  let message = 'API: checking…'
  if (data) {
    message = `API: ${data.status}`
  } else if (isError) {
    message = 'API: unavailable'
  } else if (isSlow) {
    message = 'Waking server…'
  }

  return <p className="p-4 text-center text-sm text-gray-500">{message}</p>
}
