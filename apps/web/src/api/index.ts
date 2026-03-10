import { post } from '@/utils/request'

export function fetchChatConfig<T = unknown>() {
  return post<T>({
    url: '/config',
  })
}

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
