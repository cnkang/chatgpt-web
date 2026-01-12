import { t } from '@/locales'
import { ss } from '@/utils/storage'
import type { ChatState } from '@chatgpt-web/shared'

const LOCAL_NAME = 'chatStorage'

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
	const localState = ss.get(LOCAL_NAME) as ChatState | undefined
	return { ...defaultState(), ...localState }
}

export function setLocalState(state: ChatState) {
	ss.set(LOCAL_NAME, state)
}
