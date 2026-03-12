<script setup lang="ts">
import { defineAsyncComponent, ref } from 'vue'
import { HoverButton, SvgIcon, UserAvatar } from '@/components/common'

const Setting = defineAsyncComponent(() => import('@/components/common/Setting/index.vue'))

const show = ref(false)
</script>

<template>
  <footer class="sider-footer min-w-0 p-4 overflow-hidden border-t dark:border-neutral-800">
    <div class="sider-footer__surface">
      <div class="sider-footer__identity flex-1 min-w-0 overflow-hidden">
        <UserAvatar />
      </div>

      <span class="sider-footer__divider" aria-hidden="true" />

      <HoverButton class="sider-footer__setting-btn" @click="show = true">
        <span class="sider-footer__icon">
          <SvgIcon icon="ri:settings-4-line" />
        </span>
      </HoverButton>
    </div>

    <Setting v-if="show" v-model:visible="show" />
  </footer>
</template>

<style scoped>
.sider-footer {
  background: linear-gradient(180deg, rgba(247, 249, 246, 0.72), rgba(243, 247, 242, 0.94));
  backdrop-filter: blur(14px);
}

.sider-footer__surface {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border: 1px solid var(--app-border-soft);
  border-radius: 1.1rem;
  background: linear-gradient(180deg, rgba(255, 255, 253, 0.82), rgba(245, 248, 244, 0.72));
  box-shadow: 0 10px 24px rgba(36, 50, 43, 0.05);
  padding: 0.48rem 0.52rem 0.48rem 0.66rem;
}

.sider-footer__identity {
  min-width: 0;
}

.sider-footer__divider {
  width: 1px;
  align-self: stretch;
  margin-block: 0.15rem;
  background: linear-gradient(180deg, transparent, var(--app-border-strong), transparent);
}

.sider-footer__icon {
  color: var(--app-text-2);
  font-size: 1rem;
}

.sider-footer__setting-btn {
  flex: 0 0 auto;
}

.sider-footer__setting-btn :deep(button) {
  width: 2.1rem;
  height: 2.1rem;
  border: 1px solid transparent;
  border-radius: 0.7rem;
  background: transparent;
  color: var(--app-text-2);
  box-shadow: none;
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease,
    color 0.2s ease,
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.sider-footer__setting-btn :deep(button):hover {
  transform: translateY(-0.5px);
  border-color: var(--app-border-soft);
  background: rgba(255, 255, 253, 0.76);
  color: var(--app-text-1);
}

.sider-footer__setting-btn :deep(button):active {
  transform: translateY(0);
  background: rgba(245, 248, 244, 0.86);
}

:global(html.dark) .sider-footer {
  background: linear-gradient(180deg, rgba(21, 30, 27, 0.52), rgba(20, 28, 25, 0.92));
}

:global(html.dark) .sider-footer__surface {
  border-color: var(--app-border-soft);
  background: linear-gradient(180deg, rgba(27, 37, 33, 0.76), rgba(23, 32, 29, 0.66));
  box-shadow: 0 10px 24px rgba(5, 10, 8, 0.18);
}

:global(html.dark) .sider-footer__setting-btn :deep(button) {
  border-color: transparent;
  background: transparent;
  color: var(--app-text-2);
}

:global(html.dark) .sider-footer__setting-btn :deep(button):hover {
  border-color: var(--app-border-soft);
  background: rgba(34, 46, 41, 0.74);
  color: var(--app-text-1);
}

:global(html.dark) .sider-footer__setting-btn :deep(button):active {
  background: rgba(30, 41, 36, 0.86);
}
</style>
