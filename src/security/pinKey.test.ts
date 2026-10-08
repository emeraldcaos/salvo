// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createPinKey,
  getPinLockoutRemainingMs,
  getPinRetryDelayMs,
  hasPinConfiguration,
  unlockPinKey,
} from './pinKey'
import type { PinDependencies } from './pinKey'

class MemoryStorage implements Storage {
  private values = new Map<string, string>()

  get length() {
    return this.values.size
  }

  clear() {
    this.values.clear()
  }

  getItem(key: string) {
    return this.values.get(key) ?? null
  }

  key(index: number) {
    return Array.from(this.values.keys())[index] ?? null
  }

  removeItem(key: string) {
    this.values.delete(key)
  }

  setItem(key: string, value: string) {
    this.values.set(key, String(value))
  }
}

describe('PIN key derivation', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('creates and unlocks a non-exportable key without storing the PIN', async () => {
    const dependencies: PinDependencies = {
      crypto: globalThis.crypto,
      storage: new MemoryStorage(),
    }
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    const created = await createPinKey('58301942', dependencies)
    expect(created.ok).toBe(true)
    if (!created.ok) return
    expect(created.key.extractable).toBe(false)

    const stored = dependencies.storage.getItem('salvo.pin-key.v1')
    expect(stored).not.toContain('58301942')
    expect(hasPinConfiguration(dependencies)).toBe(true)

    const unlocked = await unlockPinKey('58301942', dependencies)
    expect(unlocked.ok).toBe(true)
    if (unlocked.ok) expect(unlocked.key.extractable).toBe(false)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('rejects an incorrect PIN and increases the persisted delay', async () => {
    let now = 1_000
    const dependencies: PinDependencies = {
      crypto: globalThis.crypto,
      storage: new MemoryStorage(),
      now: () => now,
    }
    await createPinKey('58301942', dependencies)

    let result
    for (let attempt = 0; attempt < 5; attempt += 1) {
      result = await unlockPinKey('58301943', dependencies)
    }

    expect(result).toEqual({
      ok: false,
      reason: 'incorrect-pin',
      retryAfterMs: 30_000,
    })
    expect(getPinLockoutRemainingMs(dependencies, now)).toBe(30_000)
    expect(await unlockPinKey('58301942', dependencies)).toEqual({
      ok: false,
      reason: 'locked',
      retryAfterMs: 30_000,
    })

    now += 30_000
    expect(await unlockPinKey('58301943', dependencies)).toEqual({
      ok: false,
      reason: 'incorrect-pin',
      retryAfterMs: 60_000,
    })
  })

  it('backs off after five failures and caps the delay at fifteen minutes', () => {
    expect(getPinRetryDelayMs(4)).toBe(0)
    expect(getPinRetryDelayMs(5)).toBe(30_000)
    expect(getPinRetryDelayMs(6)).toBe(60_000)
    expect(getPinRetryDelayMs(20)).toBe(15 * 60_000)
  })
})
