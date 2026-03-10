import { t } from '@/locales'
import { useAuthStore, useChatStore, useSettingStore } from '@/store'
import { Chat as AIChat } from '@ai-sdk/vue'
import { throttle, type Chat as StoredChat } from '@chatgpt-web/shared'
import { DefaultChatTransport, type UIMessage } from 'ai'
import {
  computed,
  markRaw,
  onUnmounted,
  ref,
  shallowRef,
  watch,
  type ComputedRef,
  type Ref,
} from 'vue'

export interface DisplayChatMessage {
  dateTime: string
  error: boolean
  id: string
  inversion: boolean
  loading: boolean
  messageId?: string
  text: string
}

interface UseAiSdkChatConversationFlowOptions {
  uuid: ComputedRef<number>
  isMobile: Ref<boolean>
  scrollToBottom: () => Promise<void>
  scrollToBottomIfAtBottom: () => Promise<void>
  usingContext: Ref<boolean>
}

/**
 * Generates a unique message identifier for a message.
 *
 * @param index - Index used to construct a stable fallback identifier when UUID generation is unavailable
 * @returns A unique string identifier for the message; when UUID generation is unavailable, the fallback includes the current timestamp and the provided `index`
 */
function createMessageId(index: number) {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
  }

  return `restored-message-${Date.now()}-${index}`
}

/**
 * Get the current local date and time as a formatted string.
 *
 * @returns A string representing the current date and time formatted according to the runtime's locale
 */
function nowString() {
  return new Date().toLocaleString()
}

/**
 * Prepends the configured API base URL to a request path when a base is defined.
 *
 * @param path - The request path to append to the base URL (typically begins with `/`).
 * @returns The combined URL when a base is configured, or the original `path` if no base is set
 */
function buildApiUrl(path: string) {
  const baseUrl = import.meta.env.VITE_GLOB_API_URL || ''
  return path.startsWith('http') ? path : `${baseUrl}${path}`
}

/**
 * Narrow a UI message part to the 'text' variant.
 *
 * @param part - The message part to check
 * @returns `true` if `part.type` is `'text'`, `false` otherwise.
 */
function isTextPart(
  part: UIMessage['parts'][number],
): part is Extract<UIMessage['parts'][number], { type: 'text' }> {
  return part.type === 'text'
}

/**
 * Extracts and concatenates the textual content from a UI message's text parts.
 *
 * @param message - The UIMessage to extract text from
 * @returns The concatenated text from all text parts in `message`, or an empty string if none are present
 */
function getMessageText(message: UIMessage) {
  return message.parts
    .filter(isTextPart)
    .map(part => part.text)
    .join('')
}

/**
 * Obtain a displayable date-time string for a UI message.
 *
 * If the message contains a non-empty string `dateTime` in its `metadata`, that value is returned;
 * otherwise the `fallback` chat's `dateTime` is used if provided, or the current local date-time string is returned.
 *
 * @param message - The UI message to read `metadata.dateTime` from
 * @param fallback - Optional stored chat to use when the message has no valid `dateTime`
 * @param timestampCache - Map to cache generated timestamps for messages without metadata.dateTime
 * @returns The message's date-time string, the fallback chat's `dateTime`, or a cached/new timestamp
 */
function getMessageDateTime(
  message: UIMessage,
  fallback?: StoredChat,
  timestampCache?: Map<string, string>,
) {
  const metadata = message.metadata
  if (
    metadata &&
    typeof metadata === 'object' &&
    'dateTime' in metadata &&
    typeof metadata.dateTime === 'string' &&
    metadata.dateTime.trim()
  ) {
    return metadata.dateTime
  }

  // Check cache first to ensure stable timestamps across recomputes
  if (timestampCache?.has(message.id)) {
    const cached = timestampCache.get(message.id)
    if (cached) return cached
  }

  // Generate new timestamp and cache it
  const timestamp = fallback?.dateTime ?? nowString()
  timestampCache?.set(message.id, timestamp)
  return timestamp
}

/**
 * Retrieve the prompt to use for a regeneration or follow-up based on message history.
 *
 * If `fallback` contains a `requestOptions.prompt`, that value is returned; otherwise the function scans backward from `index` for the nearest user message and returns its text. Returns an empty string when no prompt is found.
 *
 * @param messages - Array of UI messages to search
 * @param index - Starting index in `messages` to scan backwards from
 * @param fallback - Optional stored chat whose `requestOptions.prompt`, if present, overrides the search
 * @returns The prompt string to use, or an empty string if none is found
 */
function findPrompt(messages: UIMessage[], index: number, fallback?: StoredChat) {
  if (fallback?.requestOptions.prompt) return fallback.requestOptions.prompt

  for (let currentIndex = index; currentIndex >= 0; currentIndex -= 1) {
    const message = messages[currentIndex]
    if (message?.role === 'user') return getMessageText(message)
  }

  return ''
}

