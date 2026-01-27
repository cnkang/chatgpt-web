# Web Package Documentation

The web package contains the frontend Vue.js application for ChatGPT Web, providing the user interface and client-side functionality.

## Package Overview

```json
{
  "name": "chatgpt-web",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite --port 1002",
    "build": "vue-tsc && vite build",
    "preview": "vite preview",
    "type-check": "vue-tsc --noEmit",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix"
  }
}
```

## Architecture

### Technology Stack

- **Vue.js 3.5+**: Composition API with `<script setup>`
- **TypeScript 5.9+**: Strict type checking
- **Vite 7+**: Build tool and dev server
- **Naive UI 2.43+**: UI component library
- **Pinia 3+**: State management
- **Vue Router 4+**: Client-side routing
- **Vue i18n 11+**: Internationalization

### Project Structure

```
src/
├── components/           # Reusable components
│   ├── common/          # Common UI components
│   ├── custom/          # Project-specific components
│   └── reasoning/       # AI reasoning components
├── views/               # Page-level components
│   ├── chat/           # Chat interface
│   └── exception/      # Error pages
├── store/              # Pinia stores
│   └── modules/        # Feature-based stores
├── router/             # Vue Router configuration
├── hooks/              # Composition functions
├── utils/              # Utility functions
├── api/                # API client
├── locales/            # i18n translations
├── styles/             # Global styles
├── typings/            # Type definitions
└── plugins/            # Vue plugins
```

## Core Components

### Chat Interface

#### ChatMessage Component

```vue
<!-- src/components/chat/ChatMessage.vue -->
<script setup lang="ts">
interface Props {
  message: ChatMessage
  loading?: boolean
  showActions?: boolean
}

interface Emits {
  copy: [content: string]
  delete: [id: string]
  regenerate: [id: string]
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  showActions: true,
})

const emit = defineEmits<Emits>()

const messageRef = ref<HTMLElement>()
const isUser = computed(() => props.message.role === 'user')
const isAssistant = computed(() => props.message.role === 'assistant')

function handleCopy() {
  navigator.clipboard.writeText(props.message.content)
  emit('copy', props.message.content)
}

function handleDelete() {
  emit('delete', props.message.id)
}

function handleRegenerate() {
  emit('regenerate', props.message.id)
}
</script>

<template>
  <div
    ref="messageRef"
    class="chat-message"
    :class="{
      'chat-message--user': isUser,
      'chat-message--assistant': isAssistant,
      'chat-message--loading': loading,
    }"
  >
    <div class="chat-message__avatar">
      <UserAvatar v-if="isUser" />
      <AssistantAvatar v-else />
    </div>

    <div class="chat-message__content">
      <div class="chat-message__header">
        <span class="chat-message__role">{{ message.role }}</span>
        <time class="chat-message__time">
          {{ formatTime(message.timestamp) }}
        </time>
      </div>

      <div class="chat-message__body">
        <MarkdownRenderer v-if="isAssistant" :content="message.content" :loading="loading" />
        <div v-else class="chat-message__text">
          {{ message.content }}
        </div>
      </div>

      <div v-if="showActions && !loading" class="chat-message__actions">
        <NButton text @click="handleCopy">
          <template #icon>
            <NIcon :component="Copy" />
          </template>
          Copy
        </NButton>

        <NButton v-if="isAssistant" text @click="handleRegenerate">
          <template #icon>
            <NIcon :component="Refresh" />
          </template>
          Regenerate
        </NButton>

        <NButton text type="error" @click="handleDelete">
          <template #icon>
            <NIcon :component="Trash" />
          </template>
          Delete
        </NButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-message {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  border-radius: 8px;
  transition: background-color 0.2s;
}

.chat-message:hover {
  background: var(--color-hover);
}

.chat-message--user {
  flex-direction: row-reverse;
}

.chat-message--user .chat-message__content {
  text-align: right;
}

.chat-message__avatar {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
}

.chat-message__content {
  flex: 1;
  min-width: 0;
}

.chat-message__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.chat-message__role {
  font-weight: 500;
  text-transform: capitalize;
}

.chat-message__body {
  margin-bottom: 0.5rem;
}

.chat-message__text {
  white-space: pre-wrap;
  word-break: break-word;
}

.chat-message__actions {
  display: flex;
  gap: 0.5rem;
  opacity: 0;
  transition: opacity 0.2s;
}

.chat-message:hover .chat-message__actions {
  opacity: 1;
}

.chat-message--loading .chat-message__body::after {
  content: '▋';
  animation: blink 1s infinite;
}

@keyframes blink {
  0%,
  50% {
    opacity: 1;
  }
  51%,
  100% {
    opacity: 0;
  }
}
</style>
```

