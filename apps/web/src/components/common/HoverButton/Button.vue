<script setup lang="ts">
const emit = defineEmits<{
  click: []
}>()

function handleClick() {
  emit('click')
}
</script>

<template>
  <button
    class="hover-button-base app-interactive-surface flex items-center justify-center w-10 h-10 rounded-full"
    @click="handleClick"
  >
    <slot />
  </button>
</template>

<style scoped>
.hover-button-base {
  color: inherit;
}
</style>
