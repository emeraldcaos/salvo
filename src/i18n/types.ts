export interface LocaleMessages {
  appName: string
  quickExit: string
  pin: {
    setupTitle: string
    unlockTitle: string
    activeTitle: string
    setupDecoyAction: string
    decoyPinTitle: string
    decoyPinLabel: string
    confirmDecoyPinLabel: string
    decoyPinHint: string
    decoyPinConfigured: string
    pinMismatch: string
    pinAlreadyUsed: string
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
  gallery: {
    open: string
    title: string
    intro: string
    tokens: string
    buttons: string
    badges: string
    chips: string
    listRows: string
    progress: string
    keypad: string
    icons: string
    primary: string
    ghost: string
    danger: string
    linkStyled: string
    okBadge: string
    warnBadge: string
    chipLegal: string
    chipFood: string
    chipClinic: string
    rowDone: string
    rowTodo: string
    done: string
    todo: string
    progressLabel: string
    pinDotsLabel: string
    deleteLabel: string
    ink: string
    mint: string
    amber: string
    cardSampleTitle: string
    cardSampleBody: string
    back: string
  }
}