#### ChatInput Component

```vue
<!-- src/components/chat/ChatInput.vue -->
<script setup lang="ts">
interface Emits {
  send: [content: string]
}

const emit = defineEmits<Emits>()

const input = ref('')
const textareaRef = ref<HTMLTextAreaElement>()
const isComposing = ref(false)

const canSend = computed(() => {
  return input.value.trim().length > 0 && !isComposing.value
})

function handleSend() {
  if (!canSend.value) return

  const content = input.value.trim()
  input.value = ''
  emit('send', content)

  // Reset textarea height
  if (textareaRef.value) {
    textareaRef.value.style.height = 'auto'
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    handleSend()
  }
}

function handleInput() {
  // Auto-resize textarea
  if (textareaRef.value) {
    textareaRef.value.style.height = 'auto'
    textareaRef.value.style.height = textareaRef.value.scrollHeight + 'px'
  }
}

function handleCompositionStart() {
  isComposing.value = true
}

function handleCompositionEnd() {
  isComposing.value = false
}

onMounted(() => {
  textareaRef.value?.focus()
})
</script>

<template>
  <div class="chat-input">
    <div class="chat-input__container">
      <textarea
        ref="textareaRef"
        v-model="input"
        class="chat-input__textarea"
        placeholder="Type your message..."
        rows="1"
        @keydown="handleKeydown"
        @input="handleInput"
        @compositionstart="handleCompositionStart"
        @compositionend="handleCompositionEnd"
      />

      <NButton type="primary" :disabled="!canSend" class="chat-input__send" @click="handleSend">
        <template #icon>
          <NIcon :component="Send" />
        </template>
      </NButton>
    </div>

    <div class="chat-input__footer">
      <span class="chat-input__hint">Press Enter to send, Shift+Enter for new line</span>
    </div>
  </div>
</template>

<style scoped>
.chat-input {
  padding: 1rem;
  border-top: 1px solid var(--color-border);
  background: var(--color-card);
}

.chat-input__container {
  display: flex;
  gap: 0.5rem;
  align-items: flex-end;
}

.chat-input__textarea {
  flex: 1;
  min-height: 40px;
  max-height: 200px;
  padding: 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-background);
  color: var(--color-text);
  font-family: inherit;
  font-size: 0.875rem;
  line-height: 1.5;
  resize: none;
  outline: none;
  transition: border-color 0.2s;
}

.chat-input__textarea:focus {
  border-color: var(--color-primary);
}

.chat-input__send {
  flex-shrink: 0;
  height: 40px;
  width: 40px;
  padding: 0;
}

.chat-input__footer {
  margin-top: 0.5rem;
  text-align: center;
}

.chat-input__hint {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}
</style>
```

### Markdown Renderer

