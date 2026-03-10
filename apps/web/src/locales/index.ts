import { useAppStoreWithOut } from '@/store/modules/app'
import type { Language } from '@/store/modules/app/helper'
import type { App } from 'vue'
import { createI18n } from 'vue-i18n'
import { getCommonLabels, type CommonLabelLocale } from './commonLabels'
import enUS from './en-US'
import esES from './es-ES'
import koKR from './ko-KR'
import ruRU from './ru-RU'
import viVN from './vi-VN'
import zhCN from './zh-CN'
import zhTW from './zh-TW'

const appStore = useAppStoreWithOut()

const defaultLocale = appStore.language || 'zh-CN'

function withCommonLabels<T extends { common: Record<string, string> }>(
  locale: CommonLabelLocale,
  messages: T,
): T {
  return {
    ...messages,
    common: {
      ...messages.common,
      ...getCommonLabels(locale),
    },
  }
}

const i18n = createI18n({
  legacy: false,
  locale: defaultLocale,
  fallbackLocale: 'en-US',
  globalInjection: true,
  messages: {
    'en-US': withCommonLabels('en-US', enUS),
    'es-ES': withCommonLabels('es-ES', esES),
    'ko-KR': withCommonLabels('ko-KR', koKR),
    'ru-RU': withCommonLabels('ru-RU', ruRU),
    'vi-VN': withCommonLabels('vi-VN', viVN),
    'zh-CN': withCommonLabels('zh-CN', zhCN),
    'zh-TW': withCommonLabels('zh-TW', zhTW),
  },
})

export const t: (key: string, ...args: unknown[]) => string = i18n.global.t

export function setLocale(locale: Language) {
  i18n.global.locale.value = locale
}

export function setupI18n(app: App) {
  app.use(i18n)
}

export default i18n
