/**
 * Property-based test generators for ChatGPT Web Modernization
 *
 * This module provides generators for property-based testing using fast-check.
 * Each generator creates random test data for specific domain objects.
 */

import * as fc from 'fast-check'

// ============================================================================
// Core Data Generators
// ============================================================================

/**
 * Generates valid OpenAI API keys
 */
export function apiKeyGenerator() {
  return fc.string({ minLength: 51, maxLength: 51 }).map(s => `sk-${s}`)
}

/**
 * Generates valid Azure OpenAI endpoints
 */
export function azureEndpointGenerator() {
  return fc.webUrl({ validSchemes: ['https'] }).filter(url => url.includes('openai.azure.com'))
}

/**
 * Generates chat message content
 */
export function messageContentGenerator() {
  return fc.string({ minLength: 1, maxLength: 4000 }).filter(s => s.trim().length > 0)
}

/**
 * Generates chat message roles
 */
export function messageRoleGenerator() {
  return fc.constantFrom('system', 'user', 'assistant')
}

/**
 * Generates OpenAI model names
 */
export function modelNameGenerator() {
  return fc.constantFrom(
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-4-turbo',
    'gpt-3.5-turbo',
    'o1-preview',
    'o1-mini',
  )
}

/**
 * Generates reasoning model names specifically
 */
export function reasoningModelGenerator() {
  return fc.constantFrom('o1-preview', 'o1-mini')
}

/**
 * Generates temperature values (0.0 to 2.0)
 */
export function temperatureGenerator() {
  return fc.float({ min: 0.0, max: 2.0 })
}

/**
 * Generates max tokens values
 */
export function maxTokensGenerator() {
  return fc.integer({ min: 1, max: 4096 })
}

// ============================================================================
// Complex Object Generators
// ============================================================================

/**
 * Generates chat messages
 */
export function chatMessageGenerator() {
  return fc.record({
    role: messageRoleGenerator(),
    content: messageContentGenerator(),
    timestamp: fc.integer({ min: 0 }),
  })
}

/**
 * Generates reasoning steps
 */
export function reasoningStepGenerator() {
  return fc.record({
    step: fc.integer({ min: 1, max: 20 }),
    thought: fc.string({ minLength: 10, maxLength: 500 }),
    confidence: fc.float({ min: 0.0, max: 1.0 }),
  })
}

/**
 * Generates chat completion requests
 */
export function chatCompletionRequestGenerator() {
  return fc.record({
    messages: fc.array(chatMessageGenerator(), { minLength: 1, maxLength: 10 }),
    model: modelNameGenerator(),
    temperature: fc.option(temperatureGenerator()),
    maxTokens: fc.option(maxTokensGenerator()),
    stream: fc.option(fc.boolean()),
    reasoningMode: fc.option(fc.boolean()),
  })
}

/**
 * Generates OpenAI configuration objects
 */
export function openaiConfigGenerator() {
  return fc.record({
    apiKey: apiKeyGenerator(),
    baseUrl: fc.option(fc.webUrl({ validSchemes: ['https'] })),
    organization: fc.option(fc.string({ minLength: 5, maxLength: 50 })),
  })
}

/**
 * Generates Azure OpenAI configuration objects
 */
export function azureConfigGenerator() {
  return fc.record({
    apiKey: apiKeyGenerator(),
    endpoint: azureEndpointGenerator(),
    deployment: fc.string({ minLength: 3, maxLength: 50 }),
    apiVersion: fc.constantFrom('2023-12-01-preview', '2024-02-15-preview', '2024-05-01-preview'),
  })
}

// ============================================================================
// Security Test Generators
// ============================================================================

/**
 * Generates potentially malicious input strings for XSS testing
 */
export function maliciousInputGenerator() {
  return fc.oneof(
    fc.constant('<script>alert("xss")</script>'),
    fc.constant('javascript:alert("xss")'),
    fc.constant('<img src="x" onerror="alert(1)">'),
    fc.constant('"><script>alert(1)</script>'),
    fc.constant('\'; DROP TABLE users; --'),
    fc.constant('{{7*7}}'), // Template injection
    fc.constant('$' + '{7*7}'), // Template literal injection
  )
}

/**
 * Generates valid but edge-case input strings
 */
export function edgeCaseInputGenerator() {
  return fc.oneof(
    fc.constant(''), // Empty string
    fc.constant('   '), // Whitespace only
    fc.string({ minLength: 10000, maxLength: 10000 }), // Very long string
    fc.constant('\n\r\t'), // Special characters
    fc.constant('🚀🎉💻'), // Unicode/emoji
    fc.constant('null'), // String "null"
    fc.constant('undefined'), // String "undefined"
  )
}

/**
 * Generates HTTP headers for security testing
 */
export function httpHeaderGenerator() {
  return fc.record({
    'Content-Type': fc.constantFrom('application/json', 'text/plain', 'text/html'),
    'User-Agent': fc.string({ minLength: 10, maxLength: 200 }),
    'Authorization': fc.option(fc.string({ minLength: 20, maxLength: 100 })),
    'X-Forwarded-For': fc.option(fc.ipV4()),
  })
}

// ============================================================================
// Vue.js Component Generators
// ============================================================================

/**
 * Generates Vue component props
 */
export function vuePropsGenerator() {
  return fc.record({
    conversationId: fc.option(fc.uuid()),
    modelName: fc.option(modelNameGenerator()),
    isLoading: fc.boolean(),
    messages: fc.array(chatMessageGenerator(), { maxLength: 50 }),
  })
}

/**
 * Generates Vue reactive state
 */
export function vueStateGenerator() {
  return fc.record({
    currentMessage: fc.string({ maxLength: 1000 }),
    isComposing: fc.boolean(),
    selectedModel: modelNameGenerator(),
    reasoningEnabled: fc.boolean(),
  })
}

// ============================================================================
// Error Condition Generators
// ============================================================================

/**
 * Generates network error conditions
 */
export function networkErrorGenerator() {
  return fc.record({
    code: fc.constantFrom('ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNRESET'),
    message: fc.string({ minLength: 10, maxLength: 100 }),
    status: fc.option(fc.integer({ min: 400, max: 599 })),
  })
}

/**
 * Generates API error responses
 */
export function apiErrorGenerator() {
  return fc.record({
    error: fc.record({
      message: fc.string({ minLength: 5, maxLength: 200 }),
      type: fc.constantFrom('invalid_request_error', 'rate_limit_exceeded', 'api_error'),
      code: fc.option(fc.string({ minLength: 3, maxLength: 50 })),
    }),
  })
}

// ============================================================================
// Build System Generators
// ============================================================================

/**
 * Generates file paths for build system testing
 */
export function filePathGenerator() {
  return fc
    .array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 5 })
    .map(parts => parts.join('/'))
    .filter(path => !path.includes('..') && !path.startsWith('/'))
}

/**
 * Generates JavaScript/TypeScript code snippets
 */
export function codeSnippetGenerator() {
  return fc.oneof(
    fc.constant('import { ref } from "vue"'),
    fc.constant('const message = ref("")'),
    fc.constant('export default defineComponent({})'),
    fc.constant('async function fetchData() {}'),
    fc.constant('interface Config { apiKey: string }'),
  )
}
