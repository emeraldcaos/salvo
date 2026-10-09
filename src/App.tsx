import { useEffect, useState, type ReactNode } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { languages, resolveLanguage, translations } from './i18n'
import type { Language } from './i18n'
import { resolveGuardedRoute } from './routing/path'
import { routes, showsTabBar } from './routing/routes'
import { navigate, usePath } from './routing/usePath'
import { LockScreen } from './screens/LockScreen'
import { ScreenPlaceholder } from './screens/ScreenPlaceholder'
import { SettingsScreen } from './screens/SettingsScreen'
import { WelcomeScreen } from './screens/WelcomeScreen'
import PinKeyContext from './security/PinKeyContext'
import { hasPinConfiguration } from './security/pinKey'
import type { PinIdentity } from './security/pinKey'
import { TabBar } from './shell/TabBar'
import { ComponentGallery } from './ui'
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
  const [pinIdentity, setPinIdentity] = useState<PinIdentity | null>(null)
  const requestedPath = usePath()
  const messages = translations[language]
  const unlocked = pinIdentity !== null
  const pinConfigured = unlocked || hasPinConfiguration()

  const activeRoute = resolveGuardedRoute({
    requestedPath,
    pinConfigured,
    unlocked,
  })

  useEffect(() => {
    document.documentElement.lang = language
    document.title = messages.appName
  }, [language, messages.appName])

  useEffect(() => {
    if (requestedPath !== activeRoute) {
      navigate(activeRoute, true)
    }
  }, [requestedPath, activeRoute])

  const showTabs = unlocked && showsTabBar(activeRoute)

  let screen: ReactNode
  switch (activeRoute) {
    case routes.welcome:
      screen = (
        <WelcomeScreen
          messages={messages}
          language={language}
          onLanguageChange={setLanguage}
          identity={pinIdentity}
          onIdentityChange={setPinIdentity}
        />
      )
      break
    case routes.lock:
      screen = (
        <LockScreen
          messages={messages}
          identity={pinIdentity}
          onIdentityChange={setPinIdentity}
        />
      )
      break
    case routes.home:
      screen = (
        <ScreenPlaceholder
          title={messages.screens.home.title}
          description={messages.screens.home.description}
        />
      )
      break
    case routes.plan:
      screen = (
        <ScreenPlaceholder
          title={messages.screens.plan.title}
          description={messages.screens.plan.description}
        />
      )
      break
    case routes.help:
      screen = (
        <ScreenPlaceholder
          title={messages.screens.help.title}
          description={messages.screens.help.description}
        />
      )
      break
    case routes.alerts:
      screen = (
        <ScreenPlaceholder
          title={messages.screens.alerts.title}
          description={messages.screens.alerts.description}
        />
      )
      break
    case routes.rights:
      screen = (
        <ScreenPlaceholder
          title={messages.screens.rights.title}
          description={messages.screens.rights.description}
        />
      )
      break
    case routes.settings:
      screen = (
        <SettingsScreen
          messages={messages}
          onLock={() => setPinIdentity(null)}
        />
      )
      break
    case routes.verifier:
      screen = (
        <ScreenPlaceholder
          title={messages.screens.verifier.title}
          description={messages.screens.verifier.description}
        />
      )
      break
    case routes.gallery:
      screen = (
        <ComponentGallery
          messages={messages.gallery}
          onBack={() => navigate(routes.settings)}
        />
      )
      break
    default:
      screen = null
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
            {activeRoute !== routes.welcome && (
              <div className="language-control">
                <label htmlFor="shell-language-select">
                  {messages.languageSwitcher.label}
                </label>
                <select
                  id="shell-language-select"
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
            )}
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

        <div className="app-body">
          {screen}
          {showTabs ? (
            <TabBar
              activePath={activeRoute}
              navLabel={messages.nav.label}
              labels={{
                home: messages.nav.home,
                plan: messages.nav.plan,
                help: messages.nav.help,
                alerts: messages.nav.alerts,
                rights: messages.nav.rights,
                settings: messages.nav.settings,
              }}
            />
          ) : null}
        </div>
      </div>
    </PinKeyContext.Provider>
  )
}

export default App
