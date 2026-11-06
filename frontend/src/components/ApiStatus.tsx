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

  return (
    <p className="flex justify-center p-5">
      <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs font-medium text-stone-500 ring-1 ring-stone-200">
        <span
          className={`size-1.5 rounded-full ${data ? 'bg-emerald-500' : 'bg-amber-500'}`}
        />
        {message}
      </span>
    </p>
  )
}
