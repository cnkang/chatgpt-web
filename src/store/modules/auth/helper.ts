const LOCAL_NAME = 'SECRET_TOKEN'
let memoryToken: string | undefined

function clearLegacyTokenStorage() {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(LOCAL_NAME)
    }
    catch {
      // Ignore storage access failures in restricted browser contexts.
    }
  }
}

export function getToken() {
  clearLegacyTokenStorage()
  return memoryToken
}

export function setToken(token: string) {
  memoryToken = token
}

export function removeToken() {
  memoryToken = undefined
  clearLegacyTokenStorage()
}
