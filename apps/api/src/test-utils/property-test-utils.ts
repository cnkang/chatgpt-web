/**
 * Property-based test utilities for ChatGPT Web Modernization
 *
 * This module provides utilities for running property-based tests with proper
 * tagging and traceability to design document properties and requirements.
 */

import * as fc from 'fast-check'
import { describe, it } from 'vitest'

// ============================================================================
// Property Test Configuration
// ============================================================================

/**
 * Default configuration for property-based tests
 */
export const DEFAULT_PROPERTY_CONFIG: fc.Parameters<[unknown]> = {
  numRuns: 100, // Minimum 100 iterations as specified in design
  seed: 42, // Fixed seed for reproducible tests
  verbose: true, // Enable verbose output for debugging
}

/**
 * Configuration for fast property tests (for development)
 */
export const FAST_PROPERTY_CONFIG: fc.Parameters<[unknown]> = {
  numRuns: 10,
  seed: 42,
  verbose: false,
}

// ============================================================================
// Property Test Metadata
// ============================================================================

/**
 * Metadata for property-based tests to ensure traceability
 */
export interface PropertyTestMetadata {
  /** Feature name from the spec */
  feature: string
  /** Property number from the design document */
  propertyNumber: number
  /** Property title from the design document */
  propertyTitle: string
  /** Requirements this property validates */
  requirements: string[]
  /** Description of what the property tests */
  description: string
}

/**
 * Creates a standardized test tag for property-based tests
 */
export function createPropertyTestTag(metadata: PropertyTestMetadata): string {
  return `Feature: ${metadata.feature}, Property ${metadata.propertyNumber}: ${metadata.propertyTitle}`
}

// ============================================================================
// Property Test Wrapper Functions
// ============================================================================

/**
 * Wrapper for property-based tests with proper tagging and metadata
 */
export function propertyTest<T>(
  metadata: PropertyTestMetadata,
  testName: string,
  arbitrary: fc.Arbitrary<T>,
  predicate: (value: T) => boolean | void,
  config: fc.Parameters<[T]> = DEFAULT_PROPERTY_CONFIG as fc.Parameters<[T]>,
): void {
  const tag = createPropertyTestTag(metadata)

  describe(`Property ${metadata.propertyNumber}: ${metadata.propertyTitle}`, () => {
    it(
      `${testName} - ${tag}`,
      {
        // Add timeout for property tests (they can take longer)
        timeout: 30000,
      },
      () => {
        const property = fc.property(arbitrary, predicate)
        fc.assert<[T]>(property, {
          ...config,
          // Add metadata to test output
          examples: config.examples || [],
        })
      },
    )
  })
}

/**
 * Wrapper for async property-based tests
 */
export function asyncPropertyTest<T>(
  metadata: PropertyTestMetadata,
  testName: string,
  arbitrary: fc.Arbitrary<T>,
  predicate: (value: T) => Promise<boolean | void>,
  config: fc.Parameters<[T]> = DEFAULT_PROPERTY_CONFIG as fc.Parameters<[T]>,
): void {
  const tag = createPropertyTestTag(metadata)

  describe(`Property ${metadata.propertyNumber}: ${metadata.propertyTitle}`, () => {
    it(
      `${testName} - ${tag}`,
      {
        timeout: 60000, // Longer timeout for async tests
      },
      async () => {
        const property = fc.asyncProperty(arbitrary, predicate)
        await fc.assert<[T]>(property, {
          ...config,
          examples: config.examples || [],
        })
      },
    )
  })
}

// ============================================================================
// Property Test Helpers
// ============================================================================

/**
 * Helper to validate that a function throws an error
 */
export function expectToThrow<T>(fn: () => T): boolean {
  try {
    fn()
    return false // Should have thrown
  }
  catch {
    return true // Correctly threw an error
  }
}

/**
 * Helper to validate that an async function throws an error
 */
export async function expectToThrowAsync<T>(fn: () => Promise<T>): Promise<boolean> {
  try {
    await fn()
    return false // Should have thrown
  }
  catch {
    return true // Correctly threw an error
  }
}

/**
 * Helper to validate object structure
 */
export function hasRequiredFields<T extends Record<string, unknown>>(
  obj: T,
  requiredFields: (keyof T)[],
): boolean {
  return requiredFields.every(field => field in obj && obj[field] !== undefined)
}

/**
 * Helper to validate string format
 */
export function matchesPattern(str: string, pattern: RegExp): boolean {
  return pattern.test(str)
}

/**
 * Helper to validate array properties
 */
export function arrayInvariant<T>(arr: T[], predicate: (item: T) => boolean): boolean {
  return arr.every(predicate)
}

// ============================================================================
// Predefined Property Metadata
// ============================================================================

/**
 * Metadata for all properties defined in the design document
 */
