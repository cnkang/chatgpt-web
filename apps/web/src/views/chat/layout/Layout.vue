<script setup lang="ts">
import { LoadingSpinner } from '@/components/common'
import { useBasicLayout } from '@/hooks/useBasicLayout'
import { useAppStore, useAuthStore, useChatStore } from '@/store'
import { NLayout, NLayoutContent } from 'naive-ui'
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

const getMobileClass = computed(() => {
  if (isMobile.value) return ['rounded-none', 'shadow-none']
  return ['border', 'rounded-md', 'shadow-md', 'dark:border-neutral-800']
})

const getContainerClass = computed(() => {
  return ['h-full', { 'pl-[260px]': !isMobile.value && !collapsed.value }]
})
</script>

<template>
  <div class="h-full dark:bg-[#24272e] transition-all" :class="[isMobile ? 'p-0' : 'p-4']">
    <div class="h-full overflow-hidden" :class="getMobileClass">
      <NLayout class="z-40 transition" :class="getContainerClass" has-sider>
        <Sider />
        <NLayoutContent class="h-full">
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
