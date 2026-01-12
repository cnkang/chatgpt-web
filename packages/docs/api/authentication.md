# Authentication Guide

This guide covers the authentication mechanisms and security features implemented in ChatGPT Web.

## Authentication Overview

ChatGPT Web implements a flexible authentication system that can be configured based on your deployment needs:

- **No Authentication**: Open access (default for development)
- **Secret Key Authentication**: Simple shared secret
- **Custom Authentication**: Extensible authentication middleware

## Configuration

### Environment Variables

```bash
# Basic Authentication
AUTH_SECRET_KEY=your-secure-secret-key-here

# Advanced Authentication
ENABLE_AUTH=true
AUTH_TYPE=secret                    # secret, custom, none
AUTH_HEADER=Authorization          # Header name for auth token
AUTH_COOKIE=auth_token             # Cookie name for auth token
```

## Authentication Types

### 1. No Authentication (Default)

When no `AUTH_SECRET_KEY` is provided, the application runs in open mode:

```bash
# .env - No authentication
# AUTH_SECRET_KEY=  # Commented out or empty
```

**Use Cases:**

- Development environments
- Internal networks with other security measures
- Public demo instances

**Security Considerations:**

- Only use in trusted environments
- Consider rate limiting and other protections
- Not recommended for production

### 2. Secret Key Authentication

Simple shared secret authentication using a pre-configured key:

```bash
# .env - Secret key authentication
AUTH_SECRET_KEY=your-ultra-secure-secret-key-here
```

#### Client Implementation

**HTTP Header Authentication:**

```javascript
// Frontend request with header
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: 'Bearer your-secret-key-here',
  },
  body: JSON.stringify({
    messages: [{ role: 'user', content: 'Hello' }],
  }),
})
```

**Query Parameter Authentication:**

```javascript
// Alternative: Query parameter (less secure)
const response = await fetch('/api/chat?token=your-secret-key-here', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    messages: [{ role: 'user', content: 'Hello' }],
  }),
})
```

#### Server Validation

The server validates the secret key using middleware:

```typescript
// service/src/middleware/auth.ts
import type { Request, Response, NextFunction } from 'express'

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authSecret = process.env.AUTH_SECRET_KEY

  // Skip authentication if no secret is configured
  if (!authSecret) {
    return next()
  }

  // Extract token from various sources
  const token = extractToken(req)

  if (!token) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'No authentication token provided',
    })
  }

  if (token !== authSecret) {
    return res.status(401).json({
      error: 'Authentication failed',
      message: 'Invalid authentication token',
    })
  }

  next()
}

function extractToken(req: Request): string | null {
  // Check Authorization header
  const authHeader = req.headers.authorization
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }

  // Check query parameter
  const queryToken = req.query.token as string
  if (queryToken) {
    return queryToken
  }

  // Check cookie
  const cookieToken = req.cookies?.auth_token
  if (cookieToken) {
    return cookieToken
  }

  return null
}
```

### 3. Custom Authentication

For advanced authentication needs, implement custom middleware:

```typescript
// service/src/middleware/custom-auth.ts
import jwt from 'jsonwebtoken'
import type { Request, Response, NextFunction } from 'express'

interface AuthenticatedRequest extends Request {
  user?: {
    id: string
    email: string
    role: string
  }
}

export function customAuthMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '')

  if (!token) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'JWT token required',
    })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    req.user = decoded
    next()
  } catch (error) {
    return res.status(401).json({
      error: 'Authentication failed',
      message: 'Invalid or expired token',
    })
  }
}
```

## Frontend Integration

### Vue.js Authentication Store

```typescript
// src/store/modules/auth.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('auth_token'))
  const isAuthenticated = ref<boolean>(!!token.value)

  function setToken(newToken: string) {
    token.value = newToken
    isAuthenticated.value = true
    localStorage.setItem('auth_token', newToken)
  }

  function clearToken() {
    token.value = null
    isAuthenticated.value = false
    localStorage.removeItem('auth_token')
  }

  function getAuthHeaders() {
    return token.value
      ? {
          Authorization: `Bearer ${token.value}`,
        }
      : {}
  }

  return {
    token: readonly(token),
    isAuthenticated: readonly(isAuthenticated),
    setToken,
    clearToken,
    getAuthHeaders,
  }
})
```

