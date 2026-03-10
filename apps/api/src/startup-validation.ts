import type { ValidationResult } from './config/validator.js'
import type { SecurityRisk, SecurityValidationResult } from './security/index.js'

const NON_BLOCKING_SECURITY_RISK_TYPES = new Set<SecurityRisk['type']>([
  'MISSING_OFFICIAL_AUTH',
  'INVALID_API_KEY_FORMAT',
])

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
