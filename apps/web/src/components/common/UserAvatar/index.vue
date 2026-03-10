<script setup lang="ts">
import { NAvatar } from 'naive-ui'
import { computed } from 'vue'
import defaultAvatar from '@/assets/avatar.jpg'
import { useUserStore } from '@/store'
import { isString } from '@/utils/is'

const userStore = useUserStore()

const userInfo = computed(() => userStore.userInfo)
</script>

<template>
  <div class="user-badge">
    <div class="user-badge__avatar">
      <template v-if="isString(userInfo.avatar) && userInfo.avatar.length > 0">
        <NAvatar size="large" round :src="userInfo.avatar" :fallback-src="defaultAvatar" />
      </template>
      <template v-else>
        <NAvatar size="large" round :src="defaultAvatar" />
      </template>
    </div>
    <div class="user-badge__copy">
      <div class="user-badge__meta">
        <span class="user-badge__status" />
        <span class="user-badge__eyebrow">Workspace</span>
      </div>
      <h2 class="user-badge__name">
        {{ userInfo.name ?? '数字小助手' }}
      </h2>
      <p class="user-badge__description">
        <span v-if="isString(userInfo.description) && userInfo.description !== ''">
          {{ userInfo.description }}
        </span>
      </p>
    </div>
  </div>
</template>

<style scoped>
.user-badge {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  min-width: 0;
}

.user-badge__avatar {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
}

.user-badge__avatar::after {
  content: '';
  position: absolute;
  inset: -0.22rem;
  border-radius: 9999px;
  border: 1px solid rgba(110, 231, 183, 0.28);
  pointer-events: none;
}

.user-badge__copy {
  flex: 1 1 auto;
  min-width: 0;
}

.user-badge__meta {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  margin-bottom: 0.1rem;
}

.user-badge__status {
  width: 0.45rem;
  height: 0.45rem;
  border-radius: 9999px;
  background: rgb(79 159 114);
  box-shadow: 0 0 0 4px rgba(79, 159, 114, 0.12);
}

.user-badge__eyebrow {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgb(100 116 139);
}

.user-badge__name {
  overflow: hidden;
  margin: 0;
  font-size: 0.96rem;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: rgb(15 23 42);
}

.user-badge__description {
  overflow: hidden;
  margin: 0.05rem 0 0;
  font-size: 0.76rem;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: rgb(100 116 139);
}

:global(.dark) .user-badge__eyebrow,
:global(.dark) .user-badge__description {
  color: rgb(148 163 184);
}

:global(.dark) .user-badge__avatar::after {
  border-color: rgba(52, 211, 153, 0.22);
}

:global(.dark) .user-badge__name {
  color: rgb(241 245 249);
}
</style>
