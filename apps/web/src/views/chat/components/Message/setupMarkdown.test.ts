import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { disableD2Mock, enableD2Mock, enableKatexMock, enableMermaidMock } = vi.hoisted(() => ({
  disableD2Mock: vi.fn(),
  enableD2Mock: vi.fn(),
  enableKatexMock: vi.fn(),
  enableMermaidMock: vi.fn(),
}))

vi.mock('markstream-vue', () => ({
  disableD2: disableD2Mock,
  enableD2: enableD2Mock,
  enableKatex: enableKatexMock,
  enableMermaid: enableMermaidMock,
}))

describe('setupMarkdownRender', () => {
  beforeEach(() => {
    vi.resetModules()
    disableD2Mock.mockReset()
    enableD2Mock.mockReset()
    enableKatexMock.mockReset()
    enableMermaidMock.mockReset()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('disables D2 by default and initializes markdown rendering once per session', async () => {
    const { setupMarkdownRender } = await import('./setupMarkdown')

    setupMarkdownRender()
    setupMarkdownRender()

    expect(disableD2Mock).toHaveBeenCalledTimes(1)
    expect(enableD2Mock).not.toHaveBeenCalled()
    expect(enableKatexMock).toHaveBeenCalledTimes(1)
    expect(enableMermaidMock).toHaveBeenCalledTimes(1)
  })

  it('enables D2 only when explicitly opted in', async () => {
    vi.stubEnv('VITE_APP_ENABLE_D2', 'true')

    const { setupMarkdownRender } = await import('./setupMarkdown')

    setupMarkdownRender()

    expect(enableD2Mock).toHaveBeenCalledTimes(1)
    expect(disableD2Mock).not.toHaveBeenCalled()
  })
})
