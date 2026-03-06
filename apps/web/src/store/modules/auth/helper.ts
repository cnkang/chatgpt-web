import { session } from '@/utils/storage'

const LOCAL_NAME = 'SECRET_TOKEN'

export function getToken(): string | undefined {
  return session.get(LOCAL_NAME) as string | undefined
}

export function setToken(token: string) {
  return session.set(LOCAL_NAME, token)
}

export function removeToken() {
  return session.remove(LOCAL_NAME)
}
