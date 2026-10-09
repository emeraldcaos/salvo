// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  configureDecoyPin,
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

async function writeLegacyPinConfig(pin: string, storage: Storage) {
  const crypto = globalThis.crypto
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const pinMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(pin),
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 600_000 },
    pinMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt'],
  )
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode('salvo-pin-key-check-v1'),
  )
  const toBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes))
  storage.setItem(
    'salvo.pin-key.v1',
    JSON.stringify({
      version: 1,
      salt: toBase64(salt),
      iv: toBase64(iv),
      ciphertext: toBase64(new Uint8Array(ciphertext)),
    }),
  )
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

  it('migrates a v1 verifier without changing the primary PIN', async () => {
    const storage = new MemoryStorage()
    const dependencies: PinDependencies = {
      crypto: globalThis.crypto,
      storage,
    }
    await writeLegacyPinConfig('58301942', storage)

    const wrongPin = await unlockPinKey('58301943', dependencies)
    expect(wrongPin).toMatchObject({ ok: false, reason: 'incorrect-pin' })
    expect(
      JSON.parse(storage.getItem('salvo.pin-key.v1') ?? '{}'),
    ).toMatchObject({ version: 1 })

    const unlocked = await unlockPinKey('58301942', dependencies)

    expect(unlocked).toMatchObject({ ok: true, role: 'primary' })
    expect(
      JSON.parse(storage.getItem('salvo.pin-key.v1') ?? '{}'),
    ).toMatchObject({ version: 2 })
  })

  it('configures a distinct decoy PIN and opens a separate profile identity', async () => {
    const dependencies: PinDependencies = {
      crypto: globalThis.crypto,
      storage: new MemoryStorage(),
    }
    const primary = await createPinKey('58301942', dependencies)
    expect(primary.ok).toBe(true)
    if (!primary.ok) return

    await expect(
      configureDecoyPin('58301942', primary, dependencies),
    ).resolves.toEqual({ ok: false, reason: 'pin-already-used' })
    await expect(
      configureDecoyPin('24681357', primary, dependencies),
    ).resolves.toEqual({ ok: true })
    const storedConfig = dependencies.storage.getItem('salvo.pin-key.v1') ?? ''
    expect(storedConfig).not.toContain('primary')
    expect(storedConfig).not.toContain('decoy')

    const primaryUnlock = await unlockPinKey('58301942', dependencies)
    const decoyUnlock = await unlockPinKey('24681357', dependencies)
    expect(primaryUnlock).toMatchObject({ ok: true, role: 'primary' })
    expect(decoyUnlock).toMatchObject({ ok: true, role: 'decoy' })
    if (primaryUnlock.ok && decoyUnlock.ok) {
      expect(primaryUnlock.profileId).not.toBe(decoyUnlock.profileId)
      await expect(
        configureDecoyPin('13572468', decoyUnlock, dependencies),
      ).resolves.toEqual({ ok: true })
    }

    expect(await unlockPinKey('58301942', dependencies)).toMatchObject({
      ok: true,
      role: 'primary',
    })
    expect(await unlockPinKey('24681357', dependencies)).toMatchObject({
      ok: false,
      reason: 'incorrect-pin',
    })
    const rotatedDecoy = await unlockPinKey('13572468', dependencies)
    expect(rotatedDecoy).toMatchObject({
      ok: true,
      role: 'decoy',
    })
    if (decoyUnlock.ok && rotatedDecoy.ok) {
      expect(rotatedDecoy.profileId).toBe(decoyUnlock.profileId)
    }
  })

  it('performs two derivations and verifier checks for either PIN outcome', async () => {
    const dependencies: PinDependencies = {
      crypto: globalThis.crypto,
      storage: new MemoryStorage(),
    }
    const primary = await createPinKey('58301942', dependencies)
    if (!primary.ok) throw new Error('Primary PIN setup failed.')
    await configureDecoyPin('24681357', primary, dependencies)
    const deriveSpy = vi.spyOn(globalThis.crypto.subtle, 'deriveKey')
    const decryptSpy = vi.spyOn(globalThis.crypto.subtle, 'decrypt')

    for (const [pin, role] of [
      ['58301942', 'primary'],
      ['24681357', 'decoy'],
      ['11111111', null],
    ] as const) {
      deriveSpy.mockClear()
      decryptSpy.mockClear()
      const result = await unlockPinKey(pin, dependencies)
      expect(deriveSpy).toHaveBeenCalledTimes(2)
      expect(decryptSpy).toHaveBeenCalledTimes(2)
      if (role) expect(result).toMatchObject({ ok: true, role })
      else expect(result).toMatchObject({ ok: false, reason: 'incorrect-pin' })
    }
  })
})
