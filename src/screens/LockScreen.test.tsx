import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { translations } from '../i18n'
import {
  configureDecoyPin,
  createPinKey,
  type PinIdentity,
} from '../security/pinKey'
import { LockScreen } from './LockScreen'

async function enterPin(pin: string) {
  for (const digit of pin) {
    fireEvent.click(screen.getByRole('button', { name: digit }))
  }
  fireEvent.click(screen.getByRole('button', { name: 'Unlock' }))
}

describe('LockScreen', () => {
  beforeEach(() => {
    localStorage.clear()
    window.history.replaceState(null, '', '/lock')
  })

  afterEach(() => {
    cleanup()
    localStorage.clear()
    window.history.replaceState(null, '', '/')
  })

  it('shows Notes, PIN dots, Delete keypad key, and forgot-PIN copy', async () => {
    await createPinKey('123456')
    render(<LockScreen messages={translations.en} onUnlock={vi.fn()} />)

    expect(screen.getByRole('heading', { name: 'Notes' })).toBeInTheDocument()
    expect(screen.getByText('Enter your PIN')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
    expect(
      screen.getByText('Forgot your PIN? Data cannot be recovered.'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('img', { name: 'PIN entered, 0 digits' }),
    ).toBeInTheDocument()

    const unlock = screen.getByRole('button', { name: 'Unlock' })
    expect(unlock).toBeDisabled()
    expect(unlock.querySelector('.ui-icon--check-outline')).toBeTruthy()

    for (const digit of '123456') {
      fireEvent.click(screen.getByRole('button', { name: digit }))
    }
    expect(unlock).toBeEnabled()
    expect(unlock).toHaveClass('ui-button--primary')
    expect(unlock.querySelector('.ui-icon--check-solid')).toBeTruthy()
  })

  it('unlocks to Home on a correct PIN', async () => {
    await createPinKey('123456')
    const onUnlock = vi.fn()
    render(<LockScreen messages={translations.en} onUnlock={onUnlock} />)

    await enterPin('123456')

    await waitFor(() => {
      expect(onUnlock).toHaveBeenCalledTimes(1)
    })
    expect(window.location.pathname).toBe('/home')
  })

  it('backs off after too many incorrect PINs', async () => {
    await createPinKey('123456')
    render(<LockScreen messages={translations.en} onUnlock={vi.fn()} />)

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await enterPin('000000')
      if (attempt < 4) {
        await waitFor(() => {
          expect(screen.getByRole('button', { name: '1' })).not.toBeDisabled()
          expect(
            screen.getByText('That PIN did not unlock the key. Try again.'),
          ).toBeInTheDocument()
        })
      }
    }

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(
        /Try again in \d+ seconds/,
      )
    })
    expect(screen.getByRole('button', { name: '1' })).toBeDisabled()
  })

  it('accepts the decoy PIN through the same unlock path', async () => {
    const primary = await createPinKey('123456')
    expect(primary.ok).toBe(true)
    if (!primary.ok) return

    const decoy = await configureDecoyPin('876543', primary as PinIdentity)
    expect(decoy.ok).toBe(true)

    const onUnlock = vi.fn()
    render(<LockScreen messages={translations.en} onUnlock={onUnlock} />)

    await enterPin('876543')

    await waitFor(() => {
      expect(onUnlock).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'decoy' }),
      )
    })
    expect(window.location.pathname).toBe('/home')
  })
})
