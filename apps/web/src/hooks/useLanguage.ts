import type { NLocale } from 'naive-ui'
import { shallowRef, watch } from 'vue'
import { setLocale } from '@/locales'
import { useAppStore } from '@/store'
import type { Language } from '@/store/modules/app/helper'

type LocaleLoader = () => Promise<{ default: NLocale }>

const localeLoaders: Record<Language, LocaleLoader> = {
  'en-US': async () => await import('naive-ui/es/locales/common/enUS.mjs'),
  'es-ES': async () => await import('naive-ui/es/locales/common/esAR.mjs'),
  'ko-KR': async () => await import('naive-ui/es/locales/common/koKR.mjs'),
  'ru-RU': async () => await import('naive-ui/es/locales/common/ruRU.mjs'),
  'vi-VN': async () => await import('naive-ui/es/locales/common/viVN.mjs'),
  'zh-CN': async () => await import('naive-ui/es/locales/common/zhCN.mjs'),
  'zh-TW': async () => await import('naive-ui/es/locales/common/zhTW.mjs'),
}

export function useLanguage() {
  const appStore = useAppStore()
  const language = shallowRef<NLocale>()

  watch(
    () => appStore.language,
    async (nextLanguage, _, onCleanup) => {
      let cancelled = false
      onCleanup(() => {
        cancelled = true
      })

      setLocale(nextLanguage)
      const localeModule = await localeLoaders[nextLanguage]()
      if (!cancelled) language.value = localeModule.default
    },
    { immediate: true },
  )

  return { language }
}
