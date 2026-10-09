import { openDB } from 'idb'
import type { DBSchema, IDBPDatabase } from 'idb'

const DATABASE_NAME = 'salvo-toolkit'
const DATABASE_VERSION = 3
const LEGACY_PLAINTEXT_STORE = 'items'
const LEGACY_ENCRYPTED_STORE = 'encrypted-items'
const PROFILE_STORE = 'profile-items'

interface LegacyItem {
  id: string
  value: unknown
}

interface EncryptedItem {
  key: string
  profileId: string
  id: string
  iv: ArrayBuffer
  ciphertext: ArrayBuffer
}

interface LegacyEncryptedItem {
  id: string
  iv: ArrayBuffer
  ciphertext: ArrayBuffer
}

interface ToolkitDatabase extends DBSchema {
  items: {
    key: string
    value: LegacyItem
  }
  'encrypted-items': {
    key: string
    value: LegacyEncryptedItem
  }
  'profile-items': {
    key: string
    value: EncryptedItem
  }
}

export interface EncryptedToolkitStoreOptions {
  profileId: string
  role: 'primary' | 'decoy'
  crypto?: Crypto
  databaseName?: string
}

export class EncryptedRecordError extends Error {
  constructor() {
    super('The record could not be authenticated or decoded.')
    this.name = 'EncryptedRecordError'
  }
}

function serializeValue(value: unknown): Uint8Array<ArrayBuffer> {
  const serialized = JSON.stringify(value)
  if (serialized === undefined) {
    throw new TypeError('Toolkit records must be JSON serializable.')
  }
  return new TextEncoder().encode(serialized)
}

function additionalData(
  profileId: string,
  id: string,
): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(`${PROFILE_STORE}:${profileId}:${id}`)
}

function createOpaqueId(crypto: Crypto): string {
  const bytes = crypto.getRandomValues(new Uint8Array(new ArrayBuffer(16)))
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join(
    '',
  )
}

async function encryptItem(
  id: string,
  value: unknown,
  key: CryptoKey,
  crypto: Crypto,
  profileId: string,
): Promise<EncryptedItem> {
  if (
    value === undefined ||
    typeof value === 'function' ||
    typeof value === 'symbol'
  ) {
    throw new TypeError('Toolkit values must be JSON serializable.')
  }
  const storageId = createOpaqueId(crypto)
  const iv = crypto.getRandomValues(new Uint8Array(new ArrayBuffer(12)))
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
      additionalData: additionalData(profileId, storageId),
    },
    key,
    serializeValue({ id, value }),
  )

  return {
    key: `${profileId}:${storageId}`,
    profileId,
    id: storageId,
    iv: iv.buffer,
    ciphertext,
  }
}

async function decryptItem<T>(
  item: EncryptedItem,
  key: CryptoKey,
  crypto: Crypto,
): Promise<{ id: string; value: T }> {
  try {
    const plaintext = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: item.iv,
        additionalData: additionalData(item.profileId, item.id),
      },
      key,
      item.ciphertext,
    )
    const payload = JSON.parse(new TextDecoder().decode(plaintext)) as {
      id?: unknown
      value?: T
    }
    if (typeof payload.id !== 'string' || !('value' in payload)) {
      throw new EncryptedRecordError()
    }
    return { id: payload.id, value: payload.value as T }
  } catch {
    throw new EncryptedRecordError()
  }
}

type ToolkitDatabaseHandle = IDBPDatabase<ToolkitDatabase>

async function decryptLegacyEncryptedItem<T>(
  item: LegacyEncryptedItem,
  key: CryptoKey,
  crypto: Crypto,
): Promise<{ id: string; value: T }> {
  try {
    const plaintext = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: item.iv,
        additionalData: new TextEncoder().encode(
          `${LEGACY_ENCRYPTED_STORE}:${item.id}`,
        ),
      },
      key,
      item.ciphertext,
    )
    const payload = JSON.parse(new TextDecoder().decode(plaintext)) as {
      id?: unknown
      value?: T
    }
    if (typeof payload.id !== 'string' || !('value' in payload)) {
      throw new EncryptedRecordError()
    }
    return { id: payload.id, value: payload.value as T }
  } catch {
    throw new EncryptedRecordError()
  }
}

