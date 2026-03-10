import type { ValidationResult } from './config/validator.js'
import type { SecurityRisk, SecurityValidationResult } from './security/index.js'

const NON_BLOCKING_SECURITY_RISK_TYPES = new Set<SecurityRisk['type']>([
  'MISSING_OFFICIAL_AUTH',
  'INVALID_API_KEY_FORMAT',
])

/**
 * Determines whether an error message indicates a missing required configuration.
 *
 * @param error - The error message to inspect
 * @returns `true` if the message starts with 'Missing required configuration:', `false` otherwise
 */
function isMissingRequiredConfigurationError(error: string) {
  return error.startsWith('Missing required configuration:')
}

export interface StartupValidationAssessment {
  allowDegradedStartup: boolean
  blockingConfigErrors: string[]
  blockingSecurityRisks: SecurityRisk[]
  nonBlockingConfigErrors: string[]
  nonBlockingSecurityRisks: SecurityRisk[]
}

/**
 * Assess startup readiness by categorizing configuration errors and security risks into blocking and non-blocking groups based on the runtime environment.
 *
 * @param nodeEnv - The current NODE_ENV value (may be undefined); non-'production' values allow degraded startup.
 * @param configValidation - Validation result containing configuration errors in `errors`.
 * @param securityValidation - Validation result containing security risks in `risks`.
 * @returns An object describing the assessment:
 *  - `allowDegradedStartup`: `true` when `nodeEnv` is not `'production'`, `false` otherwise.
 *  - `blockingConfigErrors`: configuration errors considered blocking for startup.
 *  - `blockingSecurityRisks`: security risks considered blocking for startup.
 *  - `nonBlockingConfigErrors`: configuration errors allowed during degraded startup (e.g., missing required configuration in non-production).
 *  - `nonBlockingSecurityRisks`: security risks allowed during degraded startup (types listed in `NON_BLOCKING_SECURITY_RISK_TYPES`).
 */
export function assessStartupValidation(
  nodeEnv: string | undefined,
  configValidation: ValidationResult,
  securityValidation: SecurityValidationResult,
): StartupValidationAssessment {
  const allowDegradedStartup = nodeEnv !== 'production'

  if (!allowDegradedStartup) {
    return {
      allowDegradedStartup,
      blockingConfigErrors: [...configValidation.errors],
      blockingSecurityRisks: [...securityValidation.risks],
      nonBlockingConfigErrors: [],
      nonBlockingSecurityRisks: [],
    }
  }

  return {
    allowDegradedStartup,
    blockingConfigErrors: configValidation.errors.filter(
      error => !isMissingRequiredConfigurationError(error),
    ),
    blockingSecurityRisks: securityValidation.risks.filter(
      risk => !NON_BLOCKING_SECURITY_RISK_TYPES.has(risk.type),
    ),
    nonBlockingConfigErrors: configValidation.errors.filter(isMissingRequiredConfigurationError),
    nonBlockingSecurityRisks: securityValidation.risks.filter(risk =>
      NON_BLOCKING_SECURITY_RISK_TYPES.has(risk.type),
    ),
  }
}
