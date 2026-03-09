import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import MarkstreamD2Disabled from './markstreamD2Disabled'

describe('MarkstreamD2Disabled', () => {
  it('explains the default rendering policy and preserves the raw D2 source', () => {
    const wrapper = mount(MarkstreamD2Disabled, {
      props: {
        node: {
          code: 'direction: right',
        },
      },
    })

    expect(wrapper.text()).toContain('D2 diagrams are not enabled in this deployment.')
    expect(wrapper.text()).toContain('Markdown, KaTeX, and Mermaid remain supported by default.')
    expect(wrapper.text()).toContain('direction: right')
  })
})
