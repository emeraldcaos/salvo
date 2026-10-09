const CONFIG_KEY = 'salvo.pin-key.v1'
const LOCKOUT_KEY = 'salvo.pin-lockout.v1'
const PBKDF2_ITERATIONS = 600_000
const MAX_LOCKOUT_MS = 15 * 60 * 1000
const VERIFIER_SIZE = 17
const LEGACY_VERIFICATION_TEXT = 'salvo-pin-key-check-v1'

export const MIN_PIN_LENGTH = 8
export const MAX_PIN_LENGTH = 12

export type PinProfileRole = 'primary' | 'decoy'

export interface PinIdentity {
  key: CryptoKey
  profileId: string
  role: PinProfileRole
}

export interface PinDependencies {
  crypto: Crypto
  storage: Storage
  now?: () => number
}

type PinErrorReason =
  | 'invalid-pin'
  | 'already-configured'
  | 'not-configured'
  | 'locked'
  | 'incorrect-pin'
  | 'pin-already-used'
  | 'not-active-profile'
  | 'corrupt-record'
  | 'unavailable'

export type PinResult =
  | ({ ok: true } & PinIdentity)
  | { ok: false; reason: PinErrorReason; retryAfterMs?: number }

interface CredentialRecord {
  salt: string
  iv: string
  ciphertext: string
}

interface LegacyPinRecord extends CredentialRecord {
  version: 1
}

interface PinConfigV2 {
  version: 2
  credentials: [CredentialRecord, CredentialRecord]
}

type PinConfig = LegacyPinRecord | PinConfigV2

interface LockoutRecord {
  failures: number
  lockedUntil: number
}

type VerifiedCredential = PinIdentity

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

function randomHex(crypto: Crypto, length: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(new ArrayBuffer(length)))
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join(
    '',
  )
}

async function deriveDecoyProfileId(
  primaryProfileId: string,
  crypto: Crypto,
): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`salvo-decoy-profile:${primaryProfileId}`),
  )
  return Array.from(new Uint8Array(digest).slice(0, 16), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('')
}

function readPinConfig(storage: Storage): PinConfig | null | 'corrupt' {
  const value = storage.getItem(CONFIG_KEY)
  if (value === null) return null

  try {
    const record = JSON.parse(value) as Record<string, unknown>
    if (
      record.version === 1 &&
      typeof record.salt === 'string' &&
      typeof record.iv === 'string' &&
      typeof record.ciphertext === 'string'
    ) {
      return record as unknown as LegacyPinRecord
    }
    if (
      record.version === 2 &&
      Array.isArray(record.credentials) &&
      record.credentials.length === 2 &&
      record.credentials.every(
        (credential: unknown) =>
          credential !== null &&
          typeof credential === 'object' &&
          typeof (credential as CredentialRecord).salt === 'string' &&
          typeof (credential as CredentialRecord).iv === 'string' &&
          typeof (credential as CredentialRecord).ciphertext === 'string',
      )
    ) {
      return record as unknown as PinConfigV2
    }
    return 'corrupt'
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

function encodeVerifier(
  role: PinProfileRole,
  profileId: string,
): Uint8Array<ArrayBuffer> {
  const payload = new Uint8Array(new ArrayBuffer(VERIFIER_SIZE))
  payload[0] = role === 'primary' ? 1 : 2
  for (let index = 0; index < 16; index += 1) {
    payload[index + 1] = Number.parseInt(
      profileId.slice(index * 2, index * 2 + 2),
      16,
    )
  }
  return payload
}

function decodeVerifier(payload: Uint8Array): Omit<PinIdentity, 'key'> | null {
  if (payload.length !== VERIFIER_SIZE) return null
  const role = payload[0] === 1 ? 'primary' : payload[0] === 2 ? 'decoy' : null
  if (!role) return null
  const profileId = Array.from(payload.slice(1), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('')
  return { role, profileId }
}

async function createCredential(
  pin: string,
  role: PinProfileRole,
  profileId: string,
  crypto: Crypto,
): Promise<CredentialRecord> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveAesKey(pin, salt, crypto)
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encodeVerifier(role, profileId),
  )
  return {
    salt: toBase64(salt),
    iv: toBase64(iv),
    ciphertext: toBase64(new Uint8Array(ciphertext)),
  }
}

async function createDummyCredential(
  crypto: Crypto,
): Promise<CredentialRecord> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const rawKey = crypto.getRandomValues(new Uint8Array(32))
  const key = await crypto.subtle.importKey(
    'raw',
    rawKey,
    { name: 'AES-GCM' },
    false,
    ['encrypt'],
  )
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    crypto.getRandomValues(new Uint8Array(VERIFIER_SIZE)),
  )
  return {
    salt: toBase64(salt),
    iv: toBase64(iv),
    ciphertext: toBase64(new Uint8Array(ciphertext)),
  }
}

