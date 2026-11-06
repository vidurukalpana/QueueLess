interface ArrivalBadgeProps {
  checkedIn: boolean
}

export function ArrivalBadge({ checkedIn }: ArrivalBadgeProps) {
  return checkedIn ? (
    <span className="rounded-full border-2 border-gray-900 bg-gray-900 px-3 text-xs font-bold text-white">
      Here
    </span>
  ) : (
    <span className="rounded-full border-2 border-gray-400 px-3 text-xs font-bold text-gray-500">
      Remote
    </span>
  )
}
