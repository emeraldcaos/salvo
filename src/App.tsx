import { useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { languages, resolveLanguage, translations } from './i18n'
import type { Language } from './i18n'
import PinAccess from './security/PinAccess'
import PinKeyContext from './security/PinKeyContext'
import type { PinIdentity } from './security/pinKey'
import { Button, ComponentGallery } from './ui'
import './App.css'

function readGalleryHash(): boolean {
  return window.location.hash === '#gallery'
}

function App() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({ immediate: true })
  const [language, setLanguage] = useState<Language>(() =>
    resolveLanguage(navigator.language),
  )
  const [pinIdentity, setPinIdentity] = useState<PinIdentity | null>(null)
  const [showGallery, setShowGallery] = useState(readGalleryHash)
  const messages = translations[language]

  useEffect(() => {
    document.documentElement.lang = language
    document.title = messages.appName
  }, [language, messages.appName])

  useEffect(() => {
    const onHashChange = () => setShowGallery(readGalleryHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const openGallery = () => {
    window.location.hash = 'gallery'
    setShowGallery(true)
  }

  const closeGallery = () => {
    if (window.location.hash === '#gallery') {
      history.replaceState(
        null,
        '',
        `${window.location.pathname}${window.location.search}`,
      )
    }
    setShowGallery(false)
  }

  return (
    <PinKeyContext.Provider
      value={
        pinIdentity
          ? { key: pinIdentity.key, profileId: pinIdentity.profileId }
          : null
      }
    >
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

        {showGallery ? (
          <ComponentGallery messages={messages.gallery} onBack={closeGallery} />
        ) : (
          <main className="welcome">
            <PinAccess
              messages={messages.pin}
              identity={pinIdentity}
              onIdentityChange={setPinIdentity}
            />
            <p className="eyebrow">{messages.welcome.eyebrow}</p>
            <h1>{messages.welcome.title}</h1>
            <p className="welcome-copy">{messages.welcome.description}</p>
            <div className="gallery-entry">
              <Button variant="ghost" onClick={openGallery}>
                {messages.gallery.open}
              </Button>
            </div>
          </main>
        )}
      </div>
    </PinKeyContext.Provider>
  )
}

export default App
