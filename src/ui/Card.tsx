import type { HTMLAttributes, ReactNode } from 'react'

type CardProps = HTMLAttributes<HTMLDivElement> & {
  tone?: 'default' | 'warn'
  children: ReactNode
}

export function Card({
  tone = 'default',
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={['ui-card', tone === 'warn' ? 'ui-card--warn' : '', className]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </div>
  )
}

type CardLinkProps = {
  href: string
  className?: string
  children: ReactNode
}

export function CardLink({ href, className, children }: CardLinkProps) {
  return (
    <a href={href} className={['ui-card', className].filter(Boolean).join(' ')}>
      {children}
    </a>
  )
}

export function CardTitle({ children }: { children: ReactNode }) {
  return <h2 className="ui-card__title">{children}</h2>
}

export function Muted({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <p className={['ui-muted', className].filter(Boolean).join(' ')}>
      {children}
    </p>
  )
}

export function Row({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={['ui-row', className].filter(Boolean).join(' ')}>
      {children}
    </div>
  )
}