### API Client with Authentication

```typescript
// src/api/client.ts
import { useAuthStore } from '@/store/modules/auth'

class ApiClient {
  private baseURL: string

  constructor(baseURL: string) {
    this.baseURL = baseURL
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const authStore = useAuthStore()

    const url = `${this.baseURL}${endpoint}`
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...authStore.getAuthHeaders(),
        ...options.headers,
      },
    }

    const response = await fetch(url, config)

    if (response.status === 401) {
      // Handle authentication failure
      authStore.clearToken()
      throw new Error('Authentication failed')
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return response.json()
  }

  async sendMessage(messages: ChatMessage[]): Promise<ChatResponse> {
    return this.request<ChatResponse>('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ messages }),
    })
  }
}

export const apiClient = new ApiClient('/api')
```

### Authentication Component

```vue
<!-- src/components/AuthLogin.vue -->
<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/store/modules/auth'
import { NInput, NButton, NForm, NFormItem, NMessage } from 'naive-ui'

const authStore = useAuthStore()
const secretKey = ref('')
const loading = ref(false)

async function handleLogin() {
  if (!secretKey.value.trim()) {
    window.$message?.error('Please enter your secret key')
    return
  }

  loading.value = true

  try {
    // Test the secret key by making an authenticated request
    const response = await fetch('/api/health', {
      headers: {
        Authorization: `Bearer ${secretKey.value}`,
      },
    })

    if (response.ok) {
      authStore.setToken(secretKey.value)
      window.$message?.success('Authentication successful')
    } else {
      window.$message?.error('Invalid secret key')
    }
  } catch (error) {
    window.$message?.error('Authentication failed')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-login">
    <div class="login-form">
      <h2>Authentication Required</h2>
      <NForm @submit.prevent="handleLogin">
        <NFormItem label="Secret Key">
          <NInput
            v-model:value="secretKey"
            type="password"
            placeholder="Enter your secret key"
            @keyup.enter="handleLogin"
          />
        </NFormItem>
        <NFormItem>
          <NButton type="primary" :loading="loading" @click="handleLogin">Login</NButton>
        </NFormItem>
      </NForm>
    </div>
  </div>
</template>

<style scoped>
.auth-login {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: var(--color-background);
}

.login-form {
  width: 100%;
  max-width: 400px;
  padding: 2rem;
  background: var(--color-card);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.login-form h2 {
  text-align: center;
  margin-bottom: 1.5rem;
  color: var(--color-text);
}
</style>
```

## Security Features

### Rate Limiting

Authentication works with rate limiting to prevent abuse:

```typescript
// service/src/middleware/rate-limiter.ts
import rateLimit from 'express-rate-limit'

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    error: 'Too many authentication attempts',
    message: 'Please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: req => {
    // Skip rate limiting if already authenticated
    return req.headers.authorization === `Bearer ${process.env.AUTH_SECRET_KEY}`
  },
})
```

### Request Validation

Validate authentication on all protected endpoints:

```typescript
// service/src/routes/chat.ts
import { Router } from 'express'
import { authMiddleware } from '../middleware/auth'
import { authRateLimit } from '../middleware/rate-limiter'

const router = Router()

// Apply authentication and rate limiting
router.use(authRateLimit)
router.use(authMiddleware)

router.post('/chat', async (req, res) => {
  // This endpoint is now protected
  // Handle chat request
})

export default router
```

### Security Headers

Add security headers for authenticated sessions:

```typescript
// service/src/middleware/security.ts
import helmet from 'helmet'

export const securityMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://api.openai.com'],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
})
```

## Advanced Authentication Patterns

### JWT Token Authentication

For more sophisticated authentication:

