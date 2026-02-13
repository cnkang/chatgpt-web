import { computed, readonly, ref } from 'vue'

const MOBILE_MEDIA_QUERY = '(max-width: 639.98px)'
const TABLET_MEDIA_QUERY = '(min-width: 640px) and (max-width: 1023.98px)'
const isMobileState = ref(false)
const isTabletState = ref(false)
let hasSetup = false

function setupMediaQuery() {
  if (hasSetup || typeof window === 'undefined')
    return

  hasSetup = true
  const mobileMediaQuery = window.matchMedia(MOBILE_MEDIA_QUERY)
  const tabletMediaQuery = window.matchMedia(TABLET_MEDIA_QUERY)

  const syncFromMediaQuery = () => {
    isMobileState.value = mobileMediaQuery.matches
    isTabletState.value = tabletMediaQuery.matches
  }

  syncFromMediaQuery()
  mobileMediaQuery.addEventListener('change', syncFromMediaQuery)
  tabletMediaQuery.addEventListener('change', syncFromMediaQuery)
}

export function useBasicLayout() {
  setupMediaQuery()
  const isMobile = readonly(isMobileState)
  const isTablet = readonly(isTabletState)
  const isDesktop = computed(() => !isMobile.value && !isTablet.value)

  return {
    isMobile,
    isTablet,
    isDesktop,
  }
}
