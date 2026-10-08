import { openDB } from 'idb'
import type { DBSchema, IDBPDatabase } from 'idb'

const DATABASE_NAME = 'salvo-toolkit'
const DATABASE_VERSION = 2
const LEGACY_STORE = 'items'
const ENCRYPTED_STORE = 'encrypted-items'

interface LegacyItem {
  id: string
  value: unknown
}

interface EncryptedItem {
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
    value: EncryptedItem
  }
}

export interface EncryptedToolkitStoreOptions {
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

function additionalData(id: string): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(`${ENCRYPTED_STORE}:${id}`)
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
    { name: 'AES-GCM', iv, additionalData: additionalData(storageId) },
    key,
    serializeValue({ id, value }),
  )

  return { id: storageId, iv: iv.buffer, ciphertext }
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
        additionalData: additionalData(item.id),
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

async function migrateLegacyItems(
  database: ToolkitDatabaseHandle,
  key: CryptoKey,
  crypto: Crypto,
): Promise<void> {
  if (!database.objectStoreNames.contains(LEGACY_STORE)) return

  const legacyItems = await database.getAll(LEGACY_STORE)
  if (legacyItems.length === 0) return

  const encryptedItems = await Promise.all(
    legacyItems.map((item) => {
      if (typeof item.id !== 'string' || item.id.length === 0) {
        throw new Error('A legacy toolkit record has an invalid ID.')
      }
      return encryptItem(item.id, item.value, key, crypto)
    }),
  )
  const transaction = database.transaction(
    [LEGACY_STORE, ENCRYPTED_STORE],
    'readwrite',
  )
  const encryptedStore = transaction.objectStore(ENCRYPTED_STORE)
  const legacyStore = transaction.objectStore(LEGACY_STORE)

  await Promise.all(encryptedItems.map((item) => encryptedStore.put(item)))
  await legacyStore.clear()
  await transaction.done
}

export class EncryptedToolkitStore {
  private readonly database: ToolkitDatabaseHandle
  private readonly key: CryptoKey
  private readonly crypto: Crypto

  private constructor(
    database: ToolkitDatabaseHandle,
    key: CryptoKey,
    crypto: Crypto,
  ) {
    this.database = database
    this.key = key
    this.crypto = crypto
  }

  static async open(
    key: CryptoKey,
    options: EncryptedToolkitStoreOptions = {},
  ): Promise<EncryptedToolkitStore> {
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
          if (!upgradedDatabase.objectStoreNames.contains(ENCRYPTED_STORE)) {
            upgradedDatabase.createObjectStore(ENCRYPTED_STORE, {
              keyPath: 'id',
            })
          }
        },
      },
    )

    try {
      await migrateLegacyItems(database, key, crypto)
      return new EncryptedToolkitStore(database, key, crypto)
    } catch (error) {
      database.close()
      throw error
    }
  }

  async get<T>(id: string): Promise<T | undefined> {
    const items = await this.database.getAll(ENCRYPTED_STORE)
    for (const item of items) {
      const payload = await decryptItem<T>(item, this.key, this.crypto)
      if (payload.id === id) return payload.value
    }
    return undefined
  }

  async put<T>(id: string, value: T): Promise<void> {
    if (!id) throw new TypeError('Toolkit record IDs cannot be empty.')
    const items = await this.database.getAll(ENCRYPTED_STORE)
    let existingItem: EncryptedItem | undefined
    for (const item of items) {
      const payload = await decryptItem<unknown>(item, this.key, this.crypto)
      if (payload.id === id) {
        existingItem = item
        break
      }
    }
    const item = await encryptItem(id, value, this.key, this.crypto)
    const transaction = this.database.transaction(ENCRYPTED_STORE, 'readwrite')
    if (existingItem) await transaction.store.delete(existingItem.id)
    await transaction.store.put(item)
    await transaction.done
  }

  async delete(id: string): Promise<void> {
    const items = await this.database.getAll(ENCRYPTED_STORE)
    for (const item of items) {
      const payload = await decryptItem<unknown>(item, this.key, this.crypto)
      if (payload.id === id) {
        await this.database.delete(ENCRYPTED_STORE, item.id)
        return
      }
    }
  }

  async list<T>(): Promise<Array<{ id: string; value: T }>> {
    const items = await this.database.getAll(ENCRYPTED_STORE)
    return Promise.all(
      items.map((item) => decryptItem<T>(item, this.key, this.crypto)),
    )
  }

  close(): void {
    this.database.close()
  }
}
