/**
 * URL security helpers for strict host/protocol validation.
 */

function parseUrl(value: string): URL | null {
  try {
    return new URL(value)
  } catch {
    return null
  }
}

function hasExactHostOrSubdomain(hostname: string, baseHost: string): boolean {
  return hostname === baseHost || hostname.endsWith(`.${baseHost}`)
}

export function isOfficialOpenAIEndpoint(value: string): boolean {
  const parsed = parseUrl(value)
  if (!parsed) {
    return false
  }

  return parsed.protocol === 'https:' && parsed.hostname.toLowerCase() === 'api.openai.com'
}

export function isOfficialAzureOpenAIEndpoint(value: string): boolean {
  const parsed = parseUrl(value)
  if (!parsed) {
    return false
  }

  const hostname = parsed.hostname.toLowerCase()
  return parsed.protocol === 'https:' && hasExactHostOrSubdomain(hostname, 'openai.azure.com')
}
