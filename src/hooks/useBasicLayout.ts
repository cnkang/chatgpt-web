import { readonly, ref } from 'vue'

const MOBILE_MEDIA_QUERY = '(max-width: 639.98px)'
const isMobileState = ref(false)
let hasSetup = false

function setupMediaQuery() {
  if (hasSetup || typeof window === 'undefined')
    return

  hasSetup = true
  const mediaQuery = window.matchMedia(MOBILE_MEDIA_QUERY)

  const syncFromMediaQuery = (event?: MediaQueryListEvent) => {
    isMobileState.value = event?.matches ?? mediaQuery.matches
  }

  syncFromMediaQuery()
  mediaQuery.addEventListener('change', syncFromMediaQuery)
}

export function useBasicLayout() {
  setupMediaQuery()
  return { isMobile: readonly(isMobileState) }
}