async function migrateLegacyItems(
  database: ToolkitDatabaseHandle,
  key: CryptoKey,
  crypto: Crypto,
  profileId: string,
  role: 'primary' | 'decoy',
): Promise<void> {
  const hasPlaintext = database.objectStoreNames.contains(
    LEGACY_PLAINTEXT_STORE,
  )
  const hasEncrypted = database.objectStoreNames.contains(
    LEGACY_ENCRYPTED_STORE,
  )
  const [legacyItems, legacyEncryptedItems] = await Promise.all([
    hasPlaintext ? database.getAll(LEGACY_PLAINTEXT_STORE) : [],
    hasEncrypted ? database.getAll(LEGACY_ENCRYPTED_STORE) : [],
  ])
  if (role !== 'primary') return
  if (legacyItems.length === 0 && legacyEncryptedItems.length === 0) return

  const decryptedItems = await Promise.all(
    legacyEncryptedItems.map((item) =>
      decryptLegacyEncryptedItem<unknown>(item, key, crypto),
    ),
  )
  const records = [...legacyItems, ...decryptedItems]

  const encryptedItems = await Promise.all(
    records.map((item) => {
      if (typeof item.id !== 'string' || item.id.length === 0) {
        throw new Error('A legacy toolkit record has an invalid ID.')
      }
      return encryptItem(item.id, item.value, key, crypto, profileId)
    }),
  )
  const transaction = database.transaction(
    [LEGACY_PLAINTEXT_STORE, LEGACY_ENCRYPTED_STORE, PROFILE_STORE],
    'readwrite',
  )
  const profileStore = transaction.objectStore(PROFILE_STORE)

  await Promise.all(encryptedItems.map((item) => profileStore.put(item)))
  await transaction.objectStore(LEGACY_PLAINTEXT_STORE).clear()
  await transaction.objectStore(LEGACY_ENCRYPTED_STORE).clear()
  await transaction.done
}

export class EncryptedToolkitStore {
  private readonly database: ToolkitDatabaseHandle
  private readonly key: CryptoKey
  private readonly crypto: Crypto
  private readonly profileId: string

  private constructor(
    database: ToolkitDatabaseHandle,
    key: CryptoKey,
    crypto: Crypto,
    profileId: string,
  ) {
    this.database = database
    this.key = key
    this.crypto = crypto
    this.profileId = profileId
  }

  static async open(
    key: CryptoKey,
    options: EncryptedToolkitStoreOptions,
  ): Promise<EncryptedToolkitStore> {
    if (!options.profileId) {
      throw new TypeError('An opaque profile ID is required.')
    }
    const crypto = options.crypto ?? globalThis.crypto
    const indexedDB = globalThis.indexedDB
    if (!crypto?.subtle || !indexedDB) {
      throw new Error('Web Crypto and IndexedDB are required.')
    }

    const database = await openDB<ToolkitDatabase>(
      options.databaseName ?? DATABASE_NAME,
      DATABASE_VERSION,
      {
        upgrade(upgradedDatabase) {
          if (
            !upgradedDatabase.objectStoreNames.contains(LEGACY_PLAINTEXT_STORE)
          ) {
            upgradedDatabase.createObjectStore(LEGACY_PLAINTEXT_STORE, {
              keyPath: 'id',
            })
          }
          if (
            !upgradedDatabase.objectStoreNames.contains(LEGACY_ENCRYPTED_STORE)
          ) {
            upgradedDatabase.createObjectStore(LEGACY_ENCRYPTED_STORE, {
              keyPath: 'id',
            })
          }
          if (!upgradedDatabase.objectStoreNames.contains(PROFILE_STORE)) {
            upgradedDatabase.createObjectStore(PROFILE_STORE, {
              keyPath: 'key',
            })
          }
        },
      },
    )

    try {
      await migrateLegacyItems(
        database,
        key,
        crypto,
        options.profileId,
        options.role,
      )
      return new EncryptedToolkitStore(database, key, crypto, options.profileId)
    } catch (error) {
      database.close()
      throw error
    }
  }

  async get<T>(id: string): Promise<T | undefined> {
    const items = await this.database.getAll(PROFILE_STORE)
    for (const item of items) {
      if (item.profileId !== this.profileId) continue
      const payload = await decryptItem<T>(item, this.key, this.crypto)
      if (payload.id === id) return payload.value
    }
    return undefined
  }

  async put<T>(id: string, value: T): Promise<void> {
    if (!id) throw new TypeError('Toolkit record IDs cannot be empty.')
    const items = await this.database.getAll(PROFILE_STORE)
    let existingItem: EncryptedItem | undefined
    for (const item of items) {
      if (item.profileId !== this.profileId) continue
      const payload = await decryptItem<unknown>(item, this.key, this.crypto)
      if (payload.id === id) {
        existingItem = item
        break
      }
    }
    const item = await encryptItem(
      id,
      value,
      this.key,
      this.crypto,
      this.profileId,
    )
    const transaction = this.database.transaction(PROFILE_STORE, 'readwrite')
    if (existingItem) await transaction.store.delete(existingItem.key)
    await transaction.store.put(item)
    await transaction.done
  }

  async delete(id: string): Promise<void> {
    const items = await this.database.getAll(PROFILE_STORE)
    for (const item of items) {
      if (item.profileId !== this.profileId) continue
      const payload = await decryptItem<unknown>(item, this.key, this.crypto)
      if (payload.id === id) {
        await this.database.delete(PROFILE_STORE, item.key)
        return
      }
    }
  }

  async list<T>(): Promise<Array<{ id: string; value: T }>> {
    const items = await this.database.getAll(PROFILE_STORE)
    return Promise.all(
      items
        .filter((item) => item.profileId === this.profileId)
        .map((item) => decryptItem<T>(item, this.key, this.crypto)),
    )
  }

  close(): void {
    this.database.close()
  }
}
