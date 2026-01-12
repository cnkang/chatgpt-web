# Config Package Documentation

The config package contains shared configuration utilities, environment validation, and configuration management for the ChatGPT Web monorepo.

## Package Overview

```json
{
  "name": "@chatgpt-web/config",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./env": {
      "import": "./dist/env/index.js",
      "types": "./dist/env/index.d.ts"
    },
    "./validation": {
      "import": "./dist/validation/index.js",
      "types": "./dist/validation/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "type-check": "tsc --noEmit",
    "test": "vitest --run",
    "test:watch": "vitest"
  }
}
```

## Architecture

### Technology Stack

- **TypeScript 5.9+**: Strict type definitions
- **Zod 4+**: Runtime validation and parsing
- **dotenv**: Environment variable loading
- **tsup**: Build tool for library packaging

### Project Structure

```
packages/config/src/
├── env/                 # Environment configuration
│   ├── base.ts         # Base environment schema
│   ├── development.ts  # Development environment
│   ├── production.ts   # Production environment
│   ├── test.ts         # Test environment
│   └── index.ts        # Environment exports
├── validation/         # Configuration validation
│   ├── providers.ts    # AI provider validation
│   ├── security.ts     # Security configuration validation
│   ├── database.ts     # Database configuration validation
│   └── index.ts        # Validation exports
├── loaders/            # Configuration loaders
│   ├── env-loader.ts   # Environment variable loader
│   ├── file-loader.ts  # File-based configuration loader
│   └── index.ts        # Loader exports
├── types/              # Configuration types
│   ├── config.ts       # Configuration interfaces
│   ├── env.ts          # Environment types
│   └── index.ts        # Type exports
└── index.ts            # Main package exports
```

## Core Configuration

### Base Configuration Schema

```typescript
// src/env/base.ts
import { z } from 'zod'

export const baseConfigSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'staging', 'production', 'test']).default('development'),
  PORT: z.coerce.number().min(1).max(65535).default(3002),
  HOST: z.string().default('0.0.0.0'),

  // AI Provider
  AI_PROVIDER: z.enum(['openai', 'azure']).default('openai'),

  // OpenAI Configuration
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_API_MODEL: z.string().default('gpt-4o'),
  OPENAI_API_BASE_URL: z.string().url().default('https://api.openai.com'),
  OPENAI_API_DISABLE_DEBUG: z.coerce.boolean().default(false),
  OPENAI_ORGANIZATION: z.string().optional(),

  // Azure OpenAI Configuration
  AZURE_OPENAI_API_KEY: z.string().optional(),
  AZURE_OPENAI_ENDPOINT: z.string().url().optional(),
  AZURE_OPENAI_DEPLOYMENT: z.string().optional(),
  AZURE_OPENAI_API_VERSION: z.string().default('2024-02-15-preview'),

  // Security
  AUTH_SECRET_KEY: z.string().optional(),
  ENABLE_CORS: z.coerce.boolean().default(true),
  CORS_ORIGIN: z.string().default('*'),

  // Rate Limiting
  MAX_REQUEST_PER_HOUR: z.coerce.number().min(1).default(1000),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().min(1000).default(3600000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().min(1).default(1000),
  ENABLE_RATE_LIMITING: z.coerce.boolean().default(true),

  // Performance
  TIMEOUT_MS: z.coerce.number().min(1000).max(300000).default(30000),
  RETRY_MAX_ATTEMPTS: z.coerce.number().min(0).max(10).default(3),
  RETRY_BASE_DELAY: z.coerce.number().min(100).default(1000),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_FORMAT: z.enum(['json', 'simple']).default('simple'),
  ENABLE_REQUEST_LOGGING: z.coerce.boolean().default(true),
  ENABLE_ERROR_LOGGING: z.coerce.boolean().default(true),

  // Database (optional)
  DATABASE_URL: z.string().url().optional(),
  DB_HOST: z.string().optional(),
  DB_PORT: z.coerce.number().min(1).max(65535).optional(),
  DB_NAME: z.string().optional(),
  DB_USER: z.string().optional(),
  DB_PASSWORD: z.string().optional(),
  DB_SSL: z.coerce.boolean().default(true),

  // Redis (optional)
  REDIS_URL: z.string().url().optional(),
  REDIS_HOST: z.string().optional(),
  REDIS_PORT: z.coerce.number().min(1).max(65535).optional(),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.coerce.number().min(0).default(0),

  // Proxy Configuration
  HTTPS_PROXY: z.string().url().optional(),
  HTTP_PROXY: z.string().url().optional(),
  ALL_PROXY: z.string().url().optional(),
  NO_PROXY: z.string().optional(),

  // Health Checks
  ENABLE_HEALTH_CHECKS: z.coerce.boolean().default(true),
  HEALTH_CHECK_INTERVAL: z.coerce.number().min(1000).default(30000),
  HEALTH_CHECK_TIMEOUT: z.coerce.number().min(1000).default(5000),

  // Monitoring
  ENABLE_METRICS: z.coerce.boolean().default(false),
  METRICS_PORT: z.coerce.number().min(1).max(65535).default(9090),
  METRICS_PATH: z.string().default('/metrics'),
})

export type BaseConfig = z.infer<typeof baseConfigSchema>
```

