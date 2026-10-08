import type { LocaleMessages } from '../types'

const en: LocaleMessages = {
  appName: 'Notes',
  quickExit: 'Quick exit',
  pin: {
    setupTitle: 'Create your PIN key',
    unlockTitle: 'Unlock your PIN key',
    activeTitle: 'PIN key active',
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
}

export default en
