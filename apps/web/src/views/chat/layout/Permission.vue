<script setup lang="ts">
import { fetchVerify } from '@/api'
import Icon403 from '@/icons/403.vue'
import { useAuthStore } from '@/store'
import { NButton, NInput, NModal, useMessage } from 'naive-ui'
import { computed, ref } from 'vue'

interface Props {
  visible: boolean
}

defineProps<Props>()

const authStore = useAuthStore()

const ms = useMessage()

const loading = ref(false)
const token = ref('')

const disabled = computed(() => !token.value.trim() || loading.value)

async function handleVerify() {
  const secretKey = token.value.trim()

  if (!secretKey) return

  try {
    loading.value = true
    await fetchVerify(secretKey)
    authStore.setToken(secretKey)
    ms.success('success')
    globalThis.location.reload()
  } catch (error: unknown) {
    ms.error((error as Error).message ?? 'error')
    authStore.removeToken()
    token.value = ''
  } finally {
    loading.value = false
  }
}

function handlePress(event: KeyboardEvent) {
  if (event.isComposing) return

  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    handleVerify()
  }
}
</script>

<template>
  <NModal :show="visible" style="width: 90%; max-width: 640px">
    <div class="permission-modal">
      <div class="permission-modal__glow" />
      <div class="permission-modal__content">
        <header class="permission-modal__header">
          <span class="permission-modal__badge">Workspace Access</span>
          <h2 class="permission-modal__title">403</h2>
          <p class="permission-modal__copy">
            {{ $t('common.unauthorizedTips') }}
          </p>
          <Icon403 class="permission-modal__art" />
        </header>
        <div class="permission-modal__form">
          <div class="permission-modal__field">
            <span class="permission-modal__label">Access token</span>
            <NInput
              v-model:value="token"
              class="permission-modal__input"
              type="password"
              placeholder="Enter the workspace token"
              @keydown="handlePress"
            />
          </div>
          <NButton
            block
            class="permission-modal__button"
            type="primary"
            :disabled="disabled"
            :loading="loading"
            @click="handleVerify"
          >
            {{ $t('common.verify') }}
          </NButton>
        </div>
      </div>
    </div>
  </NModal>
</template>

<style scoped>
.permission-modal {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(226, 232, 240, 0.85);
  border-radius: 2rem;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(248, 250, 252, 0.94));
  box-shadow:
    0 36px 90px rgba(15, 23, 42, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.94);
}

.permission-modal__glow {
  position: absolute;
  inset: auto -10% 58% auto;
  width: 16rem;
  height: 16rem;
  border-radius: 9999px;
  background: radial-gradient(circle, rgba(79, 159, 114, 0.22), transparent 65%);
  pointer-events: none;
}

.permission-modal__content {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 2rem;
}

.permission-modal__header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.55rem;
  text-align: center;
}

.permission-modal__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.32rem 0.75rem;
  border-radius: 9999px;
  background: rgba(79, 159, 114, 0.12);
  color: rgb(32 90 60);
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.permission-modal__title {
  margin: 0;
  font-size: clamp(2.1rem, 5vw, 2.8rem);
  line-height: 1;
  font-weight: 700;
  color: rgb(15 23 42);
}

.permission-modal__copy {
  margin: 0;
  max-width: 30rem;
  color: rgb(100 116 139);
}

.permission-modal__art {
  width: min(15rem, 60vw);
}

.permission-modal__form {
  display: flex;
  flex-direction: column;
  gap: 0.95rem;
}

.permission-modal__field {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.permission-modal__label {
  font-size: 0.82rem;
  font-weight: 600;
  color: rgb(71 85 105);
  letter-spacing: 0.02em;
}

.permission-modal__input :deep(.n-input) {
  border-radius: 1rem;
  background: rgba(255, 255, 255, 0.78);
}

.permission-modal__button {
  height: 3rem;
  border: 0;
  border-radius: 1rem;
  background: linear-gradient(135deg, rgb(32 90 60), rgb(78 159 106));
  box-shadow: 0 18px 32px rgba(75, 158, 95, 0.24);
}

:global(.dark) .permission-modal {
  border-color: rgba(51, 65, 85, 0.76);
  background: linear-gradient(180deg, rgba(9, 14, 24, 0.96), rgba(15, 23, 42, 0.94));
  box-shadow:
    0 42px 100px rgba(2, 6, 23, 0.42),
    inset 0 1px 0 rgba(148, 163, 184, 0.05);
}

:global(.dark) .permission-modal__badge {
  background: rgba(79, 159, 114, 0.18);
  color: rgb(187 247 208);
}

:global(.dark) .permission-modal__title {
  color: rgb(241 245 249);
}

:global(.dark) .permission-modal__copy,
:global(.dark) .permission-modal__label {
  color: rgb(148 163 184);
}

:global(.dark) .permission-modal__input :deep(.n-input) {
  background: rgba(15, 23, 42, 0.82);
}
</style>
