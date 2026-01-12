# Code Style Guide

This document outlines the coding standards and style guidelines for the ChatGPT Web project.

## General Principles

- **Consistency**: Follow established patterns throughout the codebase
- **Readability**: Write code that is easy to read and understand
- **Maintainability**: Structure code for easy maintenance and updates
- **Type Safety**: Leverage TypeScript for better code quality

## TypeScript Standards

### Strict Configuration

- Zero TypeScript errors policy
- Strict type checking enabled
- No implicit any types

```typescript
// ✅ Good - Explicit types
interface ChatMessage {
  id: string
  content: string
  role: 'user' | 'assistant'
  timestamp: Date
}

// ❌ Bad - Implicit any
function processMessage(message) {
  return message.content
}
```

### Type Definitions

- Use interfaces for object shapes
- Use type aliases for unions and complex types
- Export types from dedicated files

```typescript
// types/chat.ts
export interface ChatSession {
  id: string
  messages: ChatMessage[]
  model: string
  createdAt: Date
}

export type ChatRole = 'user' | 'assistant' | 'system'
```

## Vue.js Standards

### Composition API

- Use Composition API for all new components
- Prefer `<script setup>` syntax
- Use reactive props destructuring

```vue
<script setup lang="ts">
interface Props {
  message: ChatMessage
  loading?: boolean
}

const { message, loading = false } = defineProps<Props>()

const emit = defineEmits<{
  send: [content: string]
  delete: [id: string]
}>()
</script>
```

### Component Structure

```vue
<script setup lang="ts">
// 1. Imports
import { ref, computed, onMounted } from 'vue'
import type { ChatMessage } from '@/types/chat'

// 2. Props and Emits
interface Props {
  messages: ChatMessage[]
}

const props = defineProps<Props>()
const emit = defineEmits<{
  update: [messages: ChatMessage[]]
}>()

// 3. Reactive state
const loading = ref(false)
const input = ref('')

// 4. Computed properties
const messageCount = computed(() => props.messages.length)

// 5. Methods
function sendMessage() {
  // Implementation
}

// 6. Lifecycle hooks
onMounted(() => {
  // Initialization
})
</script>

<template>
  <!-- Template content -->
</template>

<style scoped>
/* Component styles */
</style>
```

### Template Guidelines

- Use kebab-case for component names in templates
- Use v-bind shorthand (`:`) and v-on shorthand (`@`)
- Prefer v-show over v-if for frequently toggled elements

```vue
<template>
  <div class="chat-container">
    <chat-message
      v-for="message in messages"
      :key="message.id"
      :message="message"
      @delete="handleDelete"
    />
    <loading-spinner v-show="loading" />
  </div>
</template>
```

## ESLint Configuration

### Rules Overview

- Uses `@antfu/eslint-config` as base
- Zero warnings policy
- Automatic formatting with Prettier integration

### Key Rules

```javascript
// eslint.config.js
export default antfu({
  vue: true,
  typescript: true,
  rules: {
    // Enforce consistent code style
    'vue/component-name-in-template-casing': ['error', 'kebab-case'],
    'vue/define-props-declaration': ['error', 'type-based'],

    // TypeScript specific
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/explicit-function-return-type': 'off',

    // Import organization
    'import/order': [
      'error',
      {
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling'],
        'newlines-between': 'always',
      },
    ],
  },
})
```

## Naming Conventions

### Files and Directories

- **Components**: PascalCase (`ChatMessage.vue`)
- **Composables**: camelCase with `use` prefix (`useChat.ts`)
- **Utilities**: camelCase (`formatDate.ts`)
- **Types**: PascalCase (`ChatTypes.ts`)
- **Directories**: camelCase (`chatComponents/`)

### Variables and Functions

```typescript
// ✅ Good naming
const chatMessages = ref<ChatMessage[]>([])
const isLoading = ref(false)

function sendChatMessage(content: string): Promise<void> {
  // Implementation
}

const useChat = () => {
  // Composable logic
}

// ❌ Bad naming
const msgs = ref([])
const flag = ref(false)

function send(c: string) {
  // Implementation
}
```

### Constants

```typescript
// ✅ Good - SCREAMING_SNAKE_CASE for constants
const MAX_MESSAGE_LENGTH = 4000
const API_ENDPOINTS = {
  CHAT: '/api/chat',
  MODELS: '/api/models',
} as const

// ✅ Good - Enum-like objects
const ChatRole = {
  USER: 'user',
  ASSISTANT: 'assistant',
  SYSTEM: 'system',
} as const
```

## Import Organization

### Import Order

1. Node.js built-ins
2. External libraries
3. Internal modules (using `@/` alias)
4. Relative imports
5. Type-only imports (grouped separately)

```typescript
// ✅ Good import organization
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'

import { useChat } from '@/hooks/useChat'
import { formatMessage } from '@/utils/format'

import './ChatMessage.css'

import type { ChatMessage } from '@/types/chat'
import type { RouteLocationNormalized } from 'vue-router'
```

### Path Aliases

```typescript
// Use @ alias for src imports
import { ChatService } from '@/services/chat'
import { useAppStore } from '@/store/app'

// Avoid relative imports for distant files
// ❌ Bad
import { ChatService } from '../../../services/chat'

// ✅ Good
import { ChatService } from '@/services/chat'
```

## CSS and Styling

### Tailwind CSS Usage

- Use Tailwind utility classes primarily
- Create component classes for repeated patterns
- Use CSS custom properties for theming

