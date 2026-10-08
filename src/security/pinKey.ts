const CONFIG_KEY = 'salvo.pin-key.v1'
const LOCKOUT_KEY = 'salvo.pin-lockout.v1'
const PBKDF2_ITERATIONS = 600_000
const MAX_LOCKOUT_MS = 15 * 60 * 1000
const VERIFICATION_TEXT = 'salvo-pin-key-check-v1'

export const MIN_PIN_LENGTH = 8
export const MAX_PIN_LENGTH = 12

export interface PinDependencies {
  crypto: Crypto
  storage: Storage
  now?: () => number
}

export type PinResult =
  | { ok: true; key: CryptoKey }
  | {
      ok: false
      reason:
        | 'invalid-pin'
        | 'already-configured'
        | 'not-configured'
        | 'locked'
        | 'incorrect-pin'
        | 'corrupt-record'
        | 'unavailable'
      retryAfterMs?: number
    }

interface PinRecord {
  version: 1
  salt: string
  iv: string
  ciphertext: string
}

interface LockoutRecord {
  failures: number
  lockedUntil: number
}

function getBrowserDependencies(): PinDependencies | null {
  try {
    if (!globalThis.crypto?.subtle || !globalThis.localStorage) return null
    return { crypto: globalThis.crypto, storage: globalThis.localStorage }
  } catch {
    return null
  }
}

function isValidPin(pin: string): boolean {
  return (
    pin.length >= MIN_PIN_LENGTH &&
    pin.length <= MAX_PIN_LENGTH &&
    /^\d+$/.test(pin)
  )
}

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value)
  const bytes = new Uint8Array(new ArrayBuffer(binary.length))
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes
}

function readPinRecord(storage: Storage): PinRecord | null | 'corrupt' {
  const value = storage.getItem(CONFIG_KEY)
  if (value === null) return null

  try {
    const record = JSON.parse(value) as Partial<PinRecord>
    if (
      record.version !== 1 ||
      typeof record.salt !== 'string' ||
      typeof record.iv !== 'string' ||
      typeof record.ciphertext !== 'string'
    ) {
      return 'corrupt'
    }
    return record as PinRecord
  } catch {
    return 'corrupt'
  }
}

function readLockout(storage: Storage): LockoutRecord {
  try {
    const value = storage.getItem(LOCKOUT_KEY)
    if (value === null) return { failures: 0, lockedUntil: 0 }
    const record = JSON.parse(value) as Partial<LockoutRecord>
    if (
      typeof record.failures !== 'number' ||
      typeof record.lockedUntil !== 'number'
    ) {
      return { failures: 0, lockedUntil: 0 }
    }
    return { failures: record.failures, lockedUntil: record.lockedUntil }
  } catch {
    return { failures: 0, lockedUntil: 0 }
  }
}

export function getPinRetryDelayMs(failureCount: number): number {
  if (failureCount < 5) return 0
  return Math.min(MAX_LOCKOUT_MS, 30_000 * 2 ** (failureCount - 5))
}

export function getPinLockoutRemainingMs(
  dependencies: PinDependencies | null = getBrowserDependencies(),
  now = Date.now(),
): number {
  if (!dependencies) return 0
  try {
    return Math.max(0, readLockout(dependencies.storage).lockedUntil - now)
  } catch {
    return 0
  }
}

export function hasPinConfiguration(
  dependencies: PinDependencies | null = getBrowserDependencies(),
): boolean {
  if (!dependencies) return false
  try {
    return dependencies.storage.getItem(CONFIG_KEY) !== null
  } catch {
    return false
  }
}

async function deriveAesKey(
  pin: string,
  salt: Uint8Array<ArrayBuffer>,
  crypto: Crypto,
): Promise<CryptoKey> {
  const pinMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(pin),
    'PBKDF2',
    false,
    ['deriveKey'],
  )

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt,
      iterations: PBKDF2_ITERATIONS,
    },
    pinMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export async function createPinKey(
  pin: string,
  dependencies: PinDependencies | null = getBrowserDependencies(),
): Promise<PinResult> {
  if (!isValidPin(pin)) return { ok: false, reason: 'invalid-pin' }
  if (!dependencies) return { ok: false, reason: 'unavailable' }

  try {
    const currentRecord = readPinRecord(dependencies.storage)
    if (currentRecord === 'corrupt') {
      return { ok: false, reason: 'corrupt-record' }
    }
    if (currentRecord) return { ok: false, reason: 'already-configured' }

    const salt = dependencies.crypto.getRandomValues(new Uint8Array(16))
    const iv = dependencies.crypto.getRandomValues(new Uint8Array(12))
    const key = await deriveAesKey(pin, salt, dependencies.crypto)
    const ciphertext = await dependencies.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      new TextEncoder().encode(VERIFICATION_TEXT),
    )

    const record: PinRecord = {
      version: 1,
      salt: toBase64(salt),
      iv: toBase64(iv),
      ciphertext: toBase64(new Uint8Array(ciphertext)),
    }
    dependencies.storage.setItem(CONFIG_KEY, JSON.stringify(record))
    dependencies.storage.removeItem(LOCKOUT_KEY)
    return { ok: true, key }
  } catch {
    return { ok: false, reason: 'unavailable' }
  }
}

function recordFailedAttempt(
  dependencies: PinDependencies,
  now: number,
): number {
  const previous = readLockout(dependencies.storage)
  const failures = previous.failures + 1
  const retryAfterMs = getPinRetryDelayMs(failures)
  dependencies.storage.setItem(
    LOCKOUT_KEY,
    JSON.stringify({ failures, lockedUntil: now + retryAfterMs }),
  )
  return retryAfterMs
}

export async function unlockPinKey(
  pin: string,
  dependencies: PinDependencies | null = getBrowserDependencies(),
): Promise<PinResult> {
  if (!isValidPin(pin)) return { ok: false, reason: 'invalid-pin' }
  if (!dependencies) return { ok: false, reason: 'unavailable' }

  try {
    const now = dependencies.now?.() ?? Date.now()
    const previous = readLockout(dependencies.storage)
    const retryAfterMs = Math.max(0, previous.lockedUntil - now)
    if (retryAfterMs > 0) {
      return { ok: false, reason: 'locked', retryAfterMs }
    }

    const record = readPinRecord(dependencies.storage)
    if (record === 'corrupt') {
      return { ok: false, reason: 'corrupt-record' }
    }
    if (!record) return { ok: false, reason: 'not-configured' }

    const key = await deriveAesKey(
      pin,
      fromBase64(record.salt),
      dependencies.crypto,
    )
    const plaintext = await dependencies.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromBase64(record.iv) },
      key,
      fromBase64(record.ciphertext),
    )
    if (new TextDecoder().decode(plaintext) !== VERIFICATION_TEXT) {
      const delay = recordFailedAttempt(dependencies, now)
      return { ok: false, reason: 'incorrect-pin', retryAfterMs: delay }
    }

    dependencies.storage.removeItem(LOCKOUT_KEY)
    return { ok: true, key }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'OperationError') {
      try {
        const now = dependencies.now?.() ?? Date.now()
        const retryAfterMs = recordFailedAttempt(dependencies, now)
        return { ok: false, reason: 'incorrect-pin', retryAfterMs }
      } catch {
        return { ok: false, reason: 'unavailable' }
      }
    }
    return { ok: false, reason: 'unavailable' }
  }
}
