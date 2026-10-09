import type { LocaleMessages } from '../i18n/types'
import type { Language } from '../i18n'
import { languages, resolveLanguage } from '../i18n'
import PinAccess from '../security/PinAccess'
import type { PinIdentity } from '../security/pinKey'
import { Muted } from '../ui'
import { routes } from '../routing/routes'
import { navigate } from '../routing/usePath'

type WelcomeScreenProps = {
  messages: LocaleMessages
  language: Language
  onLanguageChange: (language: Language) => void
  identity: PinIdentity | null
  onIdentityChange: (identity: PinIdentity | null) => void
}

export function WelcomeScreen({
  messages,
  language,
  onLanguageChange,
  identity,
  onIdentityChange,
}: WelcomeScreenProps) {
  return (
    <main className="ui-screen screen-main">
      <div>
        <p className="eyebrow">{messages.welcome.eyebrow}</p>
        <h1>{messages.welcome.title}</h1>
        <Muted>{messages.welcome.description}</Muted>
      </div>

      <div className="language-control welcome-language">
        <label htmlFor="language-select">
          {messages.languageSwitcher.label}
        </label>
        <select
          id="language-select"
          value={language}
          onChange={(event) =>
            onLanguageChange(resolveLanguage(event.target.value))
          }
        >
          {languages.map((option) => (
            <option key={option} value={option}>
              {messages.languageSwitcher.languages[option]}
            </option>
          ))}
        </select>
      </div>

      <PinAccess
        messages={messages.pin}
        identity={identity}
        onIdentityChange={(next) => {
          onIdentityChange(next)
          if (next) navigate(routes.home, true)
        }}
      />
    </main>
  )
}
