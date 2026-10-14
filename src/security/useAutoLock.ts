import { useEffect, useEffectEvent, useRef } from 'react'

/** Idle time before an unlocked session locks. */
export const AUTO_LOCK_IDLE_MS = 2 * 60 * 1000

const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  'pointerdown',
  'keydown',
  'touchstart',
  'mousemove',
  'scroll',
  'wheel',
]

type UseAutoLockOptions = {
  enabled: boolean
  onLock: () => void
  idleMs?: number
}

/** Locks after idleMs without pointer, keyboard, touch, or scroll activity. */
export function useAutoLock({
  enabled,
  onLock,
  idleMs = AUTO_LOCK_IDLE_MS,
}: UseAutoLockOptions): void {
  const timerRef = useRef<number | null>(null)
  const lock = useEffectEvent(onLock)

  useEffect(() => {
    if (!enabled) {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current)
        timerRef.current = null
      }
      return
    }

    const resetIdle = () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current)
      timerRef.current = window.setTimeout(() => {
        lock()
      }, idleMs)
    }

    resetIdle()
    for (const eventName of ACTIVITY_EVENTS) {
      window.addEventListener(eventName, resetIdle, { passive: true })
    }

    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current)
      for (const eventName of ACTIVITY_EVENTS) {
        window.removeEventListener(eventName, resetIdle)
      }
    }
  }, [enabled, idleMs])
}
