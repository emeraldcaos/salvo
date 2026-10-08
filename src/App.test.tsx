import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { resolveLanguage } from './i18n'

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

describe('App', () => {
  beforeEach(() => {
    pwaState.offlineReady = false
    pwaState.needRefresh = false
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    document.documentElement.lang = ''
    document.title = ''
  })

  it('renders English by default', () => {
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
    expect(view.getByLabelText('PIN')).toHaveAttribute('pattern', '[0-9]{8,12}')
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
    vi.stubGlobal('location', { replace })
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
})