/**
 * Convert an array of UIMessage items into StoredChat records suitable for persistence.
 *
 * Maps each UI message to a StoredChat preserving message id, resolved date/time (using an existing record when available),
 * extracted text, role inversion (true for user messages), an error flag (always `false` here), a loading flag set only
 * for the last assistant message when `loading` is true, and requestOptions containing either the user's text as the prompt
 * or a prompt inferred from prior messages or an existing record.
 *
 * @param messages - UI-formatted messages to convert
 * @param loading - Global loading state used to mark the last assistant message as loading when `true`
 * @param existing - Previously persisted StoredChat entries used to preserve date/time and prompt fallbacks
 * @returns An array of StoredChat objects corresponding to the provided UI messages
 */
function toStoredChats(messages: UIMessage[], loading: boolean, existing: StoredChat[]) {
  const existingById = new Map(existing.map(message => [message.id, message] as const))
  const lastAssistantId = [...messages].reverse().find(message => message.role === 'assistant')?.id

  return messages.map((message, index) => {
    const current = existingById.get(message.id)
    const text = getMessageText(message)
    const inversion = message.role === 'user'

    return {
      id: message.id,
      dateTime: getMessageDateTime(message, current),
      text,
      inversion,
      error: false,
      loading: !inversion && loading && message.id === lastAssistantId,
      conversationOptions: null,
      requestOptions: {
        prompt: inversion ? text : findPrompt(messages, index, current),
        options: null,
      },
    } satisfies StoredChat
  })
}

/**
 * Convert an array of StoredChat objects into UIMessage objects suitable for the chat UI.
 *
 * @param messages - The stored chat entries to convert
 * @returns An array of UIMessage where each entry preserves `id` (or a generated id), maps `inversion` to `role` (`user` when true, `assistant` when false), sets `metadata.dateTime`, and places the stored `text` into a single text `part`
 */
function toUIMessages(messages: StoredChat[]): UIMessage[] {
  return messages.map((message, index) => ({
    id: message.id ?? createMessageId(index),
    role: message.inversion ? 'user' : 'assistant',
    metadata: { dateTime: message.dateTime },
    parts: [{ type: 'text', text: message.text }],
  }))
}

/**
 * Constructs a configured DefaultChatTransport for the chat API using authentication and app settings.
 *
 * @param usingContext - A ref that controls whether the current conversation context should be sent with requests
 * @returns A DefaultChatTransport instance configured with the chat API endpoint, dynamic authorization headers when a token is present, request body fields (systemMessage, temperature, top_p, usingContext), and a fetch wrapper that removes the auth token and reloads the page on 401/403 responses
 */
function createTransport(
  authStore: ReturnType<typeof useAuthStore>,
  settingStore: ReturnType<typeof useSettingStore>,
  usingContext: Ref<boolean>,
) {
  return new DefaultChatTransport({
    api: buildApiUrl('/chat-process'),
    headers: () =>
      authStore.token
        ? {
            Authorization: `Bearer ${authStore.token}`,
          }
        : ({} as Record<string, string>),
    body: () => ({
      systemMessage: settingStore.systemMessage,
      temperature: settingStore.temperature,
      top_p: settingStore.top_p,
      usingContext: usingContext.value,
    }),
    fetch: async (input, init) => {
      const response = await fetch(input, init)

      if (response.status === 401 || response.status === 403) {
        authStore.removeToken()
        globalThis.location.reload()
      }

      return response
    },
  })
}

/**
 * Create a non-reactive AIChat instance for a conversation.
 *
 * @param uuid - Numeric conversation identifier used as the chat's string id
 * @param initialMessages - Initial UI messages to seed the chat's history
 * @param transport - Transport used by the chat for sending/receiving messages
 * @returns The created AIChat instance wrapped with `markRaw` so it is not made reactive
 */
function createConversationChat(
  uuid: number,
  initialMessages: UIMessage[],
  transport: DefaultChatTransport<UIMessage>,
) {
  return markRaw(
    new AIChat<UIMessage>({
      id: String(uuid),
      messages: initialMessages,
      transport,
    }),
  )
}

/**
 * Manage an AI chat conversation within a Vue component, handling message state, transport, persistence, and user interactions.
 *
 * The hook synchronizes chat messages with a central store, exposes UI-ready display messages (including in-progress and error indicators),
 * and provides actions for submitting, regenerating, deleting, clearing, and stopping messages, plus keyboard handling and cleanup.
 *
 * @param options - Configuration for the conversation flow:
 *   - `uuid`: computed identifier for the conversation
 *   - `isMobile`: ref indicating mobile input behavior
 *   - `scrollToBottom`: function to scroll the view to the bottom
 *   - `scrollToBottomIfAtBottom`: function to scroll only if already at bottom
 *   - `usingContext`: ref controlling whether conversation context is sent to the API
 * @returns An object containing reactive state and action methods:
 *   - `prompt`: ref for the current input text
 *   - `loading`: computed indicating whether the chat is submitting or streaming
 *   - `messages`: computed array of display-ready chat items
 *   - `handleSubmit()`: submit the current prompt as a user message
 *   - `onRegenerate(index)`: regenerate assistant response for the message at `index`
 *   - `deleteMessage(index)`: delete the message at `index`
 *   - `clearMessages()`: remove all messages and stop any active stream
 *   - `handleEnter(event)`: keyboard handler for Enter/Shift/Ctrl behavior
 *   - `handleStop()`: stop the current streaming response
 *   - `cleanup()`: stop streaming and perform teardown
 */