```vue
<!-- src/components/common/MarkdownRenderer.vue -->
<script setup lang="ts">
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'
import katex from 'katex'
import mermaid from 'mermaid'

interface Props {
  content: string
  loading?: boolean
}

const props = defineProps<Props>()

const containerRef = ref<HTMLElement>()

// Configure markdown-it
const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  highlight: (str, lang) => {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(str, { language: lang }).value
      } catch {}
    }
    return ''
  },
})

// Add plugins
md.use(require('markdown-it-katex'))
md.use(require('@md-reader/markdown-it-mermaid'))

const renderedContent = computed(() => {
  if (props.loading) {
    return props.content + '<span class="cursor">▋</span>'
  }

  return md.render(props.content)
})

onMounted(() => {
  // Initialize mermaid
  mermaid.initialize({
    theme: 'default',
    startOnLoad: false,
  })
})

watch(renderedContent, async () => {
  await nextTick()

  // Render mermaid diagrams
  const mermaidElements = containerRef.value?.querySelectorAll('.mermaid')
  if (mermaidElements?.length) {
    mermaidElements.forEach(async (element, index) => {
      try {
        const { svg } = await mermaid.render(`mermaid-${index}`, element.textContent || '')
        element.innerHTML = svg
      } catch (error) {
        console.error('Mermaid rendering error:', error)
        element.innerHTML = `<pre>Error rendering diagram: ${error.message}</pre>`
      }
    })
  }
})
</script>

<template>
  <div ref="containerRef" class="markdown-renderer" v-html="renderedContent" />
</template>

<style scoped>
.markdown-renderer {
  line-height: 1.6;
  color: var(--color-text);
}

.markdown-renderer :deep(h1),
.markdown-renderer :deep(h2),
.markdown-renderer :deep(h3),
.markdown-renderer :deep(h4),
.markdown-renderer :deep(h5),
.markdown-renderer :deep(h6) {
  margin: 1.5rem 0 1rem;
  font-weight: 600;
  line-height: 1.3;
}

.markdown-renderer :deep(p) {
  margin: 1rem 0;
}

.markdown-renderer :deep(code) {
  padding: 0.2rem 0.4rem;
  background: var(--color-code-bg);
  border-radius: 4px;
  font-family: 'Fira Code', monospace;
  font-size: 0.875em;
}

.markdown-renderer :deep(pre) {
  margin: 1rem 0;
  padding: 1rem;
  background: var(--color-code-bg);
  border-radius: 8px;
  overflow-x: auto;
}

.markdown-renderer :deep(pre code) {
  padding: 0;
  background: none;
}

.markdown-renderer :deep(blockquote) {
  margin: 1rem 0;
  padding: 0.5rem 1rem;
  border-left: 4px solid var(--color-primary);
  background: var(--color-card);
  border-radius: 0 4px 4px 0;
}

.markdown-renderer :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 1rem 0;
}

.markdown-renderer :deep(th),
.markdown-renderer :deep(td) {
  padding: 0.5rem;
  border: 1px solid var(--color-border);
  text-align: left;
}

.markdown-renderer :deep(th) {
  background: var(--color-card);
  font-weight: 600;
}

.markdown-renderer :deep(.cursor) {
  animation: blink 1s infinite;
}

@keyframes blink {
  0%,
  50% {
    opacity: 1;
  }
  51%,
  100% {
    opacity: 0;
  }
}
</style>
```

## State Management

### Chat Store

```typescript
// src/store/modules/chat.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { apiClient } from '@/api/client'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
}

export interface ChatSession {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: Date
  updatedAt: Date
}

export const useChatStore = defineStore('chat', () => {
  const sessions = ref<ChatSession[]>([])
  const currentSessionId = ref<string | null>(null)
  const isLoading = ref(false)
  const streamingMessage = ref<string>('')

  const currentSession = computed(() => {
    return sessions.value.find(s => s.id === currentSessionId.value) || null
  })

  const currentMessages = computed(() => {
    return currentSession.value?.messages || []
  })

  function createSession(title?: string): ChatSession {
    const session: ChatSession = {
      id: generateId(),
      title: title || 'New Chat',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    sessions.value.unshift(session)
    currentSessionId.value = session.id

    return session
  }

  function selectSession(sessionId: string) {
    const session = sessions.value.find(s => s.id === sessionId)
    if (session) {
      currentSessionId.value = sessionId
    }
  }

  function deleteSession(sessionId: string) {
    const index = sessions.value.findIndex(s => s.id === sessionId)
    if (index !== -1) {
      sessions.value.splice(index, 1)

      if (currentSessionId.value === sessionId) {
        currentSessionId.value = sessions.value[0]?.id || null
      }
    }
  }

  function addMessage(message: Omit<ChatMessage, 'id' | 'timestamp'>): ChatMessage {
    const newMessage: ChatMessage = {
      id: generateId(),
      timestamp: new Date(),
      ...message,
    }

    if (currentSession.value) {
      currentSession.value.messages.push(newMessage)
      currentSession.value.updatedAt = new Date()

      // Update title based on first user message
      if (message.role === 'user' && currentSession.value.messages.length === 1) {
        currentSession.value.title =
          message.content.slice(0, 50) + (message.content.length > 50 ? '...' : '')
      }
    }

    return newMessage
  }

  async function sendMessage(content: string): Promise<void> {
    if (!currentSession.value) {
      createSession()
    }

    // Add user message
    const userMessage = addMessage({
      role: 'user',
      content,
    })

    isLoading.value = true
    streamingMessage.value = ''

    try {
      // Add assistant message placeholder
      const assistantMessage = addMessage({
        role: 'assistant',
        content: '',
      })

      // Send to API
      const response = await apiClient.sendMessage(currentMessages.value.slice(0, -1))

      // Update assistant message
      assistantMessage.content = response.message.content
      currentSession.value!.updatedAt = new Date()
    } catch (error) {
      // Remove the placeholder assistant message on error
      if (currentSession.value) {
        currentSession.value.messages.pop()
      }
      throw error
    } finally {
      isLoading.value = false
      streamingMessage.value = ''
    }
  }

  function deleteMessage(messageId: string) {
    if (currentSession.value) {
      const index = currentSession.value.messages.findIndex(m => m.id === messageId)
      if (index !== -1) {
        currentSession.value.messages.splice(index, 1)
        currentSession.value.updatedAt = new Date()
      }
    }
  }

  function clearCurrentSession() {
    if (currentSession.value) {
      currentSession.value.messages = []
      currentSession.value.updatedAt = new Date()
    }
  }

  // Persistence
  function saveSessions() {
    localStorage.setItem('chat_sessions', JSON.stringify(sessions.value))
    localStorage.setItem('current_session_id', currentSessionId.value || '')
  }

  function loadSessions() {
    try {
      const savedSessions = localStorage.getItem('chat_sessions')
      if (savedSessions) {
        const parsed = JSON.parse(savedSessions)
        sessions.value = parsed.map((s: any) => ({
          ...s,
          createdAt: new Date(s.createdAt),
          updatedAt: new Date(s.updatedAt),
          messages: s.messages.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp),
          })),
        }))
      }

      const savedCurrentId = localStorage.getItem('current_session_id')
      if (savedCurrentId && sessions.value.find(s => s.id === savedCurrentId)) {
        currentSessionId.value = savedCurrentId
      }
    } catch (error) {
      console.error('Failed to load sessions:', error)
    }
  }

  // Auto-save on changes
  watch(
    [sessions, currentSessionId],
    () => {
      saveSessions()
    },
    { deep: true },
  )

  // Load on initialization
  loadSessions()

  return {
    sessions: readonly(sessions),
    currentSession,
    currentMessages,
    currentSessionId: readonly(currentSessionId),
    isLoading: readonly(isLoading),
    streamingMessage: readonly(streamingMessage),
    createSession,
    selectSession,
    deleteSession,
    addMessage,
    sendMessage,
    deleteMessage,
    clearCurrentSession,
  }
})

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}
```