async function upgradePinConfig(
  config: LegacyPinRecord,
  pin: string,
  dependencies: PinDependencies,
): Promise<PinIdentity | null> {
  const salt = fromBase64(config.salt)
  const key = await deriveAesKey(pin, salt, dependencies.crypto)
  let plaintext: ArrayBuffer
  try {
    plaintext = await dependencies.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromBase64(config.iv) },
      key,
      fromBase64(config.ciphertext),
    )
  } catch (error) {
    if (error instanceof DOMException && error.name === 'OperationError') {
      return null
    }
    throw error
  }
  if (new TextDecoder().decode(plaintext) !== LEGACY_VERIFICATION_TEXT) {
    return null
  }

  const profileId = randomHex(dependencies.crypto, 16)
  const iv = dependencies.crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await dependencies.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encodeVerifier('primary', profileId),
  )
  const primary: CredentialRecord = {
    salt: config.salt,
    iv: toBase64(iv),
    ciphertext: toBase64(new Uint8Array(ciphertext)),
  }
  const dummy = await createDummyCredential(dependencies.crypto)
  const credentials: [CredentialRecord, CredentialRecord] =
    dependencies.crypto.getRandomValues(new Uint8Array(1))[0] & 1
      ? [dummy, primary]
      : [primary, dummy]
  const upgraded: PinConfigV2 = { version: 2, credentials }
  dependencies.storage.setItem(CONFIG_KEY, JSON.stringify(upgraded))
  dependencies.storage.removeItem(LOCKOUT_KEY)
  return { key, profileId, role: 'primary' }
}

async function verifyCredentials(
  pin: string,
  config: PinConfigV2,
  crypto: Crypto,
): Promise<{ match: VerifiedCredential | null; ambiguous: boolean }> {
  let match: VerifiedCredential | null = null
  let matchCount = 0

  for (const credential of config.credentials) {
    try {
      const key = await deriveAesKey(pin, fromBase64(credential.salt), crypto)
      const plaintext = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: fromBase64(credential.iv) },
        key,
        fromBase64(credential.ciphertext),
      )
      const identity = decodeVerifier(new Uint8Array(plaintext))
      if (identity) {
        match = { key, ...identity }
        matchCount += 1
      }
    } catch {
      continue
    }
  }

  return { match: matchCount === 1 ? match : null, ambiguous: matchCount > 1 }
}

async function findActiveProfileSlot(
  activeProfile: PinIdentity,
  config: PinConfigV2,
  crypto: Crypto,
): Promise<number | null> {
  let activeSlot: number | null = null
  for (let index = 0; index < config.credentials.length; index += 1) {
    const credential = config.credentials[index]
    try {
      const plaintext = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: fromBase64(credential.iv) },
        activeProfile.key,
        fromBase64(credential.ciphertext),
      )
      const identity = decodeVerifier(new Uint8Array(plaintext))
      if (
        identity?.role === activeProfile.role &&
        identity.profileId === activeProfile.profileId
      ) {
        activeSlot = index
      }
    } catch {
      continue
    }
  }
  return activeSlot
}

