import { ss } from '@/utils/storage'

const LOCAL_NAME = 'SECRET_TOKEN'

export function getToken(): string | undefined {
	return ss.get(LOCAL_NAME) as string | undefined
}

export function setToken(token: string) {
	return ss.set(LOCAL_NAME, token)
}

export function removeToken() {
	return ss.remove(LOCAL_NAME)
}
