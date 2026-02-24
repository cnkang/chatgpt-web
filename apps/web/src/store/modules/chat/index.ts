import { t } from '@/locales'
import { router } from '@/router'
import type { Chat, ChatState, History } from '@chatgpt-web/shared'
import { defineStore } from 'pinia'
import { createChatMessageId, defaultState, getLocalState, setLocalState } from './helper'

const CHAT_STATE_PERSIST_DELAY_MS = 120
let persistTimer: number | null = null
let pendingPersistState: ChatState | null = null

function flushPendingPersist() {
  if (persistTimer) {
    window.clearTimeout(persistTimer)
    persistTimer = null
  }

  if (!pendingPersistState) return
  setLocalState(pendingPersistState)
  pendingPersistState = null
}

function schedulePersist(state: ChatState) {
  pendingPersistState = state

  if (persistTimer) return

  persistTimer = window.setTimeout(() => {
    flushPendingPersist()
  }, CHAT_STATE_PERSIST_DELAY_MS)
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flushPendingPersist)
}

function ensureChatId(chat: Chat, current?: Chat): Chat {
  if (chat.id) return chat
  return { ...chat, id: current?.id ?? createChatMessageId() }
}

function mergeChatWithId(current: Chat, patch: Partial<Chat>): Chat {
  const next = { ...current, ...patch }
  if (next.id) return next
  return { ...next, id: createChatMessageId() }
}

type ChatGroup = ChatState['chat'][number]

function findChatGroupIndexByUuid(groups: ChatGroup[], uuid: number) {
  return groups.findIndex(group => group.uuid === uuid)
}

function findExplicitChatGroupIndex(groups: ChatGroup[], uuid: number) {
  if (!uuid || uuid === 0) return groups.length ? 0 : -1
  return findChatGroupIndexByUuid(groups, uuid)
}

function findGetterChatGroupIndex(state: ChatState, uuid?: number) {
  if (uuid) return findChatGroupIndexByUuid(state.chat, uuid)
  if (!state.active) return -1
  return findChatGroupIndexByUuid(state.chat, state.active)
}

function getChatGroupByExplicitUuid(state: ChatState, uuid: number): ChatGroup | null {
  const index = findExplicitChatGroupIndex(state.chat, uuid)
  if (index === -1) return null
  return state.chat[index]
}

export const useChatStore = defineStore('chat-store', {
  state: (): ChatState => getLocalState(),

  getters: {
    getChatHistoryByCurrentActive(state: ChatState) {
      const index = state.history.findIndex((item: History) => item.uuid === state.active)
      if (index !== -1) return state.history[index]
      return null
    },

    getChatByUuid(state: ChatState) {
      return (uuid?: number) => {
        const index = findGetterChatGroupIndex(state, uuid)
        if (index === -1) return []
        return state.chat[index].data
      }
    },
  },

  actions: {
    setUsingContext(context: boolean) {
      this.usingContext = context
      this.recordState()
    },

    addHistory(history: History, chatData: Chat[] = []) {
      this.history.unshift(history)
      this.chat.unshift({ uuid: history.uuid, data: chatData })
      this.active = history.uuid
      this.reloadRoute(history.uuid)
    },

    updateHistory(uuid: number, edit: Partial<History>) {
      const index = this.history.findIndex((item: History) => item.uuid === uuid)
      if (index !== -1) {
        this.history[index] = { ...this.history[index], ...edit }
        this.recordState()
      }
    },

    async deleteHistory(index: number) {
      if (index < 0 || index >= this.history.length) return

      this.history.splice(index, 1)
      this.chat.splice(index, 1)

      if (this.history.length === 0) {
        this.active = null
        this.reloadRoute()
        return
      }

      // Activate the nearest remaining conversation
      const newIndex = Math.min(index, this.history.length - 1)
      const uuid = this.history[newIndex].uuid
      this.active = uuid
      this.reloadRoute(uuid)
    },

    async setActive(uuid: number) {
      this.active = uuid
      return await this.reloadRoute(uuid)
    },

    getChatByUuidAndIndex(uuid: number, index: number) {
      const group = getChatGroupByExplicitUuid(this.$state, uuid)
      if (group) return group.data[index]
      return null
    },

    addChatByUuid(uuid: number, chat: Chat) {
      const chatWithId = ensureChatId(chat)
      if (!uuid || uuid === 0) {
        if (this.history.length === 0) {
          const newUuid = Date.now()
          this.history.push({ uuid: newUuid, title: chatWithId.text, isEdit: false })
          this.chat.push({ uuid: newUuid, data: [chatWithId] })
          this.active = newUuid
          this.recordState()
        } else {
          this.chat[0].data.push(chatWithId)
          if (this.history[0].title === t('chat.newChatTitle'))
            this.history[0].title = chatWithId.text
          this.recordState()
        }
        return
      }

      const index = findExplicitChatGroupIndex(this.chat, uuid)
      if (index !== -1) {
        this.chat[index].data.push(chatWithId)
        if (this.history[index].title === t('chat.newChatTitle'))
          this.history[index].title = chatWithId.text
        this.recordState()
      }
    },

    updateChatByUuid(uuid: number, index: number, chat: Chat) {
      const group = getChatGroupByExplicitUuid(this.$state, uuid)
      if (group) {
        group.data[index] = ensureChatId(chat, group.data[index])
        this.recordState()
      }
    },

    updateChatSomeByUuid(uuid: number, index: number, chat: Partial<Chat>) {
      const group = getChatGroupByExplicitUuid(this.$state, uuid)
      if (group) {
        group.data[index] = mergeChatWithId(group.data[index], chat)
        this.recordState()
      }
    },

    deleteChatByUuid(uuid: number, index: number) {
      const group = getChatGroupByExplicitUuid(this.$state, uuid)
      if (group) {
        group.data.splice(index, 1)
        this.recordState()
      }
    },

    clearChatByUuid(uuid: number) {
      const group = getChatGroupByExplicitUuid(this.$state, uuid)
      if (group) {
        group.data = []
        this.recordState()
      }
    },

    clearHistory() {
      this.$state = { ...defaultState() }
      this.recordState()
    },

    async reloadRoute(uuid?: number) {
      this.recordState(true)
      await router.push({ name: 'Chat', params: { uuid } })
    },

    recordState(immediate = false) {
      if (immediate) {
        pendingPersistState = this.$state
        flushPendingPersist()
        return
      }

      schedulePersist(this.$state)
    },
  },
})
