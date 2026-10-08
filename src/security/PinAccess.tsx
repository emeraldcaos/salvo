import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type { LocaleMessages } from '../i18n/types'
import {
  createPinKey,
  getPinLockoutRemainingMs,
  hasPinConfiguration,
  unlockPinKey,
} from './pinKey'
import { EncryptedToolkitStore } from './encryptedToolkitStore'

interface PinAccessProps {
  messages: LocaleMessages['pin']
  encryptionKey: CryptoKey | null
  onKeyChange: (key: CryptoKey | null) => void
}

function PinAccess({ messages, encryptionKey, onKeyChange }: PinAccessProps) {
  const [configured, setConfigured] = useState(hasPinConfiguration)
  const [pin, setPin] = useState('')
  const [feedback, setFeedback] = useState('')
  const [isWorking, setIsWorking] = useState(false)
  const [lockedUntil, setLockedUntil] = useState(
    () => Date.now() + getPinLockoutRemainingMs(),
  )
  const [clockNow, setClockNow] = useState(Date.now)
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
        const store = await EncryptedToolkitStore.open(result.key)
        store.close()
        onKeyChange(result.key)
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

  return (
    <section className="pin-access" aria-labelledby="pin-access-title">
      <h2 id="pin-access-title">
        {encryptionKey
          ? messages.activeTitle
          : configured
            ? messages.unlockTitle
            : messages.setupTitle}
      </h2>
      {encryptionKey ? (
        <div className="pin-status">
          <p role="status">{messages.unlocked}</p>
          <button
            className="pin-action"
            type="button"
            onClick={() => onKeyChange(null)}
          >
            {messages.lockAction}
          </button>
        </div>
      ) : (
        <>
          <p className="pin-notice">{messages.recoveryWarning}</p>
          <p className="pin-notice">{messages.scopeNote}</p>
          <p className="pin-notice">{messages.securityNote}</p>
          <p className="pin-notice">{messages.retryPolicy}</p>
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
