interface StorageData<T = unknown> {
  data: T
  expire: number | null
}

type StorageKind = 'local' | 'session'

function resolveStorage(kind: StorageKind): Storage {
  if (kind === 'session' && typeof globalThis.sessionStorage !== 'undefined') {
    return globalThis.sessionStorage
  }

  return globalThis.localStorage
}

function removeStorageItem(key: string, kind: StorageKind) {
  resolveStorage(kind).removeItem(key)
}

function clearStorage(kind: StorageKind) {
  resolveStorage(kind).clear()
}

export function createLocalStorage(kind: StorageKind = 'local', options?: { expire?: number | null }) {
  const DEFAULT_CACHE_TIME = 60 * 60 * 24 * 7

  const { expire } = { expire: DEFAULT_CACHE_TIME, ...options }
  const storage = resolveStorage(kind)

  function set<T = unknown>(key: string, data: T) {
    const storageData: StorageData<T> = {
      data,
      expire: expire === null ? null : Date.now() + expire * 1000,
    }

    const json = JSON.stringify(storageData)
    storage.setItem(key, json)
  }

  function get(key: string) {
    const json = storage.getItem(key)
    if (json) {
      let storageData: StorageData | null = null

      try {
        storageData = JSON.parse(json)
      } catch {
        // Prevent failure
      }

      if (storageData) {
        const { data, expire } = storageData
        if (expire === null || expire >= Date.now()) return data
      }

      removeStorageItem(key, kind)
      return null
    }

    return null
  }

  return {
    set,
    get,
    remove: (key: string) => removeStorageItem(key, kind),
    clear: () => clearStorage(kind),
  }
}

export const ls = createLocalStorage('local')

export const ss = createLocalStorage('local', { expire: null })

export const session = createLocalStorage('session', { expire: null })
