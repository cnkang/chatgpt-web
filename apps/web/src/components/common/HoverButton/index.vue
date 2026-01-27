<script setup lang="ts">
import type { PopoverPlacement } from 'naive-ui'
import { NTooltip } from 'naive-ui'
import { computed } from 'vue'
import Button from './Button.vue'

interface Props {
  tooltip?: string
  placement?: PopoverPlacement
}

// Use reactive props destructuring (Vue 3.5+ feature)
const { tooltip = '', placement = 'bottom' } = defineProps<Props>()

// Use defineEmits with modern syntax
const emit = defineEmits<{
  click: []
}>()

const showTooltip = computed(() => Boolean(tooltip))

function handleClick() {
  emit('click')
}
</script>

<template>
  <div v-if="showTooltip">
    <NTooltip :placement="placement" trigger="hover">
      <template #trigger>
        <Button @click="handleClick">
          <slot />
        </Button>
      </template>
      {{ tooltip }}
    </NTooltip>
  </div>
  <div v-else>
    <Button @click="handleClick">
      <slot />
    </Button>
  </div>
</template>