### Environment-Specific Configurations

#### Development Configuration

```typescript
// src/env/development.ts
import { z } from 'zod'
import { baseConfigSchema } from './base.js'

export const developmentConfigSchema = baseConfigSchema.extend({
  NODE_ENV: z.literal('development'),
  LOG_LEVEL: z.enum(['debug', 'info']).default('debug'),
  LOG_FORMAT: z.literal('simple'),
  ENABLE_CORS: z.literal(true),
  CORS_ORIGIN: z.string().default('http://localhost:1002'),

  // Relaxed rate limiting for development
  MAX_REQUEST_PER_HOUR: z.coerce.number().default(10000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(1000),

  // Extended timeouts for debugging
  TIMEOUT_MS: z.coerce.number().default(120000),

  // Development-specific features
  ENABLE_HOT_RELOAD: z.coerce.boolean().default(true),
  ENABLE_SOURCE_MAPS: z.coerce.boolean().default(true),
  ENABLE_VERBOSE_LOGGING: z.coerce.boolean().default(true),
})

export type DevelopmentConfig = z.infer<typeof developmentConfigSchema>
```

#### Production Configuration

```typescript
// src/env/production.ts
import { z } from 'zod'
import { baseConfigSchema } from './base.js'

export const productionConfigSchema = baseConfigSchema
  .extend({
    NODE_ENV: z.literal('production'),
    LOG_LEVEL: z.enum(['error', 'warn', 'info']).default('info'),
    LOG_FORMAT: z.literal('json'),
    ENABLE_CORS: z.coerce.boolean().default(false),

    // Stricter validation for production
    AUTH_SECRET_KEY: z
      .string()
      .min(32, 'AUTH_SECRET_KEY must be at least 32 characters in production'),

    // Production-specific security
    ENABLE_SECURITY_HEADERS: z.coerce.boolean().default(true),
    ENABLE_RATE_LIMITING: z.literal(true),
    STRICT_SSL: z.coerce.boolean().default(true),

    // Performance optimizations
    ENABLE_COMPRESSION: z.coerce.boolean().default(true),
    ENABLE_CACHING: z.coerce.boolean().default(true),
    CACHE_TTL: z.coerce.number().default(300000), // 5 minutes

    // Monitoring requirements
    ENABLE_METRICS: z.literal(true),
    ENABLE_HEALTH_CHECKS: z.literal(true),

    // Production logging
    ENABLE_FILE_LOGGING: z.coerce.boolean().default(true),
    LOG_FILE_PATH: z.string().default('./logs/app.log'),
    LOG_MAX_SIZE: z.string().default('100MB'),
    LOG_MAX_FILES: z.coerce.number().default(10),
  })
  .refine(
    data => {
      // Ensure AI provider configuration is complete
      if (data.AI_PROVIDER === 'openai') {
        return !!data.OPENAI_API_KEY
      } else if (data.AI_PROVIDER === 'azure') {
        return !!(
          data.AZURE_OPENAI_API_KEY &&
          data.AZURE_OPENAI_ENDPOINT &&
          data.AZURE_OPENAI_DEPLOYMENT
        )
      }
      return false
    },
    {
      message: 'AI provider configuration is incomplete',
      path: ['AI_PROVIDER'],
    },
  )

export type ProductionConfig = z.infer<typeof productionConfigSchema>
```

#### Test Configuration