export function useAiSdkChatConversationFlow(options: UseAiSdkChatConversationFlowOptions) {
  const { uuid, isMobile, scrollToBottom, scrollToBottomIfAtBottom, usingContext } = options

  const authStore = useAuthStore()
  const chatStore = useChatStore()
  const settingStore = useSettingStore()

  // Cache for message timestamps to ensure stability across recomputes
  const timestampCache = new Map<string, string>()

  const prompt = ref('')
  const transport = createTransport(authStore, settingStore, usingContext)
  const chat = shallowRef(
    createConversationChat(
      uuid.value,
      toUIMessages(chatStore.getChatByUuid(uuid.value)),
      transport,
    ),
  )

  const loading = computed(() => {
    const status = chat.value.status
    return status === 'submitted' || status === 'streaming'
  })

  const displayMessages = computed<DisplayChatMessage[]>(() => {
    const messages = chat.value.messages
    const items: DisplayChatMessage[] = messages.map(message => ({
      id: message.id,
      messageId: message.id,
      dateTime: getMessageDateTime(message, undefined, timestampCache),
      text: getMessageText(message),
      inversion: message.role === 'user',
      error: false,
      loading: loading.value && message.role === 'assistant' && message.id === messages.at(-1)?.id,
    }))

    if (loading.value && messages.at(-1)?.role !== 'assistant') {
      items.push({
        id: `thinking-${uuid.value}`,
        dateTime: nowString(),
        text: t('chat.thinking'),
        inversion: false,
        error: false,
        loading: true,
      })
    }

    if (!loading.value && chat.value.status === 'error' && chat.value.error) {
      items.push({
        id: `error-${uuid.value}`,
        dateTime: nowString(),
        text: chat.value.error.message || t('common.wrong'),
        inversion: false,
        error: true,
        loading: false,
      })
    }

    return items
  })

  async function syncStore() {
    const nextMessages = toStoredChats(
      chat.value.messages,
      loading.value,
      chatStore.getChatByUuid(uuid.value),
    )
    chatStore.setChatByUuid(uuid.value, nextMessages)
  }

  // Throttled version to avoid excessive store updates during streaming
  const throttledSyncStore = throttle(syncStore, 500)

  async function handleSubmit() {
    const message = prompt.value.trim()
    if (!message || loading.value) return

    prompt.value = ''
    await chat.value.sendMessage({ text: message })
  }

  async function onRegenerate(index: number) {
    if (loading.value) return

    const message = displayMessages.value[index]
    if (!message?.messageId) {
      await chat.value.regenerate()
      return
    }

    await chat.value.regenerate({ messageId: message.messageId })
  }

  async function deleteMessage(index: number) {
    const message = displayMessages.value[index]
    if (!message) return

    if (!message.messageId) {
      chat.value.clearError()
      return
    }

    // Stop any active streaming before deleting to prevent race conditions
    if (loading.value) {
      chat.value.stop()
    }

    chat.value.messages = chat.value.messages.filter(item => item.id !== message.messageId)
    chat.value.clearError()
    await syncStore()
  }

  async function clearMessages() {
    chat.value.stop()
    chat.value.clearError()
    chat.value.messages = []
    await syncStore()
  }

  function handleEnter(event: KeyboardEvent) {
    if (event.isComposing) return

    if (!isMobile.value) {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault()
        void handleSubmit()
      }
      return
    }

    if (event.key === 'Enter' && event.ctrlKey) {
      event.preventDefault()
      void handleSubmit()
    }
  }

  function handleStop() {
    chat.value.stop()
  }

  function cleanup() {
    chat.value.stop()
    // Ensure final state is persisted
    void syncStore()
  }

  watch(
    () => [chat.value.messages, chat.value.status] as const,
    async () => {
      // Use throttled version during streaming, immediate on status changes
      if (loading.value) {
        throttledSyncStore()
      } else {
        await syncStore()
      }
      await scrollToBottomIfAtBottom()
    },
    { deep: true, immediate: true },
  )

  watch(uuid, async nextUuid => {
    chat.value.stop()
    chat.value = createConversationChat(
      nextUuid,
      toUIMessages(chatStore.getChatByUuid(nextUuid)),
      transport,
    )
    prompt.value = ''
    await scrollToBottom()
  })

  onUnmounted(() => {
    cleanup()
  })

  return {
    prompt,
    loading,
    messages: displayMessages,
    handleSubmit,
    onRegenerate,
    deleteMessage,
    clearMessages,
    handleEnter,
    handleStop,
    cleanup,
  }
}
