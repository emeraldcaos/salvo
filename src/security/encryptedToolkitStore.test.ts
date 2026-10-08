// @vitest-environment node
import 'fake-indexeddb/auto'
import { openDB } from 'idb'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { configureDecoyPin, createPinKey, unlockPinKey } from './pinKey'
import type { PinDependencies } from './pinKey'
import {
  EncryptedRecordError,
  EncryptedToolkitStore,
} from './encryptedToolkitStore'
import type { DBSchema } from 'idb'

interface LegacyDatabase extends DBSchema {
  items: {
    key: string
    value: { id: string; value: unknown }
  }
  'encrypted-items': {
    key: string
    value: { id: string; iv: ArrayBuffer; ciphertext: ArrayBuffer }
  }
  'profile-items': {
    key: string
    value: {
      key: string
      profileId: string
      id: string
      iv: ArrayBuffer
      ciphertext: ArrayBuffer
    }
  }
}

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

const cryptoProvider = globalThis.crypto

async function makePinKey(pin: string, storage = new MemoryStorage()) {
  const dependencies: PinDependencies = { crypto: cryptoProvider, storage }
  const result = await createPinKey(pin, dependencies)
  if (!result.ok)
    throw new Error(`Unable to create test PIN key: ${result.reason}`)
  return { key: result.key, profileId: result.profileId, dependencies }
}

