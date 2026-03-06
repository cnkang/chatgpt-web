interface StorageData<T = unknown> {
  data: T
  expire: number | null
}

function removeStorageItem(key: string) {
  globalThis.localStorage.removeItem(key)
}

function clearStorage() {
  globalThis.localStorage.clear()
}

export function createLocalStorage(options?: { expire?: number | null }) {
  const DEFAULT_CACHE_TIME = 60 * 60 * 24 * 7

  const { expire } = { expire: DEFAULT_CACHE_TIME, ...options }

  function set<T = unknown>(key: string, data: T) {
    const storageData: StorageData<T> = {
      data,
      expire: expire === null ? null : Date.now() + expire * 1000,
    }

    const json = JSON.stringify(storageData)
    globalThis.localStorage.setItem(key, json)
  }

  function get(key: string) {
    const json = globalThis.localStorage.getItem(key)
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

      removeStorageItem(key)
      return null
    }

    return null
  }

  return { set, get, remove: removeStorageItem, clear: clearStorage }
}

export const ls = createLocalStorage()

export const ss = createLocalStorage({ expire: null })
