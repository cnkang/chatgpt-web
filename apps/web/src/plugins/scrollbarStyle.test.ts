import { describe, expect, it } from 'vitest'
import setupScrollbarStyle from './scrollbarStyle'

describe('setupScrollbarStyle', () => {
  it('injects the scrollbar style once', () => {
    setupScrollbarStyle()
    setupScrollbarStyle()

    const styles = document.head.querySelectorAll('[data-chatgpt-web-scrollbar-style]')
    expect(styles).toHaveLength(1)
    expect(styles[0]?.textContent).toContain('::-webkit-scrollbar')
  })
})
