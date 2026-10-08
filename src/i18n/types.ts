export interface LocaleMessages {
  appName: string
  quickExit: string
  languageSwitcher: {
    label: string
    languages: Record<string, string>
  }
  pwa: {
    offlineReady: string
    updateAvailable: string
    updateNow: string
    dismissUpdate: string
    dismissOffline: string
  }
  welcome: {
    eyebrow: string
    title: string
    description: string
  }
}
