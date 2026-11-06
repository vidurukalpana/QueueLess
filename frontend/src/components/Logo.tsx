import { Ticket } from 'lucide-react'

interface LogoProps {
  light?: boolean
}

export function Logo({ light = false }: LogoProps) {
  return (
    <span className="inline-flex items-center gap-2 text-xl font-extrabold tracking-tight">
      <span
        className={`flex size-9 items-center justify-center rounded-xl shadow-sm ${
          light ? 'bg-white text-brand' : 'bg-brand-bright text-white'
        }`}
      >
        <Ticket className="size-5" strokeWidth={2.5} />
      </span>
      <span className={light ? 'text-white' : 'text-stone-900'}>
        Queue
        <span className={light ? 'text-orange-100' : 'text-brand'}>Less</span>
      </span>
    </span>
  )
}
