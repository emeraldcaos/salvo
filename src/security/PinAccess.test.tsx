import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PinIdentity } from './pinKey'
import PinAccess from './PinAccess'
import { translations } from '../i18n'

const pinMocks = vi.hoisted(() => ({
  configureDecoyPin: vi.fn(),
}))

vi.mock('./pinKey', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./pinKey')>()),
  configureDecoyPin: pinMocks.configureDecoyPin,
}))

const primaryIdentity: PinIdentity = {
  key: {} as CryptoKey,
  profileId: 'a'.repeat(32),
  role: 'primary',
}

describe('PinAccess', () => {
  beforeEach(() => {
    pinMocks.configureDecoyPin.mockReset()
    localStorage.removeItem('salvo.pin-key.v1')
  })

  afterEach(() => {
    cleanup()
    localStorage.removeItem('salvo.pin-key.v1')
  })

  it('shows only the PIN entry when a configured profile is locked', () => {
    localStorage.setItem('salvo.pin-key.v1', 'configured')
    render(
      <PinAccess
        messages={translations.en.pin}
        identity={null}
        onIdentityChange={vi.fn()}
      />,
    )

    expect(
      screen.getByRole('heading', { name: 'Unlock your PIN key' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('PIN')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Unlock' })).toBeInTheDocument()
    expect(
      screen.queryByText('Your PIN cannot be recovered if you forget it.'),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText(/does not encrypt app content yet/),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText(/After five incorrect PINs/),
    ).not.toBeInTheDocument()
  })

  it('allows second-PIN setup only from the primary profile', async () => {
    pinMocks.configureDecoyPin.mockResolvedValue({ ok: true })
    const onIdentityChange = vi.fn()
    const { container } = render(
      <PinAccess
        messages={translations.en.pin}
        identity={primaryIdentity}
        onIdentityChange={onIdentityChange}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Manage second PIN' }))
    fireEvent.change(screen.getByLabelText('Second PIN'), {
      target: { value: '24681357' },
    })
    fireEvent.change(screen.getByLabelText('Confirm second PIN'), {
      target: { value: '24681357' },
    })
    const form = container.querySelector('form')
    if (!form) throw new Error('Second-PIN form was not rendered.')
    fireEvent.submit(form)

    await waitFor(() => {
      expect(pinMocks.configureDecoyPin).toHaveBeenCalledWith(
        '24681357',
        primaryIdentity,
      )
      expect(screen.getByText('PIN saved.')).toBeInTheDocument()
    })
    expect(onIdentityChange).not.toHaveBeenCalled()
  })

  it('shows the same PIN-management flow when a decoy profile is open', async () => {
    pinMocks.configureDecoyPin.mockResolvedValue({ ok: true })
    const decoyIdentity = { ...primaryIdentity, role: 'decoy' as const }
    const { container } = render(
      <PinAccess
        messages={translations.en.pin}
        identity={decoyIdentity}
        onIdentityChange={vi.fn()}
      />,
    )

    expect(
      screen.getByText('Key unlocked in memory for this session.'),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Manage second PIN' }))
    fireEvent.change(screen.getByLabelText('Second PIN'), {
      target: { value: '24681357' },
    })
    fireEvent.change(screen.getByLabelText('Confirm second PIN'), {
      target: { value: '24681357' },
    })
    const form = container.querySelector('form')
    if (!form) throw new Error('Second-PIN form was not rendered.')
    fireEvent.submit(form)

    await waitFor(() => {
      expect(pinMocks.configureDecoyPin).toHaveBeenCalledWith(
        '24681357',
        decoyIdentity,
      )
      expect(screen.getByText('PIN saved.')).toBeInTheDocument()
    })
  })
})
