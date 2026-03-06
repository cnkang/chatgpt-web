import { fetchSession } from '@/api'
import { store } from '@/store/helper'
import { defineStore } from 'pinia'
import { getToken, removeToken, setToken } from './helper'

interface SessionResponse {
  auth: boolean
  model: 'ChatGPTAPI' | 'AzureOpenAI'
}

export interface AuthState {
  token: string | undefined
  session: SessionResponse | null
}

export const useAuthStore = defineStore('auth-store', {
  state: (): AuthState => ({
    token: getToken(),
    session: null,
  }),

  getters: {
    /** Whether the backend uses the official API (always true since unofficial proxy was removed) */
    isChatGPTAPI(state): boolean {
      return state.session?.model === 'ChatGPTAPI' || state.session?.model === 'AzureOpenAI'
    },
  },

  actions: {
    async getSession() {
      try {
        const { data } = await fetchSession<SessionResponse>()
        this.session = { ...data }
        return data
      } catch (error) {
        throw error
      }
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
