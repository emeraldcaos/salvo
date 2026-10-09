import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type { LocaleMessages } from '../i18n/types'
import {
  configureDecoyPin,
  createPinKey,
  getPinLockoutRemainingMs,
  hasPinConfiguration,
  unlockPinKey,
} from './pinKey'
import { EncryptedToolkitStore } from './encryptedToolkitStore'
import type { PinIdentity } from './pinKey'

interface PinAccessProps {
  messages: LocaleMessages['pin']
  identity: PinIdentity | null
  onIdentityChange: (identity: PinIdentity | null) => void
}

function PinAccess({ messages, identity, onIdentityChange }: PinAccessProps) {
  const [configured, setConfigured] = useState(hasPinConfiguration)
  const [pin, setPin] = useState('')
  const [feedback, setFeedback] = useState('')
  const [isWorking, setIsWorking] = useState(false)
  const [lockedUntil, setLockedUntil] = useState(
    () => Date.now() + getPinLockoutRemainingMs(),
  )
  const [clockNow, setClockNow] = useState(Date.now)
  const [showDecoyForm, setShowDecoyForm] = useState(false)
  const [decoyPin, setDecoyPin] = useState('')
  const [confirmDecoyPin, setConfirmDecoyPin] = useState('')
  const [decoyFeedback, setDecoyFeedback] = useState('')
  const [decoySucceeded, setDecoySucceeded] = useState(false)
  const [isConfiguringDecoy, setIsConfiguringDecoy] = useState(false)
  const remainingSeconds = Math.ceil(Math.max(0, lockedUntil - clockNow) / 1000)

  useEffect(() => {
    if (remainingSeconds === 0) return
    const timer = window.setInterval(() => {
      const now = Date.now()
      setClockNow(now)
      if (now >= lockedUntil) setLockedUntil(0)
    }, 1000)
    return () => window.clearInterval(timer)
  }, [lockedUntil, remainingSeconds])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isWorking || remainingSeconds > 0) return

    setIsWorking(true)
    setFeedback('')
    try {
      const result = configured
        ? await unlockPinKey(pin)
        : await createPinKey(pin)

      if (result.ok) {
        setConfigured(true)
        setPin('')
        const store = await EncryptedToolkitStore.open(result.key, {
          profileId: result.profileId,
          role: result.role,
        })
        store.close()
        onIdentityChange(result)
        setFeedback('')
        return
      }

      setPin('')
      if (result.reason === 'already-configured') setConfigured(true)
      if (result.reason === 'not-configured') setConfigured(false)
      if ((result.retryAfterMs ?? 0) > 0) {
        const until = Date.now() + result.retryAfterMs!
        setLockedUntil(until)
        setClockNow(Date.now())
        setFeedback('')
        return
      }

      const errorCopy: Record<string, string> = {
        'invalid-pin': messages.invalidPin,
        'incorrect-pin': messages.incorrectPin,
        locked: messages.lockout.replace('{seconds}', '0'),
        'already-configured': messages.alreadyConfigured,
        'not-configured': messages.notConfigured,
        'corrupt-record': messages.corruptRecord,
        unavailable: messages.unavailable,
      }
      setFeedback(errorCopy[result.reason])
    } catch {
      setPin('')
      setFeedback(messages.unavailable)
    } finally {
      setIsWorking(false)
    }
  }

  async function handleDecoySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!identity || isConfiguringDecoy) return
    if (decoyPin !== confirmDecoyPin) {
      setDecoySucceeded(false)
      setDecoyFeedback(messages.pinMismatch)
      return
    }

    setIsConfiguringDecoy(true)
    setDecoyFeedback('')
    try {
      const result = await configureDecoyPin(decoyPin, identity)
      if (result.ok) {
        setDecoySucceeded(true)
        setDecoyFeedback(messages.decoyPinConfigured)
        setDecoyPin('')
        setConfirmDecoyPin('')
        setShowDecoyForm(false)
      } else {
        const errorCopy: Record<string, string> = {
          'pin-already-used': messages.pinAlreadyUsed,
          'not-active-profile': messages.unavailable,
          'not-configured': messages.notConfigured,
          'invalid-pin': messages.invalidPin,
          unavailable: messages.unavailable,
        }
        setDecoySucceeded(false)
        setDecoyFeedback(errorCopy[result.reason])
      }
    } catch {
      setDecoySucceeded(false)
      setDecoyFeedback(messages.unavailable)
    } finally {
      setIsConfiguringDecoy(false)
    }
  }

  return (
    <section className="pin-access" aria-labelledby="pin-access-title">
      <h2 id="pin-access-title">
        {identity
          ? messages.activeTitle
          : configured
            ? messages.unlockTitle
            : messages.setupTitle}
      </h2>
      {identity ? (
        <>
          <div className="pin-status">
            <p role="status">{messages.unlocked}</p>
            <button
              className="pin-action"
              type="button"
              onClick={() => onIdentityChange(null)}
            >
              {messages.lockAction}
            </button>
          </div>
          <div className="decoy-setup">
            <button
              className="pin-secondary-action"
              type="button"
              aria-expanded={showDecoyForm}
              onClick={() => {
                setShowDecoyForm((visible) => !visible)
                setDecoyFeedback('')
              }}
            >
              {messages.setupDecoyAction}
            </button>
            {showDecoyForm && (
              <form className="decoy-form" onSubmit={handleDecoySubmit}>
                <h3>{messages.decoyPinTitle}</h3>
                <p>{messages.decoyPinHint}</p>
                <label htmlFor="decoy-pin">{messages.decoyPinLabel}</label>
                <input
                  id="decoy-pin"
                  type="password"
                  inputMode="numeric"
                  autoComplete="new-password"
                  pattern="[0-9]{8,12}"
                  minLength={8}
                  maxLength={12}
                  required
                  value={decoyPin}
                  onChange={(event) => setDecoyPin(event.target.value)}
                />
                <label htmlFor="confirm-decoy-pin">
                  {messages.confirmDecoyPinLabel}
                </label>
                <input
                  id="confirm-decoy-pin"
                  type="password"
                  inputMode="numeric"
                  autoComplete="new-password"
                  pattern="[0-9]{8,12}"
                  minLength={8}
                  maxLength={12}
                  required
                  value={confirmDecoyPin}
                  onChange={(event) => setConfirmDecoyPin(event.target.value)}
                />
                <button
                  className="pin-action"
                  type="submit"
                  disabled={isConfiguringDecoy}
                >
                  {messages.setupDecoyAction}
                </button>
              </form>
            )}
            {decoyFeedback && (
              <p
                className="pin-feedback"
                role={decoySucceeded ? 'status' : 'alert'}
              >
                {decoyFeedback}
              </p>
            )}
          </div>
        </>
      ) : (
        <>
          {!configured && (
            <>
              <p className="pin-notice">{messages.recoveryWarning}</p>
              <p className="pin-notice">{messages.scopeNote}</p>
              <p className="pin-notice">{messages.securityNote}</p>
              <p className="pin-notice">{messages.retryPolicy}</p>
            </>
          )}
          <form
            className="pin-form"
            onSubmit={(event) => void handleSubmit(event)}
          >
            <div className="pin-form-row">
              <div className="pin-field">
                <label htmlFor="pin-input">{messages.inputLabel}</label>
                <input
                  id="pin-input"
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  pattern="[0-9]{8,12}"
                  minLength={8}
                  maxLength={12}
                  required
                  value={pin}
                  aria-describedby="pin-guidance"
                  onChange={(event) => setPin(event.target.value)}
                />
              </div>
              <button
                className="pin-action"
                type="submit"
                disabled={isWorking || remainingSeconds > 0}
              >
                {configured ? messages.unlockAction : messages.createAction}
              </button>
            </div>
            <p id="pin-guidance" className="pin-guidance">
              {messages.inputHint}
            </p>
          </form>
          {remainingSeconds > 0 && (
            <p className="pin-feedback" role="status">
              {messages.lockout.replace('{seconds}', String(remainingSeconds))}
            </p>
          )}
          {feedback && (
            <p className="pin-feedback" role="alert">
              {feedback}
            </p>
          )}
        </>
      )}
    </section>
  )
}

export default PinAccess