## API Integration

### API Client

```typescript
// src/api/client.ts
import { useAuthStore } from '@/store/modules/auth'
import { useErrorStore } from '@/store/modules/error'
import type { ChatMessage, ChatResponse } from '@/types/chat'

export class APIClient {
  private baseURL: string

  constructor(baseURL: string = '/api') {
    this.baseURL = baseURL
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const authStore = useAuthStore()
    const errorStore = useErrorStore()

    const url = `${this.baseURL}${endpoint}`
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...authStore.getAuthHeaders(),
        ...options.headers,
      },
    }

    try {
      const response = await fetch(url, config)

      // Update rate limit info
      const rateLimitStore = useRateLimitStore()
      rateLimitStore.updateServerLimits(response.headers)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: 'UNKNOWN_ERROR',
          message: `HTTP ${response.status}: ${response.statusText}`,
        }))

        if (response.status === 401) {
          authStore.clearToken()
        }

        if (response.status === 429) {
          rateLimitStore.handleRateLimitError()
        }

        errorStore.handleAPIError(errorData, endpoint)
        throw new Error(errorData.message)
      }

      return await response.json()
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        errorStore.handleNetworkError(error as Error, endpoint)
      }

      throw error
    }
  }

  async sendMessage(messages: ChatMessage[]): Promise<ChatResponse> {
    return this.request<ChatResponse>('/chat', {
      method: 'POST',
      body: JSON.stringify({ messages }),
    })
  }

  async getModels(): Promise<string[]> {
    const response = await this.request<{ models: string[] }>('/models')
    return response.models
  }

  async getProviderStatus(): Promise<any> {
    return this.request('/provider/status')
  }
}

export const apiClient = new APIClient()
```

## Routing

### Router Configuration

```typescript
// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/store/modules/auth'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/chat/index.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/chat/:sessionId?',
    name: 'Chat',
    component: () => import('@/views/chat/index.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('@/views/settings/index.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/auth/Login.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/exception/404.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// Navigation guards
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()

  // Check authentication requirement
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next({ name: 'Login', query: { redirect: to.fullPath } })
    return
  }

  // Redirect to home if already authenticated and trying to access login
  if (to.name === 'Login' && authStore.isAuthenticated) {
    next({ name: 'Home' })
    return
  }

  next()
})

export default router
```

## Build Configuration

