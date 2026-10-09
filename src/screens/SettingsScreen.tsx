import type { LocaleMessages } from '../i18n/types'
import { Button, Muted } from '../ui'
import { routes } from '../routing/routes'
import { navigate } from '../routing/usePath'

type SettingsScreenProps = {
  messages: LocaleMessages
  onLock: () => void
}

export function SettingsScreen({ messages, onLock }: SettingsScreenProps) {
  return (
    <main className="ui-screen screen-main">
      <h1>{messages.screens.settings.title}</h1>
      <Muted>{messages.screens.settings.description}</Muted>
      <Button variant="ghost" onClick={() => navigate(routes.gallery)}>
        {messages.gallery.open}
      </Button>
      <Button
        variant="ghost"
        onClick={() => {
          onLock()
          navigate(routes.lock, true)
        }}
      >
        {messages.pin.lockAction}
      </Button>
    </main>
  )
}
