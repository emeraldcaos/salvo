import type { ButtonHTMLAttributes, ReactNode } from 'react'

export type ButtonVariant = 'primary' | 'ghost' | 'danger'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  block?: boolean
  compact?: boolean
  children: ReactNode
}

export function Button({
  variant = 'primary',
  block = false,
  compact = false,
  className,
  type = 'button',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={[
        'ui-button',
        `ui-button--${variant}`,
        block ? 'ui-button--block' : '',
        compact ? 'ui-button--compact' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </button>
  )
}

type ButtonLinkProps = {
  href: string
  variant?: ButtonVariant
  block?: boolean
  compact?: boolean
  className?: string
  children: ReactNode
}

export function ButtonLink({
  href,
  variant = 'primary',
  block = false,
  compact = false,
  className,
  children,
}: ButtonLinkProps) {
  return (
    <a
      href={href}
      className={[
        'ui-button',
        `ui-button--${variant}`,
        block ? 'ui-button--block' : '',
        compact ? 'ui-button--compact' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </a>
  )
}
