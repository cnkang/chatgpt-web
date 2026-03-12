import { ss } from '@/utils/storage'
import defaultAvatar from '@/assets/avatar.jpg'

const LOCAL_NAME = 'userStorage'

export interface UserInfo {
  avatar: string
  name: string
  description: string
}

export interface UserState {
  userInfo: UserInfo
}

/**
 * Provide the default user state for the application.
 *
 * @returns The default `UserState` containing `userInfo` with a bundled local avatar, name `"数字小助手"`, and description `"不要输入涉密/隐私信息！"`.
 */
export function defaultSetting(): UserState {
  return {
    userInfo: {
      avatar: defaultAvatar,
      name: '数字小助手',
      description: '不要输入涉密/隐私信息！',
    },
  }
}

export function getLocalState(): UserState {
  const localSetting: UserState | undefined = ss.get(LOCAL_NAME) as UserState | undefined
  return { ...defaultSetting(), ...localSetting }
}

export function setLocalState(setting: UserState): void {
  ss.set(LOCAL_NAME, setting)
}