describe('EncryptedToolkitStore', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('encrypts records at rest and only decrypts with the PIN-derived key', async () => {
    const databaseName = 'encrypted-at-rest-test'
    const { key, profileId, dependencies } = await makePinKey('58301942')
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const store = await EncryptedToolkitStore.open(key, {
      crypto: cryptoProvider,
      databaseName,
      profileId,
      role: 'primary',
    })

    await store.put('journal-1', { note: 'private local content' })
    store.close()

    const database = await openDB(databaseName, 3)
    const records = await database.getAll('profile-items')
    const stored = await database.get('profile-items', `${profileId}:journal-1`)
    expect(stored).toBeUndefined()
    expect(records).toHaveLength(1)
    expect(records[0].id).not.toBe('journal-1')
    expect(JSON.stringify(records[0])).not.toContain('journal-1')
    expect(JSON.stringify(records[0])).not.toContain('private local content')
    expect(records[0].ciphertext).toBeInstanceOf(ArrayBuffer)
    database.close()

    const wrongUnlock = await unlockPinKey('58301943', dependencies)
    expect(wrongUnlock).toMatchObject({ ok: false, reason: 'incorrect-pin' })

    const wrongKey = await makePinKey('98765432')
    const wrongStore = await EncryptedToolkitStore.open(wrongKey.key, {
      crypto: cryptoProvider,
      databaseName,
      profileId,
      role: 'primary',
    })
    await expect(wrongStore.get('journal-1')).rejects.toBeInstanceOf(
      EncryptedRecordError,
    )
    wrongStore.close()

    const correctStore = await EncryptedToolkitStore.open(key, {
      crypto: cryptoProvider,
      databaseName,
      profileId,
      role: 'primary',
    })
    await expect(correctStore.get('journal-1')).resolves.toEqual({
      note: 'private local content',
    })
    correctStore.close()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('rejects a record whose ciphertext has been corrupted', async () => {
    const databaseName = 'encrypted-corruption-test'
    const { key, profileId } = await makePinKey('58301942')
    const store = await EncryptedToolkitStore.open(key, {
      crypto: cryptoProvider,
      databaseName,
      profileId,
      role: 'primary',
    })
    await store.put('record-1', { value: 'authenticated' })
    store.close()

    const database = await openDB(databaseName, 3)
    const [record] = await database.getAll('profile-items')
    if (!record) throw new Error('Test record was not written.')
    const damagedCiphertext = new Uint8Array(record.ciphertext.slice(0))
    damagedCiphertext[0] ^= 1
    await database.put('profile-items', {
      ...record,
      ciphertext: damagedCiphertext.buffer,
    })
    database.close()

    const reopenedStore = await EncryptedToolkitStore.open(key, {
      crypto: cryptoProvider,
      databaseName,
      profileId,
      role: 'primary',
    })
    await expect(reopenedStore.get('record-1')).rejects.toBeInstanceOf(
      EncryptedRecordError,
    )
    reopenedStore.close()
  })

  it('keeps records isolated between primary and decoy profile namespaces', async () => {
    const databaseName = 'encrypted-profile-isolation-test'
    const {
      key: primaryKey,
      profileId: primaryProfileId,
      dependencies,
    } = await makePinKey('58301942')
    const configured = await configureDecoyPin(
      '24681357',
      {
        key: primaryKey,
        profileId: primaryProfileId,
        role: 'primary',
      },
      dependencies,
    )
    expect(configured).toEqual({ ok: true })

    const decoyIdentity = await unlockPinKey('24681357', dependencies)
    if (!decoyIdentity.ok) throw new Error('Decoy PIN did not unlock.')

    const primaryStore = await EncryptedToolkitStore.open(primaryKey, {
      crypto: cryptoProvider,
      databaseName,
      profileId: primaryProfileId,
      role: 'primary',
    })
    const decoyStore = await EncryptedToolkitStore.open(decoyIdentity.key, {
      crypto: cryptoProvider,
      databaseName,
      profileId: decoyIdentity.profileId,
      role: 'decoy',
    })

    await expect(decoyStore.list()).resolves.toEqual([])
    await primaryStore.put('primary-record', { text: 'primary only' })
    await decoyStore.put('decoy-record', { text: 'decoy only' })
    await expect(primaryStore.list()).resolves.toEqual([
      { id: 'primary-record', value: { text: 'primary only' } },
    ])
    await expect(decoyStore.list()).resolves.toEqual([
      { id: 'decoy-record', value: { text: 'decoy only' } },
    ])
    await expect(primaryStore.get('decoy-record')).resolves.toBeUndefined()
    await expect(decoyStore.get('primary-record')).resolves.toBeUndefined()
    primaryStore.close()
    decoyStore.close()
  })

  it('migrates legacy plaintext records and clears their original store', async () => {
    const databaseName = 'encrypted-migration-test'
    const legacyDatabase = await openDB<LegacyDatabase>(databaseName, 1, {
      upgrade(database) {
        database.createObjectStore('items', { keyPath: 'id' })
      },
    })
    await legacyDatabase.put('items', {
      id: 'legacy-1',
      value: { note: 'legacy private content' },
    })
    legacyDatabase.close()

    const { key, profileId } = await makePinKey('58301942')
    const store = await EncryptedToolkitStore.open(key, {
      crypto: cryptoProvider,
      databaseName,
      profileId,
      role: 'primary',
    })

    await expect(store.get('legacy-1')).resolves.toEqual({
      note: 'legacy private content',
    })
    store.close()

    const migratedDatabase = await openDB<LegacyDatabase>(databaseName, 3)
    await expect(migratedDatabase.get('items', 'legacy-1')).resolves.toBe(
      undefined,
    )
    const encryptedRecords = await migratedDatabase.getAll('profile-items')
    expect(encryptedRecords).toHaveLength(1)
    expect(JSON.stringify(encryptedRecords[0])).not.toContain('legacy-1')
    expect(JSON.stringify(encryptedRecords[0])).not.toContain(
      'legacy private content',
    )
    migratedDatabase.close()
  })

  it('moves T07 encrypted records into the primary profile namespace', async () => {
    const databaseName = 'encrypted-v2-migration-test'
    const { key, profileId } = await makePinKey('58301942')
    const legacyRecordId = 'opaque-legacy-record'
    const iv = cryptoProvider.getRandomValues(new Uint8Array(12))
    const ciphertext = await cryptoProvider.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv,
        additionalData: new TextEncoder().encode(
          `encrypted-items:${legacyRecordId}`,
        ),
      },
      key,
      new TextEncoder().encode(
        JSON.stringify({
          id: 'previous-record',
          value: { text: 'encrypted before T08' },
        }),
      ),
    )
    const legacyDatabase = await openDB<LegacyDatabase>(databaseName, 2, {
      upgrade(database) {
        database.createObjectStore('items', { keyPath: 'id' })
        database.createObjectStore('encrypted-items', { keyPath: 'id' })
      },
    })
    await legacyDatabase.put('encrypted-items', {
      id: legacyRecordId,
      iv: iv.buffer,
      ciphertext,
    })
    legacyDatabase.close()

    const store = await EncryptedToolkitStore.open(key, {
      crypto: cryptoProvider,
      databaseName,
      profileId,
      role: 'primary',
    })
    await expect(store.get('previous-record')).resolves.toEqual({
      text: 'encrypted before T08',
    })
    store.close()

    const migratedDatabase = await openDB<LegacyDatabase>(databaseName, 3)
    await expect(migratedDatabase.getAll('encrypted-items')).resolves.toEqual(
      [],
    )
    await expect(
      migratedDatabase.getAll('profile-items'),
    ).resolves.toHaveLength(1)
    migratedDatabase.close()
  })

  it('keeps legacy plaintext intact if encryption fails during migration', async () => {
    const databaseName = 'encrypted-migration-failure-test'
    const legacyDatabase = await openDB<LegacyDatabase>(databaseName, 1, {
      upgrade(database) {
        database.createObjectStore('items', { keyPath: 'id' })
      },
    })
    await legacyDatabase.put('items', {
      id: 'legacy-1',
      value: { note: 'keep until encrypted' },
    })
    legacyDatabase.close()

    const { key, profileId } = await makePinKey('58301942')
    const failingCrypto = {
      getRandomValues: cryptoProvider.getRandomValues.bind(cryptoProvider),
      subtle: new Proxy(cryptoProvider.subtle, {
        get(target, property) {
          if (property === 'encrypt') {
            return () => Promise.reject(new Error('Encryption unavailable.'))
          }
          const value = Reflect.get(target, property, target)
          return typeof value === 'function' ? value.bind(target) : value
        },
      }),
    } as Crypto

    await expect(
      EncryptedToolkitStore.open(key, {
        crypto: failingCrypto,
        databaseName,
        profileId,
        role: 'primary',
      }),
    ).rejects.toThrow('Encryption unavailable.')

    const database = await openDB<LegacyDatabase>(databaseName, 3)
    await expect(database.get('items', 'legacy-1')).resolves.toEqual({
      id: 'legacy-1',
      value: { note: 'keep until encrypted' },
    })
    await expect(database.getAll('profile-items')).resolves.toEqual([])
    database.close()
  })
})
