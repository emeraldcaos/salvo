export interface LocaleMessages {
  appName: string
  quickExit: string
  pin: {
    setupTitle: string
    unlockTitle: string
    activeTitle: string
    inputLabel: string
    inputHint: string
    recoveryWarning: string
    scopeNote: string
    securityNote: string
    retryPolicy: string
    createAction: string
    unlockAction: string
    lockAction: string
    unlocked: string
    invalidPin: string
    incorrectPin: string
    lockout: string
    alreadyConfigured: string
    notConfigured: string
    corruptRecord: string
    unavailable: string
  }
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
