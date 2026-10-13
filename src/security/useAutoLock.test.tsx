import { cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AUTO_LOCK_IDLE_MS, useAutoLock } from './useAutoLock'

function Harness({
  enabled,
  onLock,
  idleMs,
}: {
  enabled: boolean
  onLock: () => void
  idleMs?: number
}) {
  useAutoLock({ enabled, onLock, idleMs })
  return null
}

describe('useAutoLock', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('locks after the idle timeout when enabled', () => {
    const onLock = vi.fn()
    render(<Harness enabled onLock={onLock} />)

    vi.advanceTimersByTime(AUTO_LOCK_IDLE_MS - 1)
    expect(onLock).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    expect(onLock).toHaveBeenCalledTimes(1)
  })

  it('resets the idle timer on activity', () => {
    const onLock = vi.fn()
    render(<Harness enabled onLock={onLock} />)

    vi.advanceTimersByTime(AUTO_LOCK_IDLE_MS - 1)
    window.dispatchEvent(new Event('pointerdown'))
    vi.advanceTimersByTime(AUTO_LOCK_IDLE_MS - 1)
    expect(onLock).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    expect(onLock).toHaveBeenCalledTimes(1)
  })

  it('does not lock when disabled', () => {
    const onLock = vi.fn()
    render(<Harness enabled={false} onLock={onLock} />)

    vi.advanceTimersByTime(AUTO_LOCK_IDLE_MS + 1000)
    expect(onLock).not.toHaveBeenCalled()
  })
})
