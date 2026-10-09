import { Muted } from '../ui'

type ScreenPlaceholderProps = {
  title: string
  description: string
}

export function ScreenPlaceholder({
  title,
  description,
}: ScreenPlaceholderProps) {
  return (
    <main className="ui-screen screen-main">
      <h1>{title}</h1>
      <Muted>{description}</Muted>
    </main>
  )
}
