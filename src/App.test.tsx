import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { resolveLanguage } from './i18n'
import { createPinKey } from './security/pinKey'
import { navigate } from './routing/usePath'
import { routes } from './routing/routes'

const pwaState = vi.hoisted(() => ({
  offlineReady: false,
  needRefresh: false,
  setOfflineReady: vi.fn(),
  setNeedRefresh: vi.fn(),
  updateServiceWorker: vi.fn(),
}))

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    offlineReady: [pwaState.offlineReady, pwaState.setOfflineReady],
    needRefresh: [pwaState.needRefresh, pwaState.setNeedRefresh],
    updateServiceWorker: pwaState.updateServiceWorker,
  }),
}))

async function createPinFromWelcome(pin = '123456') {
  fireEvent.change(screen.getByLabelText('PIN'), {
    target: { value: pin },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Create key' }))
  await waitFor(() => {
    expect(screen.getByRole('heading', { name: 'Home' })).toBeInTheDocument()
  })
}

async function unlockWithKeypad(pin = '123456') {
  for (const digit of pin) {
    fireEvent.click(screen.getByRole('button', { name: digit }))
  }
  fireEvent.click(screen.getByRole('button', { name: 'Unlock' }))
  await waitFor(() => {
    expect(screen.getByRole('heading', { name: 'Home' })).toBeInTheDocument()
  })
}

describe('App', () => {
  beforeEach(() => {
    pwaState.offlineReady = false
    pwaState.needRefresh = false
    localStorage.clear()
    window.history.replaceState(null, '', '/')
    vi.clearAllMocks()
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible',
    })
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    localStorage.clear()
    window.history.replaceState(null, '', '/')
    document.documentElement.lang = ''
    document.title = ''
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible',
    })
  })

  it('sends first run to Welcome', () => {
    window.history.replaceState(null, '', '/home')
    render(<App />)

    expect(
      screen.getByRole('heading', { name: 'Clear support starts here.' }),
    ).toBeInTheDocument()
    expect(document.documentElement.lang).toBe('en')
  })

  it('shows the PIN limits and explains the key scope', () => {
    const { container } = render(<App />)
    const view = within(container)

    expect(
      view.getByRole('heading', { name: 'Create your PIN key' }),
    ).toBeInTheDocument()
    expect(view.getByLabelText('PIN')).toHaveAttribute('pattern', '[0-9]{6}')
    expect(
      view.getByText(/does not encrypt app content yet/),
    ).toBeInTheDocument()
    expect(view.getByText(/resets the delay/)).toBeInTheDocument()
  })

  it('switches all visible copy to Spanish', () => {
    render(<App />)

    fireEvent.change(screen.getByLabelText('Language'), {
      target: { value: 'es' },
    })

    expect(
      screen.getByRole('heading', { name: 'El apoyo claro empieza aquí.' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Idioma')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Salida rápida' })).toHaveAttribute(
      'href',
      '/neutral.html',
    )
    expect(document.documentElement.lang).toBe('es')
    expect(document.title).toBe('Notas')
  })

  it('replaces the current page when quick exit is used', () => {
    const replace = vi.fn()
    vi.stubGlobal('location', {
      ...window.location,
      replace,
      pathname: '/',
      search: '',
      hash: '',
    })
    const { container } = render(<App />)

    fireEvent.click(within(container).getByRole('link', { name: 'Quick exit' }))

    expect(replace).toHaveBeenCalledWith('/neutral.html')
  })

  it('resolves regional locales and falls back to English', () => {
    expect(resolveLanguage('es-MX')).toBe('es')
    expect(resolveLanguage('es_ES')).toBe('es')
    expect(resolveLanguage('ht')).toBe('en')
    expect(resolveLanguage('pt-BR')).toBe('en')
    expect(resolveLanguage('zh-Hans')).toBe('en')
  })

  it('waits for confirmation before activating an update', () => {
    pwaState.needRefresh = true
    render(<App />)

    expect(
      screen.getByText('An update is ready to install.'),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Update now' }))

    expect(pwaState.updateServiceWorker).toHaveBeenCalledWith(true)
  })

  it('shows the six-tab bar with accessible names after unlock', async () => {
    render(<App />)
    await createPinFromWelcome()

    const nav = screen.getByRole('navigation', { name: 'Main' })
    for (const name of [
      'Home',
      'Plan',
      'Help',
      'Alerts',
      'Rights',
      'Settings',
    ]) {
      expect(within(nav).getByRole('link', { name })).toBeInTheDocument()
    }

    fireEvent.click(within(nav).getByRole('link', { name: 'Plan' }))
    expect(screen.getByRole('heading', { name: 'Plan' })).toBeInTheDocument()
    expect(within(nav).getByRole('link', { name: 'Plan' })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  it('blocks every route while locked and unlocks with the keypad', async () => {
    const created = await createPinKey('123456')
    expect(created.ok).toBe(true)

    window.history.replaceState(null, '', '/plan')
    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Enter your PIN')).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Main' })).toBeNull()

    await unlockWithKeypad('123456')
    expect(screen.getByRole('heading', { name: 'Home' })).toBeInTheDocument()
  })

  it('keeps the verifier route out of the tab bar', async () => {
    render(<App />)
    await createPinFromWelcome()

    const nav = screen.getByRole('navigation', { name: 'Main' })
    expect(
      within(nav).queryByRole('link', { name: 'Verifier queue' }),
    ).toBeNull()

    navigate(routes.verifier)
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Verifier queue' }),
      ).toBeInTheDocument()
    })
    expect(screen.queryByRole('navigation', { name: 'Main' })).toBeNull()
  })

  it('locks and blanks the UI when the app is backgrounded', async () => {
    render(<App />)
    await createPinFromWelcome()

    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
    document.dispatchEvent(new Event('visibilitychange'))

    await waitFor(() => {
      expect(screen.getByText('Enter your PIN')).toBeInTheDocument()
    })
    expect(document.querySelector('.switcher-blank')).toBeTruthy()
  })
})