export const PROPERTY_METADATA: Record<number, PropertyTestMetadata> = {
  1: {
    feature: 'chatgpt-web-modernization',
    propertyNumber: 1,
    propertyTitle: 'Modern JavaScript Feature Compliance',
    requirements: ['1.2', '1.5'],
    description:
      'For any JavaScript/TypeScript file, it should use Node.js 24+ native features instead of external polyfills',
  },
  2: {
    feature: 'chatgpt-web-modernization',
    propertyNumber: 2,
    propertyTitle: 'Vue.js Modernization Compliance',
    requirements: ['2.1', '2.2', '2.3'],
    description: 'For any Vue component, it should use Vue 3 Composition API with modern features',
  },
  3: {
    feature: 'chatgpt-web-modernization',
    propertyNumber: 3,
    propertyTitle: 'Route-Based Code Splitting',
    requirements: ['2.4', '8.5'],
    description: 'For any route definition, components should be loaded using dynamic imports',
  },
  4: {
    feature: 'chatgpt-web-modernization',
    propertyNumber: 4,
    propertyTitle: 'Async Component Suspense Usage',
    requirements: ['2.6'],
    description: 'For any async component, it should be properly wrapped with Vue Suspense',
  },
  5: {
    feature: 'chatgpt-web-modernization',
    propertyNumber: 5,
    propertyTitle: 'OpenAI API v1 Compatibility',
    requirements: ['3.1', '3.4'],
    description: 'For any OpenAI API request, the client should use v1 API endpoints correctly',
  },
  6: {
    feature: 'chatgpt-web-modernization',
    propertyNumber: 6,
    propertyTitle: 'Provider Endpoint Configuration',
    requirements: ['3.2', '3.3', '3.5'],
    description: 'For any AI provider configuration, the system should route requests correctly',
  },
  7: {
    feature: 'chatgpt-web-modernization',
    propertyNumber: 7,
    propertyTitle: 'Streaming Response Support',
    requirements: ['3.6'],
    description:
      'For any streaming request, both OpenAI and Azure providers should handle responses consistently',
  },
  8: {
    feature: 'chatgpt-web-modernization',
    propertyNumber: 8,
    propertyTitle: 'Provider Error Handling Consistency',
    requirements: ['3.7', '7.4'],
    description: 'For any error condition, error handling should be consistent across providers',
  },
  9: {
    feature: 'chatgpt-web-modernization',
    propertyNumber: 9,
    propertyTitle: 'Reasoning Model Support',
    requirements: ['4.1', '4.2', '4.3'],
    description:
      'For any reasoning model request, the client should handle model-specific parameters correctly',
  },
  10: {
    feature: 'chatgpt-web-modernization',
    propertyNumber: 10,
    propertyTitle: 'Reasoning Model UI Indicators',
    requirements: ['4.4'],
    description: 'For any reasoning model selection, appropriate UI indicators should be displayed',
  },
  11: {
    feature: 'chatgpt-web-modernization',
    propertyNumber: 11,
    propertyTitle: 'Input Validation and Sanitization',
    requirements: ['6.1', '6.5', '6.6'],
    description: 'For any user input, it should be properly validated and sanitized',
  },
  12: {
    feature: 'chatgpt-web-modernization',
    propertyNumber: 12,
    propertyTitle: 'Security Headers Implementation',
    requirements: ['6.2', '6.8'],
    description: 'For any HTTP response, it should include appropriate security headers',
  },
  13: {
    feature: 'chatgpt-web-modernization',
    propertyNumber: 13,
    propertyTitle: 'API Key Security',
    requirements: ['6.3'],
    description: 'For any API key handling, keys should be stored and transmitted securely',
  },
  14: {
    feature: 'chatgpt-web-modernization',
    propertyNumber: 14,
    propertyTitle: 'Rate Limiting Enforcement',
    requirements: ['6.4'],
    description:
      'For any series of requests exceeding limits, rate limiting should throttle properly',
  },
  15: {
    feature: 'chatgpt-web-modernization',
    propertyNumber: 15,
    propertyTitle: 'Secure Session Management',
    requirements: ['6.7'],
    description: 'For any user session, session management should follow security best practices',
  },
  16: {
    feature: 'chatgpt-web-modernization',
    propertyNumber: 16,
    propertyTitle: 'Provider Interface Consistency',
    requirements: ['7.1', '7.2', '7.3', '7.5'],
    description: 'For any AI provider implementation, it should conform to the base interface',
  },
  17: {
    feature: 'chatgpt-web-modernization',
    propertyNumber: 17,
    propertyTitle: 'Request/Response Logging',
    requirements: ['7.6'],
    description: 'For any API request, appropriate logging should be implemented',
  },
  18: {
    feature: 'chatgpt-web-modernization',
    propertyNumber: 18,
    propertyTitle: 'Provider Rate Limit Handling',
    requirements: ['7.7'],
    description: 'For any rate limit condition, the system should handle provider-specific limits',
  },
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Get property metadata by number
 */
export function getPropertyMetadata(propertyNumber: number): PropertyTestMetadata {
  const metadata = PROPERTY_METADATA[propertyNumber]
  if (!metadata) {
    throw new Error(`Property ${propertyNumber} not found in metadata`)
  }
  return metadata
}

/**
 * Create a property test using just the property number
 */
export function createPropertyTest<T>(
  propertyNumber: number,
  testName: string,
  arbitrary: fc.Arbitrary<T>,
  predicate: (value: T) => boolean | void,
  config?: fc.Parameters<[T]>,
): void {
  const metadata = getPropertyMetadata(propertyNumber)
  propertyTest(metadata, testName, arbitrary, predicate, config)
}

/**
 * Create an async property test using just the property number
 */
export function createAsyncPropertyTest<T>(
  propertyNumber: number,
  testName: string,
  arbitrary: fc.Arbitrary<T>,
  predicate: (value: T) => Promise<boolean | void>,
  config?: fc.Parameters<[T]>,
): void {
  const metadata = getPropertyMetadata(propertyNumber)
  asyncPropertyTest(metadata, testName, arbitrary, predicate, config)
}
