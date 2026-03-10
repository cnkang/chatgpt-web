<script setup lang="ts">
import { defineAsyncComponent, ref } from 'vue'
import { HoverButton, SvgIcon, UserAvatar } from '@/components/common'

const Setting = defineAsyncComponent(() => import('@/components/common/Setting/index.vue'))

const show = ref(false)
</script>

<template>
  <footer
    class="sider-footer flex items-center justify-between min-w-0 p-4 overflow-hidden border-t dark:border-neutral-800"
  >
    <div class="sider-footer__identity flex-1 flex-shrink-0 overflow-hidden">
      <UserAvatar />
    </div>

    <HoverButton @click="show = true">
      <span class="sider-footer__icon text-xl text-[#4f555e] dark:text-white">
        <SvgIcon icon="ri:settings-4-line" />
      </span>
    </HoverButton>

    <Setting v-if="show" v-model:visible="show" />
  </footer>
</template>

<style scoped>
.sider-footer {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.72), rgba(248, 250, 252, 0.94));
  backdrop-filter: blur(14px);
}

.sider-footer__identity {
  padding: 0.62rem 0.78rem;
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 1.1rem;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.82), rgba(248, 250, 252, 0.64));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.9),
    0 10px 24px rgba(15, 23, 42, 0.05);
}

.sider-footer__icon {
  color: rgb(79 85 94);
}

.sider-footer :deep(button) {
  width: 2.45rem;
  height: 2.45rem;
  border: 1px solid rgba(226, 232, 240, 0.85);
  border-radius: 0.95rem;
  background: rgba(255, 255, 255, 0.78);
}

:global(.dark) .sider-footer {
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.5), rgba(15, 23, 42, 0.92));
}

:global(.dark) .sider-footer__identity {
  border-color: rgba(51, 65, 85, 0.76);
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.72), rgba(15, 23, 42, 0.58));
  box-shadow:
    inset 0 1px 0 rgba(148, 163, 184, 0.04),
    0 10px 24px rgba(2, 6, 23, 0.18);
}

:global(.dark) .sider-footer :deep(button) {
  border-color: rgba(51, 65, 85, 0.84);
  background: rgba(15, 23, 42, 0.74);
}
</style>
