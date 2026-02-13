<script setup lang='ts'>
import { defineAsyncComponent, ref } from 'vue'
import { HoverButton, SvgIcon, UserAvatar } from '@/components/common'

const Setting = defineAsyncComponent(() => import('@/components/common/Setting/index.vue'))

const show = ref(false)
</script>

<template>
  <footer class="chat-sider-footer">
    <div class="chat-sider-footer__avatar">
      <UserAvatar />
    </div>

    <HoverButton @click="show = true">
      <span class="chat-sider-footer__icon">
        <SvgIcon icon="ri:settings-4-line" />
      </span>
    </HoverButton>

    <Setting v-if="show" v-model:visible="show" />
  </footer>
</template>

<style scoped lang="less">
.chat-sider-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-width: 0;
  padding: 0.9rem 1rem;
  border-top: 1px solid var(--chat-border-color);
  background: color-mix(in oklab, var(--chat-panel-bg-strong) 75%, transparent);
}

.chat-sider-footer__avatar {
  flex: 1;
  flex-shrink: 0;
  min-width: 0;
  overflow: hidden;
}

.chat-sider-footer__icon {
  font-size: 1.2rem;
  color: var(--chat-text-secondary);
}

@supports not (color: color-mix(in oklab, white 50%, black)) {
  .chat-sider-footer {
    background: var(--chat-panel-bg-strong);
  }
}
</style>
