import { t } from '@/locales'
import { ss } from '@/utils/storage'
import type { ChatState } from '@chatgpt-web/shared'
import { ChatStateSchema } from '@chatgpt-web/shared'

const LOCAL_NAME = 'chatStorage'
const CHAT_STORAGE_SCHEMA_VERSION = 1
let chatMessageIdSeed = 0

interface ChatStoragePayload {
  version: number
  state: ChatState
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function toInt(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number.parseInt(value, 10)
    if (Number.isInteger(parsed)) return parsed
  }
  return null
}

/**
 * Normalize conversation-related identifiers from an arbitrary input.
 *
 * @param value - A value that may be `null`, a non-object, or an object possibly containing `conversationId` and/or `parentMessageId` string properties.
 * @returns `null` if `value` is strictly `null`; `undefined` if `value` is not an object; otherwise an object that is either empty or contains `conversationId` and/or `parentMessageId` string properties.
 */
function normalizeConversationOptions(value: unknown): Record<string, string> | null | undefined {
  if (value === null) return null
  if (!isRecord(value)) return undefined

  const conversationId = typeof value.conversationId === 'string' ? value.conversationId : undefined
  const parentMessageId =
    typeof value.parentMessageId === 'string' ? value.parentMessageId : undefined

  if (!conversationId && !parentMessageId) return {}

  return {
    ...(conversationId && { conversationId }),
    ...(parentMessageId && { parentMessageId }),
  }
}

/**
 * Coerces the `text` property of an object into a string.
 *
 * @param value - Object that may contain a `text` property
 * @returns The `text` value as a string; returns an empty string if `text` is absent or not a string/number/boolean
 */
function normalizeText(value: Record<string, unknown>): string {
  const text = value.text
  if (typeof text === 'string') return text
  if (typeof text === 'number' || typeof text === 'boolean') return String(text)
  return ''
}

/**
 * Produces a date-time string from a provided object or falls back to the current locale date-time.
 *
 * @param value - Object that may contain a `dateTime` property
 * @returns The `dateTime` string from `value` if it is a non-empty string, otherwise the current locale date-time string
 */
function normalizeDateTime(value: Record<string, unknown>): string {
  const dateTime = value.dateTime
  return typeof dateTime === 'string' && dateTime.trim() ? dateTime : new Date().toLocaleString()
}

/**
 * Extracts a prompt string from an object or returns a fallback.
 *
 * @param value - Object that may contain a `prompt` property
 * @param fallback - Fallback string used when `value.prompt` is not a string
 * @returns The `prompt` from `value` if it is a string, `fallback` otherwise
 */
function resolvePrompt(value: Record<string, unknown>, fallback: string): string {
  return typeof value.prompt === 'string' ? value.prompt : fallback
}

/**
 * Build normalized request options (prompt and conversation options) from a raw input object and fallback text.
 *
 * If `value.requestOptions` is a record, `prompt` is taken from `requestOptions.prompt` when it's a string; otherwise the prompt is resolved from `value` and `text`. `options` are normalized from `requestOptions.options` when present; if `requestOptions` is not a record, `prompt` is resolved from `value` and `text` and `options` are normalized from `value.options`.
 *
 * @param value - Raw input object that may contain `requestOptions`, `options`, or a direct `prompt`
 * @param text - Fallback text used to resolve the prompt when one is not provided
 * @returns An object with `prompt` (resolved string) and `options` (normalized conversation options or `undefined`)
 */
function normalizeRequestOptions(value: Record<string, unknown>, text: string) {
  const requestOptions = value.requestOptions

  if (!isRecord(requestOptions)) {
    return {
      prompt: resolvePrompt(value, text),
      options: normalizeConversationOptions(value.options),
    }
  }

  return {
    prompt:
      typeof requestOptions.prompt === 'string'
        ? requestOptions.prompt
        : resolvePrompt(value, text),
    options: normalizeConversationOptions(requestOptions.options),
  }
}

/**
 * Normalize a raw message-like value into the standardized chat message shape or return null if the input is not an object.
 *
 * @param value - The raw value to normalize (typically a loosely-typed message object).
 * @returns A normalized message object containing `id` (when provided), `dateTime`, `text`, a `requestOptions` object with `prompt` and optional `options`, and optional properties `inversion`, `error`, `loading`, and `conversationOptions`; `null` if `value` is not a plain object.
 */
function normalizeMessage(value: unknown): Record<string, unknown> | null {
  if (!isRecord(value)) return null

  const text = normalizeText(value)
  const dateTime = normalizeDateTime(value)
  const requestOptions = normalizeRequestOptions(value, text)
  const conversationOptions = normalizeConversationOptions(value.conversationOptions)

  const message: Record<string, unknown> = {
    ...(typeof value.id === 'string' && value.id && { id: value.id }),
    dateTime,
    text,
    ...(typeof value.inversion === 'boolean' && { inversion: value.inversion }),
    ...(typeof value.error === 'boolean' && { error: value.error }),
    ...(typeof value.loading === 'boolean' && { loading: value.loading }),
    requestOptions: {
      prompt: requestOptions.prompt,
      ...(requestOptions.options !== undefined && { options: requestOptions.options }),
    },
  }

  if (conversationOptions !== undefined) {
    message.conversationOptions = conversationOptions
  }

  return message
}

