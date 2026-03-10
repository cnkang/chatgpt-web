import { fetchSession } from '@/api'
import { store } from '@/store/helper'
import { isUpstreamUnavailableError } from '@/utils/request/fetch'
import { defineStore } from 'pinia'
import { getToken, removeToken, setToken } from './helper'

interface SessionResponse {
  auth: boolean
  model: 'ChatGPTAPI' | 'AzureOpenAI'
}

export interface AuthState {
  sessionBootstrapMessage: string | null
  sessionBootstrapStatus: 'idle' | 'ready' | 'unavailable'
  token: string | undefined
  session: SessionResponse | null
}

export const useAuthStore = defineStore('auth-store', {
  state: (): AuthState => ({
    sessionBootstrapMessage: null,
    sessionBootstrapStatus: 'idle',
    token: getToken(),
    session: null,
  }),

  getters: {
    /** Whether the backend uses the official API (always true since unofficial proxy was removed) */
    isChatGPTAPI(state): boolean {
      return state.session?.model === 'ChatGPTAPI' || state.session?.model === 'AzureOpenAI'
    },
    isSessionBootstrapUnavailable(state): boolean {
      return state.sessionBootstrapStatus === 'unavailable'
    },
  },

  actions: {
    async getSession() {
      try {
        const { data } = await fetchSession<SessionResponse>()
        this.session = { ...data }
        this.sessionBootstrapStatus = 'ready'
        this.sessionBootstrapMessage = null
        return data
      } catch (error) {
        if (isUpstreamUnavailableError(error)) {
          this.session = null
          this.sessionBootstrapStatus = 'unavailable'
          this.sessionBootstrapMessage = error.message
        }

        throw error
      }
    },

    clearSessionBootstrapIssue() {
      this.sessionBootstrapStatus = 'idle'
      this.sessionBootstrapMessage = null
    },

    setToken(token: string) {
      this.token = token
      setToken(token)
    },

    removeToken() {
      this.token = undefined
      removeToken()
    },
  },
})

export function useAuthStoreWithout() {
  return useAuthStore(store)
}
