import * as fs from 'node:fs'
import * as path from 'node:path'
import { promisify } from 'node:util'

const readFile = promisify(fs.readFile)
const readdir = promisify(fs.readdir)
const stat = promisify(fs.stat)

/**
 * Result of codebase cleanup validation
 */
export interface CleanupValidationResult {
  isClean: boolean
  violations: CleanupViolation[]
  summary: CleanupSummary
}

/**
 * A violation found during cleanup validation
 */
export interface CleanupViolation {
  type: ViolationType
  file: string
  line?: number
  content: string
  pattern: string
  severity: 'error' | 'warning'
}

/**
 * Summary of cleanup validation results
 */
export interface CleanupSummary {
  totalFilesScanned: number
  violationsFound: number
  errorCount: number
  warningCount: number
  cleanFiles: number
}

/**
 * Types of violations that can be found
 */
export type ViolationType
  = | 'unofficial_api_import'
    | 'unofficial_api_usage'
    | 'deprecated_config_var'
    | 'access_token_reference'
    | 'reverse_proxy_reference'
    | 'web_scraping_code'
    | 'browser_automation'
    | 'unofficial_dependency'

/**
 * Configuration for cleanup validation
 */
export interface CleanupValidationConfig {
  rootPath: string
  includePatterns: string[]
  excludePatterns: string[]
  fileExtensions: string[]
}

/**
 * Deprecated patterns to search for in the codebase
 */
const DEPRECATED_PATTERNS = {
  // Unofficial API imports and usage
  unofficial_api_import: [
    /ChatGPTUnofficialProxyAPI/g,
    /chatgpt-unofficial/g,
    /unofficial.*proxy.*api/gi,
  ],

  // Access token references
  access_token_reference: [
    /OPENAI_ACCESS_TOKEN/g,
    /CHATGPT_ACCESS_TOKEN/g,
    /accessToken/g,
    /access_token/g,
  ],

  // Reverse proxy references
  reverse_proxy_reference: [
    /API_REVERSE_PROXY/g,
    /REVERSE_PROXY_URL/g,
    /reverseProxy/g,
    /reverse_proxy/g,
    /apiReverseProxyUrl/g,
  ],

  // Web scraping and browser automation
  web_scraping_code: [/puppeteer/gi, /playwright/gi, /selenium/gi, /cheerio/gi, /jsdom/gi],

  // Browser automation specific patterns
  browser_automation: [
    /browser\.newPage/g,
    /page\.goto/g,
    /page\.click/g,
    /page\.type/g,
    /page\.evaluate/g,
  ],

  // Deprecated configuration variables
  deprecated_config_var: [
    /process\.env\.OPENAI_ACCESS_TOKEN/g,
    /process\.env\.API_REVERSE_PROXY/g,
    /process\.env\.CHATGPT_ACCESS_TOKEN/g,
    /process\.env\.REVERSE_PROXY_URL/g,
  ],
} as const

/**
 * File extensions to scan for cleanup validation
 */
const DEFAULT_FILE_EXTENSIONS = ['.ts', '.js', '.vue', '.json', '.md', '.txt', '.env']

/**
 * Default patterns to exclude from scanning
 */
const DEFAULT_EXCLUDE_PATTERNS = [
  'node_modules',
  '.git',
  'build',
  'dist',
  '.next',
  'coverage',
  '.nyc_output',
  'logs',
  '*.log',
  '.env.local',
  '.env.*.local',
]

/**
 * Comprehensive cleanup validator for verifying removal of unofficial API code
 */
export class CleanupValidator {
  private config: CleanupValidationConfig

  constructor(config?: Partial<CleanupValidationConfig>) {
    this.config = {
      rootPath: config?.rootPath || process.cwd(),
      includePatterns: config?.includePatterns || ['**/*'],
      excludePatterns: config?.excludePatterns || DEFAULT_EXCLUDE_PATTERNS,
      fileExtensions: config?.fileExtensions || DEFAULT_FILE_EXTENSIONS,
    }
  }

