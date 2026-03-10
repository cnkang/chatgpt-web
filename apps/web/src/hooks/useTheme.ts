import type { GlobalThemeOverrides } from 'naive-ui'
import { darkTheme, useOsTheme } from 'naive-ui'
import { computed, watch } from 'vue'
import { useAppStore } from '@/store'

/**
 * Provides the active Naive UI theme and matching theme overrides derived from the application theme setting and the operating system color scheme.
 *
 * @returns An object with `theme` (the active Naive UI theme or `undefined` for the light/default theme) and `themeOverrides` (a `GlobalThemeOverrides` object containing token values appropriate for the active theme)
 */
export function useTheme() {
  const appStore = useAppStore()

  const OsTheme = useOsTheme()

  const isDark = computed(() => {
    if (appStore.theme === 'auto') return OsTheme.value === 'dark'
    else return appStore.theme === 'dark'
  })

  const theme = computed(() => {
    return isDark.value ? darkTheme : undefined
  })

  const themeOverrides = computed<GlobalThemeOverrides>(() => {
    if (isDark.value) {
      return {
        common: {
          primaryColor: '#4f9f72',
          primaryColorHover: '#62b282',
          primaryColorPressed: '#3c825c',
          primaryColorSuppl: '#4f9f72',
          infoColor: '#60a5fa',
          successColor: '#4f9f72',
          warningColor: '#f59e0b',
          errorColor: '#ef4444',
          borderRadius: '18px',
          bodyColor: '#0b1220',
          cardColor: '#111827',
          modalColor: '#111827',
          popoverColor: '#0f172a',
          tableColor: '#0f172a',
          dividerColor: 'rgba(148, 163, 184, 0.14)',
          borderColor: 'rgba(71, 85, 105, 0.42)',
          textColorBase: '#e5eef8',
          textColor1: '#e5eef8',
          textColor2: '#b7c4d4',
          textColor3: '#8ea0b5',
          inputColor: 'rgba(15, 23, 42, 0.88)',
          inputColorDisabled: 'rgba(30, 41, 59, 0.68)',
          placeholderColor: 'rgba(148, 163, 184, 0.72)',
          fontFamily:
            '"Avenir Next", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
          fontFamilyMono:
            '"SFMono-Regular", "JetBrains Mono", "Cascadia Code", "Fira Code", monospace',
        },
      }
    }
    return {
      common: {
        primaryColor: '#3f8c60',
        primaryColorHover: '#4ea06f',
        primaryColorPressed: '#2f6d48',
        primaryColorSuppl: '#3f8c60',
        infoColor: '#3b82f6',
        successColor: '#3f8c60',
        warningColor: '#f59e0b',
        errorColor: '#ef4444',
        borderRadius: '18px',
        bodyColor: '#eef3f1',
        cardColor: '#ffffff',
        modalColor: '#ffffff',
        popoverColor: '#ffffff',
        tableColor: '#ffffff',
        dividerColor: 'rgba(148, 163, 184, 0.14)',
        borderColor: 'rgba(148, 163, 184, 0.24)',
        textColorBase: '#102033',
        textColor1: '#102033',
        textColor2: '#526173',
        textColor3: '#7b8794',
        inputColor: 'rgba(255, 255, 255, 0.88)',
        inputColorDisabled: 'rgba(241, 245, 249, 0.82)',
        placeholderColor: 'rgba(100, 116, 139, 0.72)',
        fontFamily:
          '"Avenir Next", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
        fontFamilyMono:
          '"SFMono-Regular", "JetBrains Mono", "Cascadia Code", "Fira Code", monospace',
      },
    }
  })

  watch(
    isDark,
    dark => {
      if (dark) document.documentElement.classList.add('dark')
      else document.documentElement.classList.remove('dark')
      document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
    },
    { immediate: true },
  )

  return { theme, themeOverrides }
}
