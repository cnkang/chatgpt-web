/**
 * Test utilities for ChatGPT Web Modernization
 *
 * This module exports all test utilities including property-based test
 * generators, utilities, and configuration.
 */

// Property-based testing utilities
export * from './property-generators.js'
export * from './property-test-utils.js'

// Re-export fast-check for convenience
export * as fc from 'fast-check'