### Vite Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],

  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },

  server: {
    port: 1002,
    proxy: {
      '/api': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
    },
  },

  build: {
    target: 'esnext',
    outDir: 'dist',
    assetsDir: 'assets',

    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          vue: ['vue', 'vue-router', 'pinia'],
          ui: ['naive-ui'],
          utils: ['markdown-it', 'highlight.js', 'katex'],

          // Feature chunks
          chat: ['src/views/chat', 'src/components/chat', 'src/store/modules/chat'],
        },
      },
    },

    // Optimize for modern browsers
    cssCodeSplit: true,
    sourcemap: process.env.NODE_ENV === 'development',
  },

  optimizeDeps: {
    include: ['vue', 'vue-router', 'pinia', 'naive-ui', 'markdown-it', 'highlight.js', 'katex'],
  },
})
```

## Testing

### Component Testing

```typescript
// src/components/__tests__/ChatMessage.test.ts
import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import ChatMessage from '../chat/ChatMessage.vue'

describe('ChatMessage', () => {
  const mockMessage = {
    id: '1',
    role: 'user' as const,
    content: 'Hello world',
    timestamp: new Date('2024-01-15T10:30:00Z'),
  }

  it('renders user message correctly', () => {
    const wrapper = mount(ChatMessage, {
      props: { message: mockMessage },
    })

    expect(wrapper.text()).toContain('Hello world')
    expect(wrapper.classes()).toContain('chat-message--user')
  })

  it('renders assistant message correctly', () => {
    const assistantMessage = {
      ...mockMessage,
      role: 'assistant' as const,
    }

    const wrapper = mount(ChatMessage, {
      props: { message: assistantMessage },
    })

    expect(wrapper.classes()).toContain('chat-message--assistant')
  })

  it('emits copy event when copy button clicked', async () => {
    const wrapper = mount(ChatMessage, {
      props: { message: mockMessage },
    })

    await wrapper.find('[data-testid="copy-button"]').trigger('click')

    expect(wrapper.emitted('copy')).toEqual([['Hello world']])
  })
})
```

### Store Testing

```typescript
// src/store/__tests__/chat.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useChatStore } from '../modules/chat'

describe('Chat Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('creates new session', () => {
    const store = useChatStore()

    const session = store.createSession('Test Chat')

    expect(session.title).toBe('Test Chat')
    expect(store.currentSessionId).toBe(session.id)
    expect(store.sessions).toHaveLength(1)
  })

  it('adds message to current session', () => {
    const store = useChatStore()
    store.createSession()

    const message = store.addMessage({
      role: 'user',
      content: 'Hello',
    })

    expect(message.content).toBe('Hello')
    expect(store.currentMessages).toHaveLength(1)
  })

  it('deletes session correctly', () => {
    const store = useChatStore()
    const session = store.createSession()

    store.deleteSession(session.id)

    expect(store.sessions).toHaveLength(0)
    expect(store.currentSessionId).toBeNull()
  })
})
```

## Performance Optimization

### Code Splitting

```typescript
// Lazy load heavy components
const MermaidRenderer = defineAsyncComponent(() => import('@/components/MermaidRenderer.vue'))
const CodeEditor = defineAsyncComponent(() => import('@/components/CodeEditor.vue'))

// Route-based code splitting
const routes = [
  {
    path: '/chat',
    component: () => import('@/views/chat/index.vue'),
  },
  {
    path: '/settings',
    component: () => import('@/views/settings/index.vue'),
  },
]
```

### Virtual Scrolling

```vue
<!-- For large message lists -->
<script setup lang="ts">
import { VirtualList } from '@tanstack/vue-virtual'

const messages = ref<ChatMessage[]>([])
const containerRef = ref<HTMLElement>()

const virtualizer = computed(
  () =>
    new VirtualList({
      count: messages.value.length,
      getScrollElement: () => containerRef.value,
      estimateSize: () => 100,
      overscan: 5,
    }),
)
</script>

<template>
  <div ref="containerRef" class="message-list">
    <div
      :style="{
        height: `${virtualizer.getTotalSize()}px`,
        width: '100%',
        position: 'relative',
      }"
    >
      <div
        v-for="item in virtualizer.getVirtualItems()"
        :key="item.key"
        :style="{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: `${item.size}px`,
          transform: `translateY(${item.start}px)`,
        }"
      >
        <ChatMessage :message="messages[item.index]" />
      </div>
    </div>
  </div>
</template>
```

## Deployment

### Build for Production

```bash
# Type check
pnpm type-check

# Build
pnpm build

# Preview build
pnpm preview
```

### Environment Variables

```bash
# .env.production (repo root)
VITE_GLOB_API_URL=/api
VITE_APP_API_BASE_URL=https://api.yourdomain.com/
VITE_GLOB_APP_PWA=true
```

The web package provides a modern, responsive, and feature-rich frontend for ChatGPT Web with comprehensive TypeScript support, efficient state management, and optimized performance.
