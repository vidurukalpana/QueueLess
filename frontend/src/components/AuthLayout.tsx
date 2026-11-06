import { Check } from 'lucide-react'
import type { ReactNode } from 'react'
import { Logo } from './Logo'

const highlights = [
  'Customers wait anywhere, not in your shop',
  'A QR code ready in seconds',
  'See who has arrived, live',
]

interface AuthLayoutProps {
  children: ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <main className="mx-auto grid min-h-dvh w-full max-w-6xl content-center gap-8 px-4 py-6 lg:grid-cols-2 lg:gap-8">
      <section className="hero hidden flex-col justify-center rounded-3xl p-10 shadow-xl shadow-orange-900/20 lg:flex">
        <div className="relative">
          <Logo light />
          <p className="mt-12 text-4xl leading-tight font-extrabold tracking-tight">
            Less waiting.
            <br />
            More customers.
          </p>
          <ul className="mt-8 space-y-3 font-medium">
            {highlights.map((highlight) => (
              <li key={highlight} className="flex items-center gap-3">
                <span className="flex size-6 items-center justify-center rounded-full bg-white/20">
                  <Check className="size-3.5" strokeWidth={3} />
                </span>
                {highlight}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="mx-auto w-full max-w-md lg:max-w-none lg:[&>form]:flex lg:[&>form]:h-full lg:[&>form]:flex-col lg:[&>form]:justify-center lg:[&>form]:rounded-3xl">
        <p className="mb-6 text-center lg:hidden">
          <Logo />
        </p>
        {children}
      </div>
    </main>
  )
}