```typescript
// service/src/auth/jwt.ts
import jwt from 'jsonwebtoken'

interface TokenPayload {
  userId: string
  email: string
  role: string
  iat: number
  exp: number
}

export class JWTAuth {
  private secret: string
  private expiresIn: string

  constructor(secret: string, expiresIn = '24h') {
    this.secret = secret
    this.expiresIn = expiresIn
  }

  generateToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, this.secret, { expiresIn: this.expiresIn })
  }

  verifyToken(token: string): TokenPayload {
    return jwt.verify(token, this.secret) as TokenPayload
  }

  refreshToken(token: string): string {
    const decoded = this.verifyToken(token)
    const { iat, exp, ...payload } = decoded
    return this.generateToken(payload)
  }
}
```

### OAuth Integration

For OAuth providers (Google, GitHub, etc.):

```typescript
// service/src/auth/oauth.ts
import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: '/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      // Handle user authentication
      const user = {
        id: profile.id,
        email: profile.emails?.[0]?.value,
        name: profile.displayName,
      }

      return done(null, user)
    },
  ),
)

// Routes
app.get(
  '/auth/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
  }),
)

app.get(
  '/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    // Generate JWT token
    const token = jwtAuth.generateToken({
      userId: req.user.id,
      email: req.user.email,
      role: 'user',
    })

    // Redirect with token
    res.redirect(`/?token=${token}`)
  },
)
```

## Testing Authentication

### Unit Tests

```typescript
// service/src/__tests__/auth.test.ts
import { describe, it, expect, vi } from 'vitest'
import request from 'supertest'
import { app } from '../app'

describe('Authentication', () => {
  const validToken = 'test-secret-key'

  beforeEach(() => {
    process.env.AUTH_SECRET_KEY = validToken
  })

  it('should allow requests with valid token', async () => {
    const response = await request(app)
      .post('/api/chat')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        messages: [{ role: 'user', content: 'Hello' }],
      })

    expect(response.status).not.toBe(401)
  })

  it('should reject requests without token', async () => {
    const response = await request(app)
      .post('/api/chat')
      .send({
        messages: [{ role: 'user', content: 'Hello' }],
      })

    expect(response.status).toBe(401)
    expect(response.body.error).toBe('Authentication required')
  })

  it('should reject requests with invalid token', async () => {
    const response = await request(app)
      .post('/api/chat')
      .set('Authorization', 'Bearer invalid-token')
      .send({
        messages: [{ role: 'user', content: 'Hello' }],
      })

    expect(response.status).toBe(401)
    expect(response.body.error).toBe('Authentication failed')
  })
})
```

### Integration Tests

```typescript
// service/src/__tests__/auth.integration.test.ts
import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { app } from '../app'

describe('Authentication Integration', () => {
  it('should handle complete authentication flow', async () => {
    // Test health endpoint without auth
    const healthResponse = await request(app).get('/health')

    expect(healthResponse.status).toBe(200)

    // Test protected endpoint with auth
    const chatResponse = await request(app)
      .post('/api/chat')
      .set('Authorization', `Bearer ${process.env.AUTH_SECRET_KEY}`)
      .send({
        messages: [{ role: 'user', content: 'Hello' }],
      })

    expect(chatResponse.status).toBe(200)
  })
})
```

## Best Practices

### Security Best Practices

1. **Strong Secret Keys**: Use cryptographically secure random keys
2. **Environment Variables**: Never hardcode secrets in source code
3. **HTTPS Only**: Always use HTTPS in production
4. **Token Rotation**: Regularly rotate authentication tokens
5. **Rate Limiting**: Implement rate limiting on authentication endpoints

### Implementation Best Practices

1. **Graceful Degradation**: Handle authentication failures gracefully
2. **Clear Error Messages**: Provide helpful error messages
3. **Consistent Headers**: Use standard authentication headers
4. **Token Validation**: Validate tokens on every request
5. **Logging**: Log authentication events for security monitoring

### Deployment Best Practices

1. **Environment Separation**: Use different keys for different environments
2. **Secret Management**: Use proper secret management systems
3. **Monitoring**: Monitor authentication failures and patterns
4. **Documentation**: Document authentication requirements clearly
5. **Testing**: Thoroughly test authentication flows

This authentication guide provides comprehensive coverage of implementing secure authentication in ChatGPT Web across different deployment scenarios.