```vue
<template>
  <div class="chat-message">
    <div class="message-header">
      <span class="message-role">{{ message.role }}</span>
      <time class="message-time">{{ formatTime(message.timestamp) }}</time>
    </div>
    <div class="message-content">
      {{ message.content }}
    </div>
  </div>
</template>

<style scoped>
.chat-message {
  @apply p-4 rounded-lg border border-gray-200 dark:border-gray-700;
}

.message-header {
  @apply flex justify-between items-center mb-2;
}

.message-role {
  @apply text-sm font-medium text-gray-600 dark:text-gray-400;
}

.message-time {
  @apply text-xs text-gray-500 dark:text-gray-500;
}

.message-content {
  @apply text-gray-900 dark:text-gray-100 leading-relaxed;
}
</style>
```

### CSS Custom Properties

```css
:root {
  --color-primary: #3b82f6;
  --color-primary-dark: #1d4ed8;
  --color-background: #ffffff;
  --color-background-dark: #1f2937;

  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
}
```

## Error Handling

### Frontend Error Handling

```typescript
// ✅ Good error handling
async function sendMessage(content: string) {
  try {
    setLoading(true)
    const response = await chatService.sendMessage(content)
    addMessage(response.message)
  } catch (error) {
    console.error('Failed to send message:', error)
    showErrorNotification('Failed to send message. Please try again.')
  } finally {
    setLoading(false)
  }
}

// Custom error types
class ChatError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
  ) {
    super(message)
    this.name = 'ChatError'
  }
}
```

### Backend Error Handling

```typescript
// Express error handling middleware
export const errorHandler = (error: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Request error:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
  })

  if (error instanceof ValidationError) {
    return res.status(400).json({
      error: 'Validation failed',
      details: error.details,
    })
  }

  res.status(500).json({
    error: 'Internal server error',
  })
}
```

## Testing Standards

### Unit Test Structure

```typescript
// tests/utils/formatDate.test.ts
import { describe, it, expect } from 'vitest'
import { formatDate } from '@/utils/formatDate'

describe('formatDate', () => {
  it('should format date correctly', () => {
    const date = new Date('2024-01-15T10:30:00Z')
    const result = formatDate(date)

    expect(result).toBe('Jan 15, 2024')
  })

  it('should handle invalid dates', () => {
    const result = formatDate(new Date('invalid'))

    expect(result).toBe('Invalid Date')
  })
})
```

### Component Testing

```typescript
// tests/components/ChatMessage.test.ts
import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import ChatMessage from '@/components/ChatMessage.vue'

describe('ChatMessage', () => {
  const mockMessage = {
    id: '1',
    content: 'Hello world',
    role: 'user' as const,
    timestamp: new Date('2024-01-15T10:30:00Z'),
  }

  it('should render message content', () => {
    const wrapper = mount(ChatMessage, {
      props: { message: mockMessage },
    })

    expect(wrapper.text()).toContain('Hello world')
    expect(wrapper.text()).toContain('user')
  })

  it('should emit delete event', async () => {
    const wrapper = mount(ChatMessage, {
      props: { message: mockMessage },
    })

    await wrapper.find('[data-testid="delete-button"]').trigger('click')

    expect(wrapper.emitted('delete')).toEqual([['1']])
  })
})
```

## Documentation Standards

### JSDoc Comments

````typescript
/**
 * Sends a chat message to the AI provider
 * @param content - The message content to send
 * @param options - Additional options for the request
 * @returns Promise that resolves to the AI response
 * @throws {ChatError} When the request fails or times out
 *
 * @example
 * ```typescript
 * const response = await sendMessage('Hello', { model: 'gpt-4' })
 * console.log(response.content)
 * ```
 */
async function sendMessage(content: string, options: ChatOptions = {}): Promise<ChatResponse> {
  // Implementation
}
````

### README Structure

Each package should have a comprehensive README:

```markdown
# Package Name

Brief description of the package purpose.

## Installation

\`\`\`bash
pnpm install
\`\`\`

## Usage

Basic usage examples.

## API Reference

Detailed API documentation.

## Contributing

Guidelines for contributing to this package.
```

## Performance Guidelines

### Bundle Size Optimization

- Use dynamic imports for large dependencies
- Implement code splitting at route level
- Tree-shake unused code

```typescript
// ✅ Good - Dynamic import
const MermaidRenderer = defineAsyncComponent(() => import('@/components/MermaidRenderer.vue'))

// ✅ Good - Conditional loading
if (shouldLoadMermaid) {
  const { default: mermaid } = await import('mermaid')
  mermaid.initialize(config)
}
```

### Memory Management

```typescript
// ✅ Good - Cleanup in onUnmounted
import { onUnmounted } from 'vue'

const intervalId = setInterval(() => {
  // Periodic task
}, 1000)

onUnmounted(() => {
  clearInterval(intervalId)
})
```

## Security Guidelines

### Input Validation

```typescript
// ✅ Good - Validate and sanitize input
import { z } from 'zod'

const MessageSchema = z.object({
  content: z.string().min(1).max(4000),
  role: z.enum(['user', 'assistant', 'system']),
})

function validateMessage(input: unknown): ChatMessage {
  return MessageSchema.parse(input)
}
```

### XSS Prevention

```vue
<template>
  <!-- ✅ Good - Safe text interpolation -->
  <p>{{ message.content }}</p>

  <!-- ✅ Good - Sanitized HTML with v-dompurify-html -->
  <div v-dompurify-html="sanitizedContent"></div>

  <!-- ❌ Bad - Raw HTML injection -->
  <div v-html="message.content"></div>
</template>
```

This code style guide ensures consistency, maintainability, and quality across the entire ChatGPT Web codebase.
