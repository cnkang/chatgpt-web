<script setup lang="ts">
import { SvgIcon } from '@/components/common'
import { useAuthStore } from '@/store'
import { NModal, NTabPane, NTabs } from 'naive-ui'
import { computed, ref } from 'vue'
import About from './About.vue'
import Advanced from './Advanced.vue'
import General from './General.vue'

interface Props {
  visible: boolean
}

// Use reactive props destructuring (Vue 3.5+ feature)
const { visible } = defineProps<Props>()

// Use defineEmits with modern syntax and defineModel for v-model
const emit = defineEmits<{
  'update:visible': [visible: boolean]
}>()

const authStore = useAuthStore()

const isChatGPTAPI = computed<boolean>(() => !!authStore.isChatGPTAPI)

const active = ref('General')

const show = computed({
  get() {
    return visible
  },
  set(visible: boolean) {
    emit('update:visible', visible)
  },
})
</script>

<template>
  <NModal
    v-model:show="show"
    :auto-focus="false"
    preset="card"
    style="width: 95%; max-width: 640px"
  >
    <div>
      <NTabs v-model:value="active" type="line" animated>
        <NTabPane name="General" tab="General">
          <template #tab>
            <SvgIcon class="text-lg" icon="ri:file-user-line" />
            <span class="ml-2">{{ $t('setting.general') }}</span>
          </template>
          <div class="min-h-[100px]">
            <General />
          </div>
        </NTabPane>
        <NTabPane v-if="isChatGPTAPI" name="Advanced" tab="Advanced">
          <template #tab>
            <SvgIcon class="text-lg" icon="ri:equalizer-line" />
            <span class="ml-2">{{ $t('setting.advanced') }}</span>
          </template>
          <div class="min-h-[100px]">
            <Advanced />
          </div>
        </NTabPane>
        <NTabPane name="Config" tab="Config">
          <template #tab>
            <SvgIcon class="text-lg" icon="ri:list-settings-line" />
            <span class="ml-2">{{ $t('setting.config') }}</span>
          </template>
          <About />
        </NTabPane>
      </NTabs>
    </div>
  </NModal>
</template>
