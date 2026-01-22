import { ss } from '@/utils/storage'

const LOCAL_NAME = 'userStorage'

export interface UserInfo {
	avatar: string;
	name: string;
	description: string;
}

export interface UserState {
	userInfo: UserInfo;
}

export function defaultSetting(): UserState {
	return {
		userInfo: {
			avatar: 'https://t.videostory.com/panda.png',
			name: '产品组数字小助手',
			description: '不要输入涉密/隐私信息！',
		},
	}
}

export function getLocalState(): UserState {
	const localSetting: UserState | undefined = ss.get(LOCAL_NAME) as
		| UserState
		| undefined
	return { ...defaultSetting(), ...localSetting }
}

export function setLocalState(setting: UserState): void {
	ss.set(LOCAL_NAME, setting)
}
