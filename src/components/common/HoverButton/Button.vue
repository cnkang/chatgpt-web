<script setup lang='ts'>
interface Emit {
  (e: 'click'): void
}

const emit = defineEmits<Emit>()

function handleClick() {
  emit('click')
}
</script>

<template>
  <button
    class="hover-button"
    @click="handleClick"
  >
    <slot />
  </button>
</template>

<style scoped lang="less">
.hover-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border: 1px solid transparent;
  border-radius: 0.75rem;
  background: transparent;
  transition: all 0.2s ease;
}

.hover-button:hover {
  border-color: var(--chat-border-color);
  background: color-mix(in oklab, var(--chat-panel-bg-soft) 90%, transparent);
  transform: translateY(-1px);
}

.hover-button:active {
  transform: translateY(0);
}

@supports not (color: color-mix(in oklab, white 50%, black)) {
  .hover-button:hover {
    background: var(--chat-panel-bg-soft);
  }
}
</style>
