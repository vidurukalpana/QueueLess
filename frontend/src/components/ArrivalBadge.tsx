import { MapPin, Wifi } from 'lucide-react'

interface ArrivalBadgeProps {
  checkedIn: boolean
}

export function ArrivalBadge({ checkedIn }: ArrivalBadgeProps) {
  return checkedIn ? (
    <span className="pill bg-emerald-100 text-emerald-800">
      <MapPin className="size-3" />
      Here
    </span>
  ) : (
    <span className="pill bg-stone-100 text-stone-600">
      <Wifi className="size-3" />
      Remote
    </span>
  )
}
