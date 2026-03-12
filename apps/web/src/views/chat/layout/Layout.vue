<script setup lang="ts">
import { LoadingSpinner } from '@/components/common'
import { useBasicLayout } from '@/hooks/useBasicLayout'
import { t } from '@/locales'
import { useAppStore, useAuthStore, useChatStore } from '@/store'
import { NButton, NLayout, NLayoutContent } from 'naive-ui'
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { parseChatRouteUuid, syncChatRoute } from './routeSync'
import Permission from './Permission.vue'
import Sider from './sider/index.vue'

const router = useRouter()
const route = useRoute()
const appStore = useAppStore()
const chatStore = useChatStore()
const authStore = useAuthStore()

const routeUuid = computed(() => parseChatRouteUuid(route.params.uuid))

watch(
  routeUuid,
  async currentUuid => {
    await syncChatRoute({
      routeUuid: currentUuid,
      activeUuid: chatStore.active,
      replaceRoute: async uuid => {
        await router.replace({ name: 'Chat', params: { uuid } })
      },
      syncActive: uuid => {
        chatStore.syncActiveFromRoute(uuid)
      },
    })
  },
  { immediate: true },
)

const { isMobile } = useBasicLayout()

const collapsed = computed(() => appStore.siderCollapsed)

const _needPermission = computed(() => !!authStore.session?.auth && !authStore.token)
const showBackendUnavailableBanner = computed(() => authStore.isSessionBootstrapUnavailable)
const backendUnavailableMessage = computed(
  () => authStore.sessionBootstrapMessage || t('chat.backendUnavailableDescription'),
)

const getMobileClass = computed(() => {
  if (isMobile.value) return ['workspace-frame', 'workspace-frame-mobile']
  return ['workspace-frame']
})

const getContainerClass = computed(() => {
  return ['workspace-layout', { 'pl-[260px]': !isMobile.value && !collapsed.value }]
})

async function handleRetrySession() {
  authStore.clearSessionBootstrapIssue()

  try {
    const data = await authStore.getSession()
    if (String(data.auth) === 'false' && authStore.token) {
      authStore.removeToken()
    }
  } catch {
    // Keep the banner visible when the backend is still unavailable.
  }
}
</script>

<template>
  <div class="workspace-shell h-full transition-all" :class="[isMobile ? 'p-2.5' : 'p-6']">
    <div class="h-full overflow-hidden" :class="getMobileClass">
      <NLayout
        class="workspace-surface h-full z-40 transition"
        :class="getContainerClass"
        has-sider
      >
        <Sider />
        <NLayoutContent class="workspace-content h-full">
          <div class="workspace-content-inner">
            <div
              v-if="showBackendUnavailableBanner"
              class="backend-status-banner"
              :class="{ 'backend-status-banner-mobile': isMobile }"
            >
              <div class="backend-status-copy">
                <p class="backend-status-eyebrow">{{ t('chat.backendUnavailableTitle') }}</p>
                <p class="backend-status-text">{{ backendUnavailableMessage }}</p>
                <p class="backend-status-hint">{{ t('chat.backendUnavailableHint') }}</p>
              </div>
              <NButton
                class="backend-status-action"
                quaternary
                type="primary"
                @click="handleRetrySession"
              >
                {{ t('common.retry') }}
              </NButton>
            </div>

            <div class="workspace-router">
              <Suspense>
                <template #default>
                  <RouterView v-slot="{ Component, route }">
                    <component :is="Component" :key="route.fullPath" />
                  </RouterView>
                </template>
                <template #fallback>
                  <LoadingSpinner text="Loading chat..." />
                </template>
              </Suspense>
            </div>
          </div>
        </NLayoutContent>
      </NLayout>
    </div>
    <Permission :visible="_needPermission" />
  </div>
</template>

<style scoped>
.workspace-shell {
  position: relative;
  height: 100vh;
  min-height: 100vh;
  height: 100dvh;
  min-height: 100dvh;
}

