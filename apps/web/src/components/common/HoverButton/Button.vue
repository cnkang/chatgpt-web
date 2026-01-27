<script setup lang="ts">
// Use defineEmits with modern syntax
const emit = defineEmits<{
  click: []
}>()

function handleClick() {
  emit('click')
}
</script>

<template>
  <button
    class="flex items-center justify-center w-10 h-10 transition rounded-full hover:bg-neutral-100 dark:hover:bg-[#414755]"
    @click="handleClick"
  >
    <slot />
  </button>
</template>
