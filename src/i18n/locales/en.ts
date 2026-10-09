import type { LocaleMessages } from '../types'

const en: LocaleMessages = {
  appName: 'Notes',
  quickExit: 'Quick exit',
  pin: {
    setupTitle: 'Create your PIN key',
    unlockTitle: 'Unlock your PIN key',
    activeTitle: 'PIN key active',
    setupDecoyAction: 'Manage second PIN',
    decoyPinTitle: 'Set up or change the second PIN',
    decoyPinLabel: 'Second PIN',
    confirmDecoyPinLabel: 'Confirm second PIN',
    decoyPinHint:
      'The second PIN opens a separate empty profile. Enter 8 to 12 digits different from the PIN you used to unlock.',
    decoyPinConfigured: 'PIN saved.',
    pinMismatch: 'The PINs do not match.',
    pinAlreadyUsed: 'Use a different PIN from the one you used to unlock.',
    inputLabel: 'PIN',
    inputHint: 'Enter 8 to 12 digits.',
    recoveryWarning: 'Your PIN cannot be recovered if you forget it.',
    scopeNote:
      'This creates an encryption key. It does not encrypt app content yet.',
    securityNote:
      'The PIN is not saved or sent by this app. The key stays in memory while unlocked.',
    retryPolicy:
      'After five incorrect PINs, wait 30 seconds. Each later failure doubles the wait, up to 15 minutes. Clearing this browser’s site data resets the delay.',
    createAction: 'Create key',
    unlockAction: 'Unlock',
    lockAction: 'Lock key',
    unlocked: 'Key unlocked in memory for this session.',
    invalidPin: 'Enter 8 to 12 digits.',
    incorrectPin: 'That PIN did not unlock the key. Try again.',
    lockout: 'Too many incorrect attempts. Try again in {seconds} seconds.',
    alreadyConfigured: 'A PIN key already exists on this device.',
    notConfigured: 'No PIN key is set up on this device.',
    corruptRecord: 'The saved PIN key data cannot be read.',
    unavailable: 'Secure local storage is unavailable in this browser.',
  },
  languageSwitcher: {
    label: 'Language',
    languages: {
      en: 'English',
      es: 'Spanish',
    },
  },
  pwa: {
    offlineReady: 'This app is ready to use offline.',
    updateAvailable: 'An update is ready to install.',
    updateNow: 'Update now',
    dismissUpdate: 'Not now',
    dismissOffline: 'Close',
  },
  welcome: {
    eyebrow: 'Welcome',
    title: 'Clear support starts here.',
    description:
      'A place for practical information for immigrants and their communities.',
  },
  lock: {
    prompt: 'Enter your PIN',
    forgotPin: 'Forgot your PIN? Data cannot be recovered.',
  },
  nav: {
    label: 'Main',
    home: 'Home',
    plan: 'Plan',
    help: 'Help',
    alerts: 'Alerts',
    rights: 'Rights',
    settings: 'Settings',
  },
  screens: {
    home: {
      title: 'Home',
      description: 'Your emergency tools and plan summary will live here.',
    },
    plan: {
      title: 'Plan',
      description: 'Your on-device checklist will live here.',
    },
    help: {
      title: 'Find help',
      description: 'The local help directory will live here.',
    },
    alerts: {
      title: 'Alerts',
      description: 'Nearby verified alerts will live here.',
    },
    rights: {
      title: 'Know your rights',
      description: 'Rights scripts and the officer card will live here.',
    },
    settings: {
      title: 'Settings and privacy',
      description: 'PIN, wipe, and privacy controls will live here.',
    },
    verifier: {
      title: 'Verifier queue',
      description:
        'Invite-only report review. This route is not in the tab bar.',
    },
  },
  gallery: {
    open: 'Open component gallery',
    title: 'Component gallery',
    intro:
      'Shared design tokens and UI pieces from the Safety PWA mockups. All assets load from this app.',
    tokens: 'Color tokens',
    buttons: 'Buttons',
    badges: 'Badges',
    chips: 'Chips',
    listRows: 'List rows',
    progress: 'Progress bar',
    keypad: 'Keypad',
    icons: 'Line icons',
    primary: 'Primary action',
    ghost: 'Ghost action',
    danger: 'Wipe all data now',
    linkStyled: 'Link styled as a button',
    okBadge: 'Done',
    warnBadge: 'To do',
    chipLegal: 'Legal aid',
    chipFood: 'Food',
    chipClinic: 'Clinic',
    rowDone: 'Emergency contacts',
    rowTodo: 'Medications',
    done: 'Done',
    todo: 'To do',
    progressLabel: 'Your plan',
    pinDotsLabel: 'PIN length so far',
    deleteLabel: 'Delete',
    ink: 'Ink ground',
    mint: 'Mint primary',
    amber: 'Amber caution',
    cardSampleTitle: 'Card',
    cardSampleBody: 'Raised surface on ink.',
    back: 'Back',
  },
}

export default en