```typescript
// src/env/test.ts
import { z } from 'zod'
import { baseConfigSchema } from './base.js'

export const testConfigSchema = baseConfigSchema.extend({
  NODE_ENV: z.literal('test'),
  LOG_LEVEL: z.literal('error'),

  // Test-specific overrides
  PORT: z.coerce.number().default(0), // Random port for tests
  ENABLE_RATE_LIMITING: z.literal(false),
  ENABLE_CORS: z.literal(true),

  // Mock configurations
  OPENAI_API_KEY: z.string().default('sk-test-key'),
  AUTH_SECRET_KEY: z.string().default('test-secret-key'),

  // Fast timeouts for tests
  TIMEOUT_MS: z.coerce.number().default(5000),
  RETRY_MAX_ATTEMPTS: z.coerce.number().default(1),

  // Disable external services
  ENABLE_HEALTH_CHECKS: z.literal(false),
  ENABLE_METRICS: z.literal(false),
  ENABLE_REQUEST_LOGGING: z.literal(false),
})

export type TestConfig = z.infer<typeof testConfigSchema>
```

## Configuration Validation

### Provider Validation

```typescript
// src/validation/providers.ts
import { z } from 'zod'

export function validateOpenAIConfig(config: any): string[] {
  const errors: string[] = []

  if (!config.OPENAI_API_KEY) {
    errors.push('OPENAI_API_KEY is required when using OpenAI provider')
  } else if (!config.OPENAI_API_KEY.startsWith('sk-')) {
    errors.push('OPENAI_API_KEY must start with "sk-"')
  } else if (config.OPENAI_API_KEY.length < 48) {
    errors.push('OPENAI_API_KEY appears to be invalid (too short)')
  }

  if (config.OPENAI_API_BASE_URL && !isValidURL(config.OPENAI_API_BASE_URL)) {
    errors.push('OPENAI_API_BASE_URL must be a valid URL')
  }

  if (config.OPENAI_API_MODEL && !isValidOpenAIModel(config.OPENAI_API_MODEL)) {
    errors.push(`Invalid OpenAI model: ${config.OPENAI_API_MODEL}`)
  }

  return errors
}

export function validateAzureConfig(config: any): string[] {
  const errors: string[] = []

  if (!config.AZURE_OPENAI_API_KEY) {
    errors.push('AZURE_OPENAI_API_KEY is required when using Azure provider')
  }

  if (!config.AZURE_OPENAI_ENDPOINT) {
    errors.push('AZURE_OPENAI_ENDPOINT is required when using Azure provider')
  } else if (!isValidURL(config.AZURE_OPENAI_ENDPOINT)) {
    errors.push('AZURE_OPENAI_ENDPOINT must be a valid URL')
  }

  if (!config.AZURE_OPENAI_DEPLOYMENT) {
    errors.push('AZURE_OPENAI_DEPLOYMENT is required when using Azure provider')
  }

  if (!config.AZURE_OPENAI_API_VERSION) {
    errors.push('AZURE_OPENAI_API_VERSION is required when using Azure provider')
  }

  return errors
}

export function validateProviderConfig(config: any): string[] {
  const provider = config.AI_PROVIDER || 'openai'

  switch (provider) {
    case 'openai':
      return validateOpenAIConfig(config)
    case 'azure':
      return validateAzureConfig(config)
    default:
      return [`Unsupported AI provider: ${provider}`]
  }
}

function isValidURL(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

function isValidOpenAIModel(model: string): boolean {
  const validModels = [
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-4',
    'gpt-4-turbo',
    'gpt-3.5-turbo',
    'o1-preview',
    'o1-mini',
  ]
  return validModels.includes(model)
}
```

### Security Validation

```typescript
// src/validation/security.ts
export function validateSecurityConfig(config: any): string[] {
  const errors: string[] = []

  // Validate AUTH_SECRET_KEY
  if (config.AUTH_SECRET_KEY) {
    if (config.AUTH_SECRET_KEY.length < 16) {
      errors.push('AUTH_SECRET_KEY should be at least 16 characters long')
    }

    if (config.NODE_ENV === 'production' && config.AUTH_SECRET_KEY.length < 32) {
      errors.push('AUTH_SECRET_KEY must be at least 32 characters in production')
    }

    if (isWeakSecret(config.AUTH_SECRET_KEY)) {
      errors.push('AUTH_SECRET_KEY appears to be weak (use a strong random key)')
    }
  }

  // Validate CORS configuration
  if (config.ENABLE_CORS && config.NODE_ENV === 'production') {
    if (config.CORS_ORIGIN === '*') {
      errors.push('CORS_ORIGIN should not be "*" in production')
    }
  }

  // Validate rate limiting
  if (config.ENABLE_RATE_LIMITING) {
    if (config.MAX_REQUEST_PER_HOUR < 1) {
      errors.push('MAX_REQUEST_PER_HOUR must be at least 1')
    }

    if (config.RATE_LIMIT_WINDOW_MS < 1000) {
      errors.push('RATE_LIMIT_WINDOW_MS must be at least 1000ms')
    }
  }

  return errors
}

function isWeakSecret(secret: string): boolean {
  const weakPatterns = [
    /^(password|secret|key|token)$/i,
    /^(123|abc|test|demo)/i,
    /^(.)\1{7,}$/, // Repeated characters
    /^(qwerty|admin|root)/i,
  ]

  return weakPatterns.some(pattern => pattern.test(secret))
}
```

