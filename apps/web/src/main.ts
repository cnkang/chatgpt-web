import { createApp } from 'vue'
import App from './App.vue'
import { setupI18n } from './locales'
import { setupAssets, setupScrollbarStyle } from './plugins'
import { setupRouter } from './router'
import { setupStore } from './store'

function registerNativePwa() {
  const isEnabled = import.meta.env.PROD && import.meta.env.VITE_GLOB_APP_PWA === 'true'
  if (!isEnabled || !('serviceWorker' in navigator)) return

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(error => {
      console.error('[PWA] service worker registration failed', error)
    })
  })
}

async function bootstrap() {
  const app = createApp(App)
  setupAssets()

  setupScrollbarStyle()

  setupStore(app)

  setupI18n(app)

  await setupRouter(app)

  app.mount('#app')
}

registerNativePwa()
bootstrap()
