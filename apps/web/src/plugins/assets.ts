import 'katex/dist/katex.min.css'
import '@/styles/lib/tailwind.css'
import 'markstream-vue/index.css'
import '@/styles/lib/highlight.less'
import '@/styles/lib/github-markdown.less'
import '@/styles/global.less'
import { enableKatex, enableMermaid } from 'markstream-vue'

/** Tailwind's Preflight Style Override */
function naiveStyleOverride() {
  const meta = document.createElement('meta')
  meta.name = 'naive-ui-style'
  document.head.appendChild(meta)
}

function setupAssets() {
  naiveStyleOverride()
  enableKatex()
  enableMermaid()
}

export default setupAssets
