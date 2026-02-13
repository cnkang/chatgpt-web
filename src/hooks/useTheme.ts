import { darkTheme, useOsTheme, type GlobalThemeOverrides } from 'naive-ui'
import { computed, watch } from 'vue'
import { useAppStore } from '@/store'

export function useTheme() {
  const appStore = useAppStore()

  const OsTheme = useOsTheme()

  const isDark = computed(() => {
    if (appStore.theme === 'auto')
      return OsTheme.value === 'dark'
    else
      return appStore.theme === 'dark'
  })

  const theme = computed(() => {
    return isDark.value ? darkTheme : undefined
  })

  const lightCommonOverrides = {
    primaryColor: '#1f88e5',
    primaryColorHover: '#3b97eb',
    primaryColorPressed: '#1775c7',
    infoColor: '#1f88e5',
    successColor: '#21a778',
    warningColor: '#e8a200',
    errorColor: '#d95b6a',
    borderRadius: '12px',
    borderRadiusSmall: '10px',
    fontFamily: 'var(--chat-font-sans)',
  }

  const darkCommonOverrides = {
    primaryColor: '#4ba4ff',
    primaryColorHover: '#6cb5ff',
    primaryColorPressed: '#3589dd',
    infoColor: '#4ba4ff',
    successColor: '#4fce9f',
    warningColor: '#f0bf4e',
    errorColor: '#ee7f8f',
    borderRadius: '12px',
    borderRadiusSmall: '10px',
    fontFamily: 'var(--chat-font-sans)',
  }

  const themeOverrides = computed<GlobalThemeOverrides>(() => {
    if (isDark.value) {
      return {
        common: darkCommonOverrides,
      }
    }
    return {
      common: lightCommonOverrides,
    }
  })

  watch(
    () => isDark.value,
    (dark) => {
      document.documentElement.classList.toggle('dark', dark)
    },
    { immediate: true },
  )

  return { theme, themeOverrides }
}