.workspace-shell::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(circle at 18% 12%, rgba(125, 177, 153, 0.12), transparent 24%),
    radial-gradient(circle at 82% 8%, rgba(131, 170, 165, 0.1), transparent 18%);
}

.workspace-frame {
  position: relative;
  overflow: hidden;
  border: 1px solid var(--app-border-soft);
  border-radius: 2rem;
  background: rgba(250, 252, 249, 0.24);
  box-shadow: var(--app-shadow-lg);
}

.workspace-frame::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.12), transparent 18%),
    radial-gradient(circle at top right, rgba(131, 170, 165, 0.08), transparent 22%);
}

.workspace-frame-mobile {
  border-radius: 1.5rem;
  box-shadow: var(--app-shadow-md);
}

.workspace-layout {
  background: transparent;
}

.workspace-surface {
  background: linear-gradient(180deg, var(--app-panel), var(--app-panel-strong));
  backdrop-filter: blur(20px);
}

.workspace-content {
  background: transparent;
}

.workspace-content-inner {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.workspace-router {
  flex: 1 1 auto;
  min-height: 0;
}

.backend-status-banner {
  position: relative;
  z-index: 2;
  margin: 1rem 1rem 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border: 1px solid rgba(196, 148, 61, 0.24);
  border-radius: 1.25rem;
  background: linear-gradient(135deg, rgba(255, 249, 237, 0.94), rgba(249, 244, 229, 0.88));
  box-shadow: 0 12px 30px rgba(97, 74, 24, 0.07);
  padding: 0.95rem 1rem;
}

.backend-status-banner-mobile {
  margin: 0.75rem 0.75rem 0;
  align-items: flex-start;
  flex-direction: column;
}

.backend-status-copy {
  min-width: 0;
}

.backend-status-eyebrow {
  margin: 0;
  color: rgb(133 94 33);
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.backend-status-text,
.backend-status-hint {
  margin: 0.2rem 0 0;
  color: rgba(103, 74, 27, 0.92);
  line-height: 1.5;
}

.backend-status-text {
  font-weight: 600;
}

.backend-status-hint {
  color: rgba(120, 90, 42, 0.82);
  font-size: 0.92rem;
}

.backend-status-action {
  flex-shrink: 0;
}

:deep(.workspace-surface .n-layout-scroll-container),
:deep(.workspace-content .n-layout-scroll-container) {
  background: transparent;
}

:global(html.dark) .workspace-shell::before {
  background:
    radial-gradient(circle at 18% 12%, rgba(125, 177, 153, 0.14), transparent 24%),
    radial-gradient(circle at 82% 8%, rgba(131, 170, 165, 0.12), transparent 22%);
}

:global(html.dark) .workspace-frame {
  border-color: var(--app-border-soft);
  background: rgba(18, 25, 22, 0.2);
  box-shadow: var(--app-shadow-lg);
}

:global(html.dark) .workspace-frame::after {
  background:
    linear-gradient(180deg, rgba(230, 238, 232, 0.03), transparent 18%),
    radial-gradient(circle at top right, rgba(131, 170, 165, 0.1), transparent 24%);
}

:global(html.dark) .workspace-frame-mobile {
  box-shadow: var(--app-shadow-md);
}

:global(html.dark) .workspace-surface {
  background: linear-gradient(180deg, var(--app-panel), var(--app-panel-strong));
}

:global(html.dark) .backend-status-banner {
  border-color: rgba(200, 153, 74, 0.22);
  background: linear-gradient(135deg, rgba(65, 48, 24, 0.9), rgba(50, 40, 23, 0.8));
  box-shadow: 0 16px 34px rgba(0, 0, 0, 0.2);
}

:global(html.dark) .backend-status-eyebrow {
  color: rgb(253, 186, 116);
}

:global(html.dark) .backend-status-text {
  color: rgba(255, 237, 213, 0.96);
}

:global(html.dark) .backend-status-hint {
  color: rgba(254, 215, 170, 0.82);
}
</style>
