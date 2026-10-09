import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Badge, type BadgeTone } from './Badge'

type ListRowProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  title: string
  meta?: string
  badge?: ReactNode
  badgeTone?: BadgeTone
}

export function ListRow({
  title,
  meta,
  badge,
  badgeTone = 'ok',
  className,
  type = 'button',
  ...props
}: ListRowProps) {
  return (
    <button
      type={type}
      className={['ui-list-row', className].filter(Boolean).join(' ')}
      {...props}
    >
      <span>
        <span className="ui-list-row__title">{title}</span>
        {meta ? <p className="ui-list-row__meta">{meta}</p> : null}
      </span>
      {badge != null ? <Badge tone={badgeTone}>{badge}</Badge> : null}
    </button>
  )
}