  /**
   * Validate that the codebase is clean of unofficial API references
   * @returns {Promise<CleanupValidationResult>} Validation result
   */
  async validateCleanup(): Promise<CleanupValidationResult> {
    const violations: CleanupViolation[] = []
    let totalFilesScanned = 0

    try {
      const files = await this.getAllCodeFiles()
      totalFilesScanned = files.length

      for (const file of files) {
        const fileViolations = await this.scanFile(file)
        violations.push(...fileViolations)
      }

      const summary: CleanupSummary = {
        totalFilesScanned,
        violationsFound: violations.length,
        errorCount: violations.filter(v => v.severity === 'error').length,
        warningCount: violations.filter(v => v.severity === 'warning').length,
        cleanFiles: totalFilesScanned - new Set(violations.map(v => v.file)).size,
      }

      return {
        isClean: violations.filter(v => v.severity === 'error').length === 0,
        violations,
        summary,
      }
    }
    catch (error) {
      throw new Error(`Cleanup validation failed: ${(error as Error).message}`)
    }
  }

  /**
   * Validate that no unofficial API references remain in the codebase
   * @returns {Promise<boolean>} True if no unofficial API references found
   */
  async validateNoUnofficialAPIReferences(): Promise<boolean> {
    const result = await this.validateCleanup()
    const unofficialAPIViolations = result.violations.filter(
      v => v.type === 'unofficial_api_import' || v.type === 'unofficial_api_usage',
    )
    return unofficialAPIViolations.length === 0
  }

  /**
   * Validate that no deprecated configuration variables remain
   * @returns {Promise<boolean>} True if no deprecated config vars found
   */
  async validateNoDeprecatedConfigVars(): Promise<boolean> {
    const result = await this.validateCleanup()
    const configViolations = result.violations.filter(
      v =>
        v.type === 'deprecated_config_var'
        || v.type === 'access_token_reference'
        || v.type === 'reverse_proxy_reference',
    )
    return configViolations.length === 0
  }

  /**
   * Validate that no security risks from unofficial API code remain
   * @returns {Promise<boolean>} True if no security risks found
   */
  async validateNoSecurityRisks(): Promise<boolean> {
    const result = await this.validateCleanup()
    const securityViolations = result.violations.filter(
      v => v.type === 'web_scraping_code' || v.type === 'browser_automation',
    )
    return securityViolations.length === 0
  }

