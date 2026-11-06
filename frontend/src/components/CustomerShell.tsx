import type { ReactNode } from 'react'
import { Logo } from './Logo'

interface CustomerShellProps {
  children: ReactNode
}

export function CustomerShell({ children }: CustomerShellProps) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 pt-6">
      <p className="text-center">
        <Logo />
      </p>
      {children}
    </main>
  )
}
