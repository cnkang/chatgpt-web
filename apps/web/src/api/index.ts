import { post } from '@/utils/request'

/**
 * Fetches chat configuration from the server.
 *
 * @returns The response body decoded as `T`
 */
export function fetchChatConfig<T = unknown>() {
  return post<T>({
    url: '/config',
  })
}

/**
 * Retrieve current session data from the server.
 *
 * @returns The session data parsed as `T`
 */
export function fetchSession<T>() {
  return post<T>({
    url: '/session',
  })
}

export function fetchVerify<T>(token: string) {
  return post<T>({
    url: '/verify',
    data: { token },
  })
}
