import { useAuthStoreWithout } from '@/store/modules/auth'
import type { Router } from 'vue-router'

/**
 * Installs a global navigation guard on the given Vue Router to ensure session bootstrap and perform redirects on session errors.
 *
 * The guard attempts to fetch the current session when no session exists and session bootstrap is available. On successful fetch, it removes a stored token if the session indicates unauthenticated (`data.auth === 'false'`) and redirects requests for `/500` to the route named `Root`. On fetch failure, if session bootstrap is unavailable the guard allows navigation; otherwise it redirects to the route named `500` unless the target path is already `/500`.
 *
 * @param router - The Vue Router instance to attach the navigation guard to
 */
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
