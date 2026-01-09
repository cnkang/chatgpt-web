import { t } from '@/locales'
import { ss } from '@/utils/storage'

const LOCAL_NAME = 'chatStorage'

export function defaultState(): Chat.ChatState {
	const uuid = 1002
	return {
		active: uuid,
		usingContext: true,
		history: [{ uuid, title: t('chat.newChatTitle'), isEdit: false }],
		chat: [{ uuid, data: [] }],
	}
}

export function getLocalState(): Chat.ChatState {
	const localState = ss.get(LOCAL_NAME) as Chat.ChatState | undefined
	return { ...defaultState(), ...localState }
}

export function setLocalState(state: Chat.ChatState) {
	ss.set(LOCAL_NAME, state)
}
