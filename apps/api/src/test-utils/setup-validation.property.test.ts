/**
 * Property-based test setup validation
 *
 * This test validates that the property-based testing infrastructure
 * is correctly configured and working.
 */

import * as fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import {
  apiKeyGenerator,
  chatMessageGenerator,
  messageContentGenerator,
} from './property-generators.js'
import {
  createPropertyTest,
  FAST_PROPERTY_CONFIG,
  getPropertyMetadata,
} from './property-test-utils.js'

describe('property-based testing setup validation', () => {
  it('should have fast-check available', () => {
    expect(fc).toBeDefined()
    expect(fc.assert).toBeDefined()
    expect(fc.property).toBeDefined()
  })

  it('should have property metadata defined', () => {
    const metadata = getPropertyMetadata(1)
    expect(metadata).toBeDefined()
    expect(metadata.feature).toBe('chatgpt-web-modernization')
    expect(metadata.propertyNumber).toBe(1)
    expect(metadata.requirements).toContain('1.2')
  })

  it('should generate valid API keys', () => {
    fc.assert<[string]>(
      fc.property(apiKeyGenerator(), apiKey => {
        expect(apiKey).toMatch(/^sk-/)
        expect(apiKey).toHaveLength(54) // sk- + 51 characters
      }),
      FAST_PROPERTY_CONFIG as fc.Parameters<[string]>,
    )
  })

  it('should generate valid message content', () => {
    fc.assert<[string]>(
      fc.property(messageContentGenerator(), content => {
        expect(content.trim().length).toBeGreaterThan(0)
        expect(content.length).toBeLessThanOrEqual(4000)
      }),
      FAST_PROPERTY_CONFIG as fc.Parameters<[string]>,
    )
  })

  it('should generate valid chat messages', () => {
    fc.assert<[{ role: string; content: string; timestamp: number }]>(
      fc.property(chatMessageGenerator(), message => {
        expect(message).toHaveProperty('role')
        expect(message).toHaveProperty('content')
        expect(message).toHaveProperty('timestamp')
        expect(['system', 'user', 'assistant']).toContain(message.role)
        expect(typeof message.content).toBe('string')
        expect(typeof message.timestamp).toBe('number')
      }),
      FAST_PROPERTY_CONFIG as fc.Parameters<[{ role: string; content: string; timestamp: number }]>,
    )
  })
})

// Example property test using the utility functions
createPropertyTest(
  1, // Property number from design document
  'API keys should always start with sk- prefix',
  apiKeyGenerator(),
  (apiKey: string) => {
    return apiKey.startsWith('sk-') && apiKey.length === 54
  },
  FAST_PROPERTY_CONFIG as fc.Parameters<[string]>,
)