### Database Validation

```typescript
// src/validation/database.ts
export function validateDatabaseConfig(config: any): string[] {
  const errors: string[] = []

  // If DATABASE_URL is provided, validate it
  if (config.DATABASE_URL) {
    try {
      const url = new URL(config.DATABASE_URL)

      if (!['postgres:', 'postgresql:', 'mysql:', 'sqlite:'].includes(url.protocol)) {
        errors.push('DATABASE_URL must use a supported database protocol')
      }

      if (!url.hostname && url.protocol !== 'sqlite:') {
        errors.push('DATABASE_URL must include a hostname')
      }
    } catch {
      errors.push('DATABASE_URL must be a valid URL')
    }
  }

  // Validate individual database config
  if (config.DB_HOST || config.DB_PORT || config.DB_NAME) {
    if (!config.DB_HOST) {
      errors.push('DB_HOST is required when using individual database config')
    }

    if (!config.DB_NAME) {
      errors.push('DB_NAME is required when using individual database config')
    }

    if (config.DB_PORT && (config.DB_PORT < 1 || config.DB_PORT > 65535)) {
      errors.push('DB_PORT must be between 1 and 65535')
    }
  }

  return errors
}

export function validateRedisConfig(config: any): string[] {
  const errors: string[] = []

  // If REDIS_URL is provided, validate it
  if (config.REDIS_URL) {
    try {
      const url = new URL(config.REDIS_URL)

      if (url.protocol !== 'redis:' && url.protocol !== 'rediss:') {
        errors.push('REDIS_URL must use redis:// or rediss:// protocol')
      }
    } catch {
      errors.push('REDIS_URL must be a valid URL')
    }
  }

  // Validate individual Redis config
  if (config.REDIS_HOST || config.REDIS_PORT) {
    if (!config.REDIS_HOST) {
      errors.push('REDIS_HOST is required when using individual Redis config')
    }

    if (config.REDIS_PORT && (config.REDIS_PORT < 1 || config.REDIS_PORT > 65535)) {
      errors.push('REDIS_PORT must be between 1 and 65535')
    }
  }

  return errors
}
```

## Configuration Loaders

### Environment Loader

```typescript
// src/loaders/env-loader.ts
import { config } from 'dotenv'
import { z } from 'zod'
import { baseConfigSchema } from '../env/base.js'
import { developmentConfigSchema } from '../env/development.js'
import { productionConfigSchema } from '../env/production.js'
import { testConfigSchema } from '../env/test.js'

export class EnvironmentLoader {
  private config: any = {}

  constructor() {
    this.loadEnvironmentFiles()
  }

  private loadEnvironmentFiles() {
    const nodeEnv = process.env.NODE_ENV || 'development'

    // Load environment files in order of precedence
    const envFiles = ['.env', `.env.${nodeEnv}`, `.env.local`, `.env.${nodeEnv}.local`]

    envFiles.forEach(file => {
      config({ path: file, override: false })
    })

    this.config = process.env
  }

  public validate(): any {
    const nodeEnv = this.config.NODE_ENV || 'development'

    let schema: z.ZodSchema
    switch (nodeEnv) {
      case 'development':
        schema = developmentConfigSchema
        break
      case 'production':
        schema = productionConfigSchema
        break
      case 'test':
        schema = testConfigSchema
        break
      default:
        schema = baseConfigSchema
    }

    try {
      return schema.parse(this.config)
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors
          .map(err => `${err.path.join('.')}: ${err.message}`)
          .join('\n')

        throw new Error(`Configuration validation failed:\n${errorMessages}`)
      }
      throw error
    }
  }

  public getConfig(): any {
    return this.config
  }

  public get<T>(key: string, defaultValue?: T): T {
    return this.config[key] ?? defaultValue
  }

  public has(key: string): boolean {
    return key in this.config && this.config[key] !== undefined
  }

  public set(key: string, value: any): void {
    this.config[key] = value
    process.env[key] = String(value)
  }
}

// Singleton instance
export const envLoader = new EnvironmentLoader()
```