export async function createPinKey(
  pin: string,
  dependencies: PinDependencies | null = getBrowserDependencies(),
): Promise<PinResult> {
  if (!isValidPin(pin)) return { ok: false, reason: 'invalid-pin' }
  if (!dependencies) return { ok: false, reason: 'unavailable' }

  try {
    const currentRecord = readPinConfig(dependencies.storage)
    if (currentRecord === 'corrupt') {
      return { ok: false, reason: 'corrupt-record' }
    }
    if (currentRecord) return { ok: false, reason: 'already-configured' }

    const profileId = randomHex(dependencies.crypto, 16)
    const primary = await createCredential(
      pin,
      'primary',
      profileId,
      dependencies.crypto,
    )
    const dummy = await createDummyCredential(dependencies.crypto)
    const credentials: [CredentialRecord, CredentialRecord] =
      dependencies.crypto.getRandomValues(new Uint8Array(1))[0] & 1
        ? [dummy, primary]
        : [primary, dummy]
    const config: PinConfigV2 = { version: 2, credentials }
    dependencies.storage.setItem(CONFIG_KEY, JSON.stringify(config))
    dependencies.storage.removeItem(LOCKOUT_KEY)
    const key = await deriveAesKey(
      pin,
      fromBase64(primary.salt),
      dependencies.crypto,
    )
    return { ok: true, key, profileId, role: 'primary' }
  } catch {
    return { ok: false, reason: 'unavailable' }
  }
}

export async function configureDecoyPin(
  pin: string,
  activeProfile: PinIdentity,
  dependencies: PinDependencies | null = getBrowserDependencies(),
): Promise<
  { ok: true } | { ok: false; reason: 'invalid-pin' | PinErrorReason }
> {
  if (!isValidPin(pin)) return { ok: false, reason: 'invalid-pin' }
  if (!dependencies) return { ok: false, reason: 'unavailable' }

  try {
    const stored = readPinConfig(dependencies.storage)
    if (!stored || stored === 'corrupt') {
      return { ok: false, reason: 'not-configured' }
    }
    if (stored.version === 1) {
      return { ok: false, reason: 'not-configured' }
    }
    const config = stored
    const activeSlot = await findActiveProfileSlot(
      activeProfile,
      config,
      dependencies.crypto,
    )
    if (activeSlot === null) {
      return { ok: false, reason: 'not-active-profile' }
    }

    const duplicate = await verifyCredentials(pin, config, dependencies.crypto)
    if (duplicate.match || duplicate.ambiguous) {
      return { ok: false, reason: 'pin-already-used' }
    }

    const derivedDecoyProfileId = await deriveDecoyProfileId(
      activeProfile.profileId,
      dependencies.crypto,
    )
    const decoyProfileId =
      activeProfile.role === 'decoy'
        ? activeProfile.profileId
        : derivedDecoyProfileId
    const decoy = await createCredential(
      pin,
      'decoy',
      decoyProfileId,
      dependencies.crypto,
    )
    const targetSlot =
      activeProfile.role === 'primary' ? 1 - activeSlot : activeSlot
    const credentials: [CredentialRecord, CredentialRecord] = [
      config.credentials[0],
      config.credentials[1],
    ]
    credentials[targetSlot] = decoy
    const updated: PinConfigV2 = { version: 2, credentials }
    dependencies.storage.setItem(CONFIG_KEY, JSON.stringify(updated))
    return { ok: true }
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

    const stored = readPinConfig(dependencies.storage)
    if (stored === 'corrupt') {
      return { ok: false, reason: 'corrupt-record' }
    }
    if (!stored) return { ok: false, reason: 'not-configured' }

    if (stored.version === 1) {
      const identity = await upgradePinConfig(stored, pin, dependencies)
      if (!identity) {
        const delay = recordFailedAttempt(dependencies, now)
        return { ok: false, reason: 'incorrect-pin', retryAfterMs: delay }
      }
      return { ok: true, ...identity }
    }
    const config = stored
    const { match, ambiguous } = await verifyCredentials(
      pin,
      config,
      dependencies.crypto,
    )
    if (ambiguous) return { ok: false, reason: 'corrupt-record' }
    if (!match) {
      const delay = recordFailedAttempt(dependencies, now)
      return { ok: false, reason: 'incorrect-pin', retryAfterMs: delay }
    }

    dependencies.storage.removeItem(LOCKOUT_KEY)
    return { ok: true, ...match }
  } catch {
    return { ok: false, reason: 'unavailable' }
  }
}
