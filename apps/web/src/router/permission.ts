import { useAuthStoreWithout } from '@/store/modules/auth'
import type { Router } from 'vue-router'

export function setupPageGuard(router: Router) {
  router.beforeEach(async to => {
    const authStore = useAuthStoreWithout()
    if (!authStore.session) {
      try {
        const data = await authStore.getSession()
        if (String(data.auth) === 'false' && authStore.token) authStore.removeToken()
        if (to.path === '/500') return { name: 'Root' }
      } catch {
        if (to.path !== '/500') return { name: '500' }
      }
    }
  })
}
