/**
 * Security module for ChatGPT Web application
 * Provides validation and security checks to ensure unofficial API code removal
 */

export {
  type AuthValidationResult,
  type ConfigValidationResult,
  getAuthenticationMigrationGuidance,
  type MigrationGuidance,
  type MigrationStep,
  type Resource,
  type SecurityAuthResult,
  validateAuthenticationSecurity,
  validateOfficialAuthentication,
  validateSecureConfiguration,
} from './auth-validator'

export {
  performSecurityValidation,
  type SecurityRisk,
  type SecurityValidationResult,
  validateAuthenticationMethods,
  validateCodeSecurity,
  validateConfigurationSecurity,
  validateEnvironmentSecurity,
} from './validator'