### File Loader

```typescript
// src/loaders/file-loader.ts
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { z } from 'zod'

export class FileConfigLoader {
  private configCache = new Map<string, any>()

  public loadJSON<T>(filePath: string, schema?: z.ZodSchema<T>): T {
    const absolutePath = resolve(filePath)

    if (this.configCache.has(absolutePath)) {
      return this.configCache.get(absolutePath)
    }

    if (!existsSync(absolutePath)) {
      throw new Error(`Configuration file not found: ${absolutePath}`)
    }

    try {
      const content = readFileSync(absolutePath, 'utf-8')
      const parsed = JSON.parse(content)

      if (schema) {
        const validated = schema.parse(parsed)
        this.configCache.set(absolutePath, validated)
        return validated
      }

      this.configCache.set(absolutePath, parsed)
      return parsed
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`Invalid JSON in configuration file: ${absolutePath}`)
      }
      throw error
    }
  }

  public loadYAML<T>(filePath: string, schema?: z.ZodSchema<T>): T {
    // YAML loading would require a YAML parser like 'yaml' package
    throw new Error('YAML loading not implemented')
  }

  public clearCache(): void {
    this.configCache.clear()
  }

  public invalidateCache(filePath: string): void {
    const absolutePath = resolve(filePath)
    this.configCache.delete(absolutePath)
  }
}

export const fileLoader = new FileConfigLoader()
```

## Configuration Manager

### Main Configuration Class

```typescript
// src/config-manager.ts
import { EnvironmentLoader } from './loaders/env-loader.js'
import { FileConfigLoader } from './loaders/file-loader.js'
import { validateProviderConfig } from './validation/providers.js'
import { validateSecurityConfig } from './validation/security.js'
import { validateDatabaseConfig, validateRedisConfig } from './validation/database.js'

export class ConfigManager {
  private envLoader: EnvironmentLoader
  private fileLoader: FileConfigLoader
  private config: any
  private validated = false

  constructor() {
    this.envLoader = new EnvironmentLoader()
    this.fileLoader = new FileConfigLoader()
    this.config = this.envLoader.getConfig()
  }

  public validate(): any {
    if (this.validated) {
      return this.config
    }

    // Validate environment configuration
    this.config = this.envLoader.validate()

    // Run additional validations
    const errors: string[] = []

    errors.push(...validateProviderConfig(this.config))
    errors.push(...validateSecurityConfig(this.config))
    errors.push(...validateDatabaseConfig(this.config))
    errors.push(...validateRedisConfig(this.config))

    if (errors.length > 0) {
      throw new Error(`Configuration validation failed:\n${errors.join('\n')}`)
    }

    this.validated = true
    return this.config
  }

  public get<T>(key: string, defaultValue?: T): T {
    return this.config[key] ?? defaultValue
  }

  public has(key: string): boolean {
    return key in this.config && this.config[key] !== undefined
  }

  public getAll(): any {
    return { ...this.config }
  }

  public isDevelopment(): boolean {
    return this.config.NODE_ENV === 'development'
  }

  public isProduction(): boolean {
    return this.config.NODE_ENV === 'production'
  }

  public isTest(): boolean {
    return this.config.NODE_ENV === 'test'
  }

  public getAIProviderConfig() {
    const provider = this.config.AI_PROVIDER

    if (provider === 'openai') {
      return {
        provider: 'openai',
        apiKey: this.config.OPENAI_API_KEY,
        model: this.config.OPENAI_API_MODEL,
        baseURL: this.config.OPENAI_API_BASE_URL,
        organization: this.config.OPENAI_ORGANIZATION,
      }
    } else if (provider === 'azure') {
      return {
        provider: 'azure',
        apiKey: this.config.AZURE_OPENAI_API_KEY,
        endpoint: this.config.AZURE_OPENAI_ENDPOINT,
        deployment: this.config.AZURE_OPENAI_DEPLOYMENT,
        apiVersion: this.config.AZURE_OPENAI_API_VERSION,
      }
    }

    throw new Error(`Unsupported AI provider: ${provider}`)
  }

  public getDatabaseConfig() {
    if (this.config.DATABASE_URL) {
      return { url: this.config.DATABASE_URL }
    }

    if (this.config.DB_HOST) {
      return {
        host: this.config.DB_HOST,
        port: this.config.DB_PORT,
        database: this.config.DB_NAME,
        username: this.config.DB_USER,
        password: this.config.DB_PASSWORD,
        ssl: this.config.DB_SSL,
      }
    }

    return null
  }

  public getRedisConfig() {
    if (this.config.REDIS_URL) {
      return { url: this.config.REDIS_URL }
    }

    if (this.config.REDIS_HOST) {
      return {
        host: this.config.REDIS_HOST,
        port: this.config.REDIS_PORT,
        password: this.config.REDIS_PASSWORD,
        database: this.config.REDIS_DB,
      }
    }

    return null
  }
}

// Singleton instance
export const configManager = new ConfigManager()
```