  /**
   * Get all code files to scan based on configuration
   * @returns {Promise<string[]>} Array of file paths to scan
   */
  private async getAllCodeFiles(): Promise<string[]> {
    const files: string[] = []

    const scanDirectory = async (dirPath: string): Promise<void> => {
      try {
        const entries = await readdir(dirPath)

        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry)
          const relativePath = path.relative(this.config.rootPath, fullPath)

          // Skip excluded patterns
          if (this.shouldExclude(relativePath)) {
            continue
          }

          const stats = await stat(fullPath)

          if (stats.isDirectory()) {
            await scanDirectory(fullPath)
          }
          else if (stats.isFile() && this.shouldInclude(fullPath)) {
            files.push(fullPath)
          }
        }
      }
      catch (error) {
        // Skip directories that can't be read
        console.warn(`Warning: Could not read directory ${dirPath}: ${(error as Error).message}`)
      }
    }

    await scanDirectory(this.config.rootPath)
    return files
  }

  /**
   * Scan a single file for deprecated patterns
   * @param {string} filePath - Path to the file to scan
   * @returns {Promise<CleanupViolation[]>} Array of violations found in the file
   */
  private async scanFile(filePath: string): Promise<CleanupViolation[]> {
    const violations: CleanupViolation[] = []

    try {
      const content = await readFile(filePath, 'utf-8')
      const lines = content.split('\n')

      // Scan for each type of deprecated pattern
      for (const [violationType, patterns] of Object.entries(DEPRECATED_PATTERNS)) {
        for (const pattern of patterns) {
          const matches = content.matchAll(pattern)

          for (const match of matches) {
            if (match.index !== undefined) {
              const lineNumber = this.getLineNumber(content, match.index)
              const lineContent = lines[lineNumber - 1]?.trim() || ''

              violations.push({
                type: violationType as ViolationType,
                file: path.relative(this.config.rootPath, filePath),
                line: lineNumber,
                content: lineContent,
                pattern: pattern.source,
                severity: this.getSeverity(violationType as ViolationType),
              })
            }
          }
        }
      }
    }
    catch (error) {
      // Skip files that can't be read
      console.warn(`Warning: Could not read file ${filePath}: ${(error as Error).message}`)
    }

    return violations
  }

  /**
   * Get line number for a character index in content
   * @param {string} content - File content
   * @param {number} index - Character index
   * @returns {number} Line number (1-based)
   */
  private getLineNumber(content: string, index: number): number {
    const beforeMatch = content.substring(0, index)
    return beforeMatch.split('\n').length
  }

  /**
   * Get severity level for a violation type
   * @param {ViolationType} type - Type of violation
   * @returns {'error' | 'warning'} Severity level
   */
  private getSeverity(type: ViolationType): 'error' | 'warning' {
    // All unofficial API and deprecated config violations are errors
    const errorTypes: ViolationType[] = [
      'unofficial_api_import',
      'unofficial_api_usage',
      'deprecated_config_var',
      'access_token_reference',
      'reverse_proxy_reference',
    ]

    return errorTypes.includes(type) ? 'error' : 'warning'
  }

  /**
   * Check if a file should be included in scanning
   * @param {string} filePath - Path to check
   * @returns {boolean} True if file should be included
   */
  private shouldInclude(filePath: string): boolean {
    const ext = path.extname(filePath)
    return this.config.fileExtensions.includes(ext)
  }

  /**
   * Check if a path should be excluded from scanning
   * @param {string} relativePath - Relative path to check
   * @returns {boolean} True if path should be excluded
   */
  private shouldExclude(relativePath: string): boolean {
    return this.config.excludePatterns.some((pattern) => {
      // Simple pattern matching - could be enhanced with glob patterns
      if (pattern.includes('*')) {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'))
        return regex.test(relativePath)
      }
      return relativePath.includes(pattern)
    })
  }

  /**
   * Generate a detailed report of cleanup validation results
   * @param {CleanupValidationResult} result - Validation result
   * @returns {string} Formatted report
   */
  static generateReport(result: CleanupValidationResult): string {
    const { summary, violations } = result

    let report = `
Cleanup Validation Report
========================

Summary:
- Total files scanned: ${summary.totalFilesScanned}
- Clean files: ${summary.cleanFiles}
- Files with violations: ${summary.totalFilesScanned - summary.cleanFiles}
- Total violations: ${summary.violationsFound}
- Errors: ${summary.errorCount}
- Warnings: ${summary.warningCount}

Status: ${result.isClean ? '✅ CLEAN' : '❌ VIOLATIONS FOUND'}
`

    if (violations.length > 0) {
      report += '\n\nViolations Found:\n'
      report += '=================\n'

      // Group violations by type
      const violationsByType = violations.reduce(
        (acc, violation) => {
          if (!acc[violation.type]) {
            acc[violation.type] = []
          }
          acc[violation.type].push(violation)
          return acc
        },
        {} as Record<ViolationType, CleanupViolation[]>,
      )

      for (const [type, typeViolations] of Object.entries(violationsByType)) {
        report += `\n${type.toUpperCase().replace(/_/g, ' ')}:\n`

        for (const violation of typeViolations) {
          const severity = violation.severity === 'error' ? '❌' : '⚠️'
          report += `  ${severity} ${violation.file}`
          if (violation.line) {
            report += `:${violation.line}`
          }
          report += `\n     Pattern: ${violation.pattern}\n`
          if (violation.content) {
            report += `     Content: ${violation.content}\n`
          }
          report += '\n'
        }
      }
    }

    return report
  }
}
