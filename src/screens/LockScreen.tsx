import type { LocaleMessages } from '../i18n/types'
import PinAccess from '../security/PinAccess'
import type { PinIdentity } from '../security/pinKey'
import { Muted } from '../ui'
import { routes } from '../routing/routes'
import { navigate } from '../routing/usePath'

type LockScreenProps = {
  messages: LocaleMessages
  identity: PinIdentity | null
  onIdentityChange: (identity: PinIdentity | null) => void
}

export function LockScreen({
  messages,
  identity,
  onIdentityChange,
}: LockScreenProps) {
  return (
    <main className="ui-screen screen-main screen-lock">
      <div className="screen-lock__heading">
        <h1>{messages.appName}</h1>
        <Muted>{messages.lock.prompt}</Muted>
      </div>
      <PinAccess
        messages={messages.pin}
        identity={identity}
        onIdentityChange={(next) => {
          onIdentityChange(next)
          if (next) navigate(routes.home, true)
        }}
      />
      <Muted className="screen-lock__footer">{messages.lock.forgotPin}</Muted>
    </main>
  )
}
