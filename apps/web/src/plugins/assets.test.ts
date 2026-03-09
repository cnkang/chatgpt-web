import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('setupAssets', () => {
  beforeEach(() => {
    vi.resetModules()
    document.head.innerHTML = ''
    document.body.innerHTML = ''
  })

  it('applies the Naive UI preflight override once', async () => {
    const { default: setupAssets } = await import('./assets')

    setupAssets()
    setupAssets()

    expect(document.head.querySelectorAll('meta[name="naive-ui-style"]')).toHaveLength(1)
  })
})
