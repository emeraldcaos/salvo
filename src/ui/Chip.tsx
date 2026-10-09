import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ChipProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  selected?: boolean
  children: ReactNode
}

export function Chip({
  selected = false,
  className,
  type = 'button',
  children,
  ...props
}: ChipProps) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={['ui-chip', selected ? 'ui-chip--selected' : '', className]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </button>
  )
}

export function ChipRow({ children }: { children: ReactNode }) {
  return <div className="ui-chip-row">{children}</div>
}
