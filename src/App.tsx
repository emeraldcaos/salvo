import { useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { languages, resolveLanguage, translations } from './i18n'
import type { Language } from './i18n'
import PinAccess from './security/PinAccess'
import PinKeyContext from './security/PinKeyContext'
import './App.css'

function App() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({ immediate: true })
  const [language, setLanguage] = useState<Language>(() =>
    resolveLanguage(navigator.language),
  )
  const [pinKey, setPinKey] = useState<CryptoKey | null>(null)
  const messages = translations[language]

  useEffect(() => {
    document.documentElement.lang = language
    document.title = messages.appName
  }, [language, messages.appName])

  return (
    <PinKeyContext.Provider value={pinKey}>
      <div className="app-shell">
        <header className="app-header">
          <span className="brand">{messages.appName}</span>
          <div className="header-actions">
            <div className="language-control">
              <label htmlFor="language-select">
                {messages.languageSwitcher.label}
              </label>
              <select
                id="language-select"
                value={language}
                onChange={(event) =>
                  setLanguage(resolveLanguage(event.target.value))
                }
              >
                {languages.map((option) => (
                  <option key={option} value={option}>
                    {messages.languageSwitcher.languages[option]}
                  </option>
                ))}
              </select>
            </div>
            <a
              className="quick-exit"
              href={`${import.meta.env.BASE_URL}neutral.html`}
              onClick={(event) => {
                event.preventDefault()
                window.location.replace(
                  `${import.meta.env.BASE_URL}neutral.html`,
                )
              }}
            >
              {messages.quickExit}
            </a>
          </div>
        </header>

        {(offlineReady || needRefresh) && (
          <aside className="pwa-notice" role="status">
            <p>
              {needRefresh
                ? messages.pwa.updateAvailable
                : messages.pwa.offlineReady}
            </p>
            <div className="pwa-actions">
              {needRefresh && (
                <button
                  className="update-button"
                  type="button"
                  onClick={() => void updateServiceWorker(true)}
                >
                  {messages.pwa.updateNow}
                </button>
              )}
              <button
                className="dismiss-button"
                type="button"
                onClick={() => {
                  setNeedRefresh(false)
                  setOfflineReady(false)
                }}
              >
                {needRefresh
                  ? messages.pwa.dismissUpdate
                  : messages.pwa.dismissOffline}
              </button>
            </div>
          </aside>
        )}

        <main className="welcome">
          <PinAccess
            messages={messages.pin}
            encryptionKey={pinKey}
            onKeyChange={setPinKey}
          />
          <p className="eyebrow">{messages.welcome.eyebrow}</p>
          <h1>{messages.welcome.title}</h1>
          <p className="welcome-copy">{messages.welcome.description}</p>
        </main>
      </div>
    </PinKeyContext.Provider>
  )
}

export default App
