import { describe, expect, it } from 'vitest'
import { createApp } from 'vue'
import MarkstreamD2Disabled from './markstreamD2Disabled'

describe('MarkstreamD2Disabled', () => {
  it('explains the default rendering policy and preserves the raw D2 source', () => {
    const container = document.createElement('div')
    const app = createApp(MarkstreamD2Disabled, {
      node: {
        code: 'direction: right',
      },
    })
    app.mount(container)

    expect(container.textContent).toContain('D2 diagrams are not enabled in this deployment.')
    expect(container.textContent).toContain(
      'Markdown, KaTeX, and Mermaid remain supported by default.',
    )
    expect(container.textContent).toContain('direction: right')

    app.unmount()
  })
})
