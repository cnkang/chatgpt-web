<script setup lang='ts'>
import { NLayout, NLayoutContent } from 'naive-ui'
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useBasicLayout } from '@/hooks/useBasicLayout'
import { useAppStore, useAuthStore, useChatStore } from '@/store'
import Permission from './Permission.vue'
import Sider from './sider/index.vue'

const router = useRouter()
const appStore = useAppStore()
const chatStore = useChatStore()
const authStore = useAuthStore()

router.replace({ name: 'Chat', params: { uuid: chatStore.active } })

const { isMobile } = useBasicLayout()

const collapsed = computed(() => appStore.siderCollapsed)

const needPermission = computed(() => !!authStore.session?.auth && !authStore.token)
</script>

<template>
  <div
    class="chat-layout-page"
    :class="{
      'chat-layout-page--mobile': isMobile,
    }"
  >
    <div class="chat-layout-shell">
      <NLayout class="chat-layout" :class="{ 'chat-layout--sider-open': !isMobile && !collapsed }" has-sider>
        <Sider />
        <NLayoutContent class="chat-layout-content">
          <RouterView v-slot="{ Component, route }">
            <component :is="Component" :key="route.fullPath" />
          </RouterView>
        </NLayoutContent>
      </NLayout>
    </div>
    <Permission :visible="needPermission" />
  </div>
</template>

<style scoped lang="less">
.chat-layout-page {
  position: relative;
  height: 100%;
  padding: clamp(0.75rem, 1.8vw, 1.5rem);
  background:
    radial-gradient(1400px circle at 100% -10%, rgba(0, 162, 255, 0.16), transparent 42%),
    radial-gradient(1200px circle at 0% 100%, rgba(51, 214, 166, 0.14), transparent 40%),
    linear-gradient(160deg, var(--chat-app-bg) 0%, var(--chat-app-bg-elevated) 100%);
  transition: padding 0.25s ease;
}

.chat-layout-shell {
  position: relative;
  height: 100%;
  overflow: hidden;
  border: 1px solid var(--chat-border-color);
  border-radius: 1.25rem;
  background: var(--chat-panel-bg);
  box-shadow: var(--chat-shadow-soft);
  backdrop-filter: blur(10px);
}

.chat-layout {
  z-index: 10;
  height: 100%;
  transition: padding-left 0.25s ease;
}

.chat-layout--sider-open {
  padding-left: var(--chat-sider-width);
}

.chat-layout-content {
  height: 100%;
  background: transparent;
}

.chat-layout-page--mobile {
  padding: 0;
}

.chat-layout-page--mobile .chat-layout-shell {
  border: none;
  border-radius: 0;
  box-shadow: none;
  backdrop-filter: none;
}

@media (min-width: 640px) and (max-width: 1023.98px) {
  .chat-layout--sider-open {
    padding-left: var(--chat-sider-width-tablet);
  }
}
</style>