## Usage Examples

### Basic Usage

```typescript
// In any package
import { configManager } from '@chatgpt-web/config'

// Validate configuration on startup
const config = configManager.validate()

// Get specific values
const port = configManager.get('PORT', 3002)
const aiProvider = configManager.get('AI_PROVIDER')

// Check environment
if (configManager.isProduction()) {
  // Production-specific logic
}

// Get structured configuration
const aiConfig = configManager.getAIProviderConfig()
const dbConfig = configManager.getDatabaseConfig()
```

### Environment-Specific Configuration

```typescript
// Load different configurations based on environment
import { envLoader } from '@chatgpt-web/config/env'

// In development
if (process.env.NODE_ENV === 'development') {
  envLoader.set('LOG_LEVEL', 'debug')
  envLoader.set('ENABLE_VERBOSE_LOGGING', 'true')
}

// In production
if (process.env.NODE_ENV === 'production') {
  if (!envLoader.has('AUTH_SECRET_KEY')) {
    throw new Error('AUTH_SECRET_KEY is required in production')
  }
}
```

### Custom Validation

```typescript
// Add custom validation rules
import { configManager } from '@chatgpt-web/config'
import { validateProviderConfig } from '@chatgpt-web/config/validation'

const config = configManager.getAll()
const errors = validateProviderConfig(config)

if (errors.length > 0) {
  console.error('Configuration errors:', errors)
  process.exit(1)
}
```

## Testing

### Configuration Testing

```typescript
// src/__tests__/config-manager.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { ConfigManager } from '../config-manager'

describe('ConfigManager', () => {
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    originalEnv = { ...process.env }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('should validate OpenAI configuration', () => {
    process.env.AI_PROVIDER = 'openai'
    process.env.OPENAI_API_KEY = 'sk-test-key-1234567890abcdef1234567890abcdef12345678'

    const manager = new ConfigManager()
    const config = manager.validate()

    expect(config.AI_PROVIDER).toBe('openai')
    expect(config.OPENAI_API_KEY).toBe('sk-test-key-1234567890abcdef1234567890abcdef12345678')
  })

  it('should validate Azure configuration', () => {
    process.env.AI_PROVIDER = 'azure'
    process.env.AZURE_OPENAI_API_KEY = 'azure-test-key'
    process.env.AZURE_OPENAI_ENDPOINT = 'https://test.openai.azure.com'
    process.env.AZURE_OPENAI_DEPLOYMENT = 'test-deployment'

    const manager = new ConfigManager()
    const config = manager.validate()

    expect(config.AI_PROVIDER).toBe('azure')
    expect(config.AZURE_OPENAI_ENDPOINT).toBe('https://test.openai.azure.com')
  })

  it('should throw error for invalid configuration', () => {
    process.env.AI_PROVIDER = 'openai'
    // Missing OPENAI_API_KEY

    const manager = new ConfigManager()

    expect(() => manager.validate()).toThrow('Configuration validation failed')
  })
})
```

## Build Configuration

### tsup Configuration

```typescript
// tsup.config.ts
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/env/index.ts', 'src/validation/index.ts', 'src/loaders/index.ts'],
  format: ['esm', 'cjs'],
  target: 'node18',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  dts: true,
  splitting: false,
  treeshake: true,
  external: ['dotenv', 'zod'],
})
```

The config package provides robust configuration management with environment-specific validation, ensuring that all packages in the monorepo have consistent and validated configuration access.
