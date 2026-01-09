/**
 * Validation module for comprehensive cleanup verification
 *
 * This module provides utilities to validate that the unofficial API cleanup
 * has been completed successfully across the entire codebase.
 */

// Re-export configuration validator for convenience
export { ConfigurationValidator } from '../config/validator'
export type {
	ConfigurationError,
	ConfigurationErrorType,
	MigrationGuidance,
	MigrationInfo,
	MigrationStep,
	Resource,
	ValidatedConfig,
	ValidationResult,
} from '../config/validator'

export { CleanupValidator } from './cleanup-validator'
export type {
	CleanupSummary,
	CleanupValidationConfig,
	CleanupValidationResult,
	CleanupViolation,
	ViolationType,
} from './cleanup-validator'

export { runCleanupValidation } from './run-cleanup-validation'
export type { ValidationSummary } from './run-cleanup-validation'
