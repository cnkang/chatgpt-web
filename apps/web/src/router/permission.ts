import { useAuthStoreWithout } from '@/store/modules/auth'
import type { Router } from 'vue-router'

export function setupPageGuard(router: Router) {
  router.beforeEach(async to => {
    const authStore = useAuthStoreWithout()
    if (!authStore.session && !authStore.isSessionBootstrapUnavailable) {
      try {
        const data = await authStore.getSession()
        if (String(data.auth) === 'false' && authStore.token) authStore.removeToken()
        if (to.path === '/500') return { name: 'Root' }
      } catch {
        if (authStore.isSessionBootstrapUnavailable) {
          return true
        }

        if (to.path !== '/500') return { name: '500' }
      }
    }

    return true
  })
}
