// @env browser
import '@/styles/lib/tailwind.css'
import '@/styles/lib/highlight.less'
import '@/styles/lib/github-markdown.less'
import '@/styles/global.less'

const NAIVE_UI_STYLE_META_NAME = 'naive-ui-style'

function naiveStyleOverride() {
  if (typeof document === 'undefined') return
  if (document.head.querySelector(`meta[name="${NAIVE_UI_STYLE_META_NAME}"]`)) return

  const meta = document.createElement('meta')
  meta.name = NAIVE_UI_STYLE_META_NAME
  document.head.appendChild(meta)
}

function setupAssets() {
  if (typeof document === 'undefined') return
  naiveStyleOverride()
}

export default setupAssets
