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
      <NLayout class="workspace-surface z-40 transition" :class="getContainerClass" has-sider>
        <Sider />
        <NLayoutContent class="workspace-content h-full">
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
        </NLayoutContent>
      </NLayout>
    </div>
    <Permission :visible="_needPermission" />
  </div>
</template>

<style scoped>
.workspace-shell {
  position: relative;
}

.workspace-shell::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.28), transparent 28%),
    radial-gradient(circle at 20% 12%, rgba(79, 159, 114, 0.12), transparent 24%);
}

.workspace-frame {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 2rem;
  box-shadow:
    0 28px 80px rgba(15, 23, 42, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.92);
}

.workspace-frame::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(circle at top right, rgba(191, 219, 254, 0.12), transparent 24%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.06), transparent 30%);
}

.workspace-frame-mobile {
  border-radius: 1.5rem;
  box-shadow:
    0 18px 40px rgba(15, 23, 42, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.88);
}

.workspace-layout {
  background: transparent;
}

.workspace-surface {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.72), rgba(248, 250, 252, 0.9));
  backdrop-filter: blur(24px);
}

.workspace-content {
  background: transparent;
}

.backend-status-banner {
  position: relative;
  z-index: 2;
  margin: 1rem 1rem 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border: 1px solid rgba(245, 158, 11, 0.24);
  border-radius: 1.25rem;
  background: linear-gradient(135deg, rgba(255, 251, 235, 0.96), rgba(255, 247, 237, 0.88));
  box-shadow: 0 12px 30px rgba(245, 158, 11, 0.08);
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
  color: rgb(180, 83, 9);
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.backend-status-text,
.backend-status-hint {
  margin: 0.2rem 0 0;
  color: rgba(120, 53, 15, 0.92);
  line-height: 1.5;
}

.backend-status-text {
  font-weight: 600;
}

.backend-status-hint {
  color: rgba(146, 64, 14, 0.82);
  font-size: 0.92rem;
}

.backend-status-action {
  flex-shrink: 0;
}

:deep(.workspace-surface .n-layout-scroll-container),
:deep(.workspace-content .n-layout-scroll-container) {
  background: transparent;
}

:global(.dark) .workspace-shell::before {
  background:
    linear-gradient(135deg, rgba(148, 163, 184, 0.06), transparent 28%),
    radial-gradient(circle at 20% 12%, rgba(79, 159, 114, 0.12), transparent 24%);
}

:global(.dark) .workspace-frame {
  border-color: rgba(51, 65, 85, 0.8);
  box-shadow:
    0 30px 90px rgba(2, 6, 23, 0.34),
    inset 0 1px 0 rgba(148, 163, 184, 0.05);
}

:global(.dark) .workspace-frame::after {
  background:
    radial-gradient(circle at top right, rgba(30, 64, 175, 0.12), transparent 26%),
    linear-gradient(180deg, rgba(148, 163, 184, 0.04), transparent 28%);
}

:global(.dark) .workspace-frame-mobile {
  box-shadow:
    0 18px 42px rgba(2, 6, 23, 0.24),
    inset 0 1px 0 rgba(148, 163, 184, 0.04);
}

:global(.dark) .workspace-surface {
  background: linear-gradient(180deg, rgba(9, 14, 24, 0.72), rgba(15, 23, 42, 0.92));
}

:global(.dark) .backend-status-banner {
  border-color: rgba(251, 191, 36, 0.2);
  background: linear-gradient(135deg, rgba(67, 20, 7, 0.92), rgba(88, 28, 10, 0.78));
  box-shadow: 0 16px 34px rgba(0, 0, 0, 0.22);
}

:global(.dark) .backend-status-eyebrow {
  color: rgb(253, 186, 116);
}

:global(.dark) .backend-status-text {
  color: rgba(255, 237, 213, 0.96);
}

:global(.dark) .backend-status-hint {
  color: rgba(254, 215, 170, 0.82);
}
</style>
