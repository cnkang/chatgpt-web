import type { GlobalThemeOverrides } from 'naive-ui'
import { darkTheme, useOsTheme } from 'naive-ui'
import { computed, watch } from 'vue'
import { useAppStore } from '@/store'

const SHARED_THEME_COMMON = {
  warningColor: '#f59e0b',
  errorColor: '#ef4444',
  borderRadius: '18px',
  dividerColor: 'rgba(148, 163, 184, 0.14)',
  fontFamily: '"Avenir Next", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
  fontFamilyMono: '"SFMono-Regular", "JetBrains Mono", "Cascadia Code", "Fira Code", monospace',
} as const

const DARK_THEME_COMMON = {
  ...SHARED_THEME_COMMON,
  primaryColor: '#7db199',
  primaryColorHover: '#8cbea7',
  primaryColorPressed: '#6a9a83',
  primaryColorSuppl: '#7db199',
  infoColor: '#83aaa5',
  successColor: '#7db199',
  bodyColor: '#121916',
  cardColor: '#1b2521',
  modalColor: '#1b2521',
  popoverColor: '#1f2a26',
  tableColor: '#1f2a26',
  borderColor: 'rgba(132, 153, 140, 0.28)',
  textColorBase: '#f2f7f4',
  textColor1: '#f2f7f4',
  textColor2: '#d4ddd7',
  textColor3: '#a7b4ad',
  inputColor: 'rgba(31, 42, 37, 0.92)',
  inputColorDisabled: 'rgba(36, 48, 42, 0.74)',
  placeholderColor: 'rgba(161, 174, 167, 0.72)',
} as const

const LIGHT_THEME_COMMON = {
  ...SHARED_THEME_COMMON,
  primaryColor: '#4c8b72',
  primaryColorHover: '#5c9b81',
  primaryColorPressed: '#3d725d',
  primaryColorSuppl: '#4c8b72',
  infoColor: '#6c9b95',
  successColor: '#4c8b72',
  bodyColor: '#edf2ee',
  cardColor: '#f7f9f6',
  modalColor: '#fbfcfa',
  popoverColor: '#ffffff',
  tableColor: '#fbfcfa',
  borderColor: 'rgba(112, 136, 123, 0.22)',
  textColorBase: '#18261f',
  textColor1: '#18261f',
  textColor2: '#394840',
  textColor3: '#63726b',
  inputColor: 'rgba(255, 255, 253, 0.9)',
  inputColorDisabled: 'rgba(238, 242, 237, 0.86)',
  placeholderColor: 'rgba(104, 121, 113, 0.72)',
} as const

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
    return {
      common: isDark.value ? DARK_THEME_COMMON : LIGHT_THEME_COMMON,
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
