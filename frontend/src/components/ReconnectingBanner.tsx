import { LoaderCircle } from 'lucide-react'

export function ReconnectingBanner() {
  return (
    <p role="status" className="notice-warning mb-3 justify-center">
      <LoaderCircle className="size-4 shrink-0 motion-safe:animate-spin" />
      Reconnecting…
    </p>
  )
}
