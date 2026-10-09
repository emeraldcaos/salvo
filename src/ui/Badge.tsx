import type { ReactNode } from 'react'

export type BadgeTone = 'ok' | 'warn'

type BadgeProps = {
  tone?: BadgeTone
  children: ReactNode
}

export function Badge({ tone = 'ok', children }: BadgeProps) {
  return <span className={`ui-badge ui-badge--${tone}`}>{children}</span>
}