/**
 * Normalize a raw history item into a validated history object.
 *
 * @param value - Raw value expected to contain history item fields (e.g., `uuid`, `title`, `isEdit`)
 * @returns An object with `uuid` (number), `title` (string, using a default translated title when missing), and `isEdit` (boolean); returns `null` if `value` is not a valid history item or `uuid` cannot be converted to an integer.
 */
function normalizeHistoryItem(value: unknown): Record<string, unknown> | null {
  if (!isRecord(value)) return null

  const uuid = toInt(value.uuid)
  if (uuid === null) return null

  return {
    title: typeof value.title === 'string' ? value.title : t('chat.newChatTitle'),
    isEdit: typeof value.isEdit === 'boolean' ? value.isEdit : false,
    uuid,
  }
}

function normalizeChatGroup(value: unknown): Record<string, unknown> | null {
  if (!isRecord(value)) return null

  const uuid = toInt(value.uuid)
  if (uuid === null) return null

  const rawData = Array.isArray(value.data) ? value.data : []
  const data = rawData
    .map(normalizeMessage)
    .filter((item): item is Record<string, unknown> => !!item)

  return { uuid, data }
}

/**
 * Validate and extract a versioned state object from a raw storage payload.
 *
 * @param raw - The raw value read from storage (typically parsed JSON).
 * @returns An object with `version` (the integer version if present, otherwise `0`) and `state` (the contained `state` when present, otherwise the original `raw` value)
 */
function unwrapStoragePayload(raw: unknown): { version: number; state: unknown } {
  if (
    isRecord(raw) &&
    typeof raw.version === 'number' &&
    Number.isInteger(raw.version) &&
    'state' in raw
  ) {
    return { version: raw.version, state: raw.state }
  }
  return { version: 0, state: raw }
}

function migrateChatState(raw: unknown, version: number): unknown {
  if (version >= CHAT_STORAGE_SCHEMA_VERSION) return raw
  if (!isRecord(raw)) return defaultState()

  const history = Array.isArray(raw.history)
    ? raw.history
        .map(normalizeHistoryItem)
        .filter((item): item is Record<string, unknown> => !!item)
    : []

  const chat = Array.isArray(raw.chat)
    ? raw.chat.map(normalizeChatGroup).filter((item): item is Record<string, unknown> => !!item)
    : []

  const activeValue = raw.active === null ? null : toInt(raw.active)
  const active = activeValue === null && raw.active !== null ? defaultState().active : activeValue

  return {
    active,
    usingContext: typeof raw.usingContext === 'boolean' ? raw.usingContext : true,
    history,
    chat,
  }
}

function restoreMessageIds(validated: ChatState, source: unknown): ChatState {
  if (!isRecord(source)) return validated
  const sourceChat = source.chat
  if (!Array.isArray(sourceChat)) return validated

  let changed = false
  const chat = validated.chat.map((group, groupIndex) => {
    const sourceGroup = sourceChat[groupIndex]
    if (!isRecord(sourceGroup)) return group
    const sourceData = sourceGroup.data
    if (!Array.isArray(sourceData)) return group
    if (sourceData.length !== group.data.length) return group

    let groupChanged = false
    const data = group.data.map((message, messageIndex) => {
      const sourceMessage = sourceData[messageIndex]
      if (!isRecord(sourceMessage) || typeof sourceMessage.id !== 'string' || !sourceMessage.id) {
        return message
      }
      if (message.id === sourceMessage.id) return message
      changed = true
      groupChanged = true
      return { ...message, id: sourceMessage.id }
    })

    return groupChanged ? { ...group, data } : group
  })

  return changed ? { ...validated, chat } : validated
}

function parseStoredChatState(raw: unknown): ChatState | null {
  const { version, state } = unwrapStoragePayload(raw)
  const migrated = migrateChatState(state, version)
  const parsed = ChatStateSchema.safeParse(migrated)
  if (!parsed.success) return null
  return restoreMessageIds(parsed.data as ChatState, migrated)
}

export function createChatMessageId() {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
  }

  chatMessageIdSeed += 1
  return `chat_${Date.now()}_${chatMessageIdSeed}`
}

function ensureMessageIds(state: ChatState): ChatState {
  let changed = false

  const chat = state.chat.map(group => {
    let groupChanged = false

    const data = group.data.map(message => {
      if (message.id) return message
      changed = true
      groupChanged = true
      return { ...message, id: createChatMessageId() }
    })

    return groupChanged ? { ...group, data } : group
  })

  if (!changed) return state
  return { ...state, chat }
}

export function defaultState(): ChatState {
  const uuid = 1002
  return {
    active: uuid,
    usingContext: true,
    history: [{ uuid, title: t('chat.newChatTitle'), isEdit: false }],
    chat: [{ uuid, data: [] }],
  }
}

export function getLocalState(): ChatState {
  const raw = ss.get(LOCAL_NAME)
  if (!raw) return defaultState()

  const parsed = parseStoredChatState(raw)
  if (!parsed) return defaultState()

  return ensureMessageIds({ ...defaultState(), ...parsed })
}

export function setLocalState(state: ChatState) {
  const payload: ChatStoragePayload = {
    version: CHAT_STORAGE_SCHEMA_VERSION,
    state,
  }
  ss.set(LOCAL_NAME, payload)
}
