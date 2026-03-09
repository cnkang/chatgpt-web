// @env browser
import { darkTheme, lightTheme } from 'naive-ui'

const SCROLLBAR_STYLE_ATTR = 'data-chatgpt-web-scrollbar-style'

function setupScrollbarStyle() {
  if (typeof document === 'undefined') return
  if (document.head.querySelector(`[${SCROLLBAR_STYLE_ATTR}]`)) return

  const style = document.createElement('style')
  const styleContent = `
    ::-webkit-scrollbar {
      background-color: transparent;
      width: ${lightTheme.Scrollbar.common?.scrollbarWidth};
    }
    ::-webkit-scrollbar-thumb {
      background-color: ${lightTheme.Scrollbar.common?.scrollbarColor};
      border-radius: ${lightTheme.Scrollbar.common?.scrollbarBorderRadius};
    }
    html.dark ::-webkit-scrollbar {
      background-color: transparent;
      width: ${darkTheme.Scrollbar.common?.scrollbarWidth};
    }
    html.dark ::-webkit-scrollbar-thumb {
      background-color: ${darkTheme.Scrollbar.common?.scrollbarColor};
      border-radius: ${darkTheme.Scrollbar.common?.scrollbarBorderRadius};
    }
  `

  style.setAttribute(SCROLLBAR_STYLE_ATTR, 'true')
  style.textContent = styleContent
  document.head.appendChild(style)
}

export default setupScrollbarStyle
