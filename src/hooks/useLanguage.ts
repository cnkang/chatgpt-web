import { enUS, esAR, koKR, ruRU, viVN, zhCN, zhTW } from 'naive-ui'
import { computed, watchEffect } from 'vue'
import { setLocale } from '@/locales'
import { useAppStore } from '@/store'

const localeMap = {
  'en-US': enUS,
  'es-ES': esAR,
  'ko-KR': koKR,
  'vi-VN': viVN,
  'ru-RU': ruRU,
  'zh-CN': zhCN,
  'zh-TW': zhTW,
} as const

export function useLanguage() {
  const appStore = useAppStore()

  watchEffect(() => {
    setLocale(appStore.language)
  })

  const language = computed(() => localeMap[appStore.language] ?? enUS)

  return { language }
}
