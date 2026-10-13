import { useEffect, useState } from 'react'
import type { LocaleMessages } from '../i18n/types'
import { routes } from '../routing/routes'
import { navigate } from '../routing/usePath'
import { EncryptedToolkitStore } from '../security/encryptedToolkitStore'
import {
  getPinLockoutRemainingMs,
  PIN_LENGTH,
  unlockPinKey,
  type PinIdentity,
} from '../security/pinKey'
import { Keypad, Muted, PinDots } from '../ui'
import './LockScreen.css'

type LockScreenProps = {
  messages: LocaleMessages
  onUnlock: (identity: PinIdentity) => void
}

export function LockScreen({ messages, onUnlock }: LockScreenProps) {
  const [pin, setPin] = useState('')
  const [feedback, setFeedback] = useState('')
  const [isWorking, setIsWorking] = useState(false)
  const [lockedUntil, setLockedUntil] = useState(
    () => Date.now() + getPinLockoutRemainingMs(),
  )
  const [clockNow, setClockNow] = useState(Date.now)
  const remainingSeconds = Math.ceil(Math.max(0, lockedUntil - clockNow) / 1000)
  const keypadDisabled = isWorking || remainingSeconds > 0
  const canSubmit = pin.length === PIN_LENGTH && !keypadDisabled

  useEffect(() => {
    if (remainingSeconds === 0) return
    const timer = window.setInterval(() => {
      const now = Date.now()
      setClockNow(now)
      if (now >= lockedUntil) setLockedUntil(0)
    }, 1000)
    return () => window.clearInterval(timer)
  }, [lockedUntil, remainingSeconds])

  async function tryUnlock(nextPin: string) {
    if (isWorking || remainingSeconds > 0) return
    if (nextPin.length !== PIN_LENGTH) return

    setIsWorking(true)
    setFeedback('')
    try {
      const result = await unlockPinKey(nextPin)
      if (result.ok) {
        // Decoy and primary share this path (T08); role is inside the identity.
        const store = await EncryptedToolkitStore.open(result.key, {
          profileId: result.profileId,
          role: result.role,
        })
        store.close()
        setPin('')
        onUnlock(result)
        navigate(routes.home, true)
        return
      }

      setPin('')
      if ((result.retryAfterMs ?? 0) > 0) {
        setLockedUntil(Date.now() + result.retryAfterMs!)
        setClockNow(Date.now())
        setFeedback(
          messages.pin.lockout.replace(
            '{seconds}',
            String(Math.ceil(result.retryAfterMs! / 1000)),
          ),
        )
        return
      }

      const errorCopy: Record<string, string> = {
        'invalid-pin': messages.pin.invalidPin,
        'incorrect-pin': messages.pin.incorrectPin,
        locked: messages.pin.lockout.replace('{seconds}', '0'),
        'not-configured': messages.pin.notConfigured,
        'corrupt-record': messages.pin.corruptRecord,
        unavailable: messages.pin.unavailable,
      }
      setFeedback(errorCopy[result.reason] ?? messages.pin.unavailable)
    } catch {
      setPin('')
      setFeedback(messages.pin.unavailable)
    } finally {
      setIsWorking(false)
    }
  }

  function handleDigit(digit: string) {
    if (keypadDisabled) return
    setFeedback('')
    setPin((current) =>
      current.length >= PIN_LENGTH ? current : `${current}${digit}`,
    )
  }

  function handleDelete() {
    if (keypadDisabled) return
    setFeedback('')
    setPin((current) => current.slice(0, -1))
  }

  return (
    <main className="ui-screen screen-main screen-lock">
      <div className="screen-lock__heading">
        <h1>{messages.appName}</h1>
        <Muted>{messages.lock.prompt}</Muted>
      </div>

      <PinDots
        filled={pin.length}
        total={PIN_LENGTH}
        label={messages.lock.pinDotsLabel.replace(
          '{count}',
          String(pin.length),
        )}
      />

      <Keypad
        deleteLabel={messages.lock.deleteLabel}
        disabled={keypadDisabled}
        onDigit={handleDigit}
        onDelete={handleDelete}
        canSubmit={canSubmit}
        submitLabel={messages.pin.unlockAction}
        onSubmit={() => void tryUnlock(pin)}
      />

      {remainingSeconds > 0 && (
        <p className="screen-lock__feedback" role="status">
          {messages.pin.lockout.replace('{seconds}', String(remainingSeconds))}
        </p>
      )}
      {feedback && remainingSeconds === 0 && (
        <p className="screen-lock__feedback" role="alert">
          {feedback}
        </p>
      )}

      <Muted className="screen-lock__footer">{messages.lock.forgotPin}</Muted>
    </main>
  )
}
