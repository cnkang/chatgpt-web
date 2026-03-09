// @env browser
import 'katex/dist/katex.min.css'
import 'markstream-vue/index.css'
import { disableD2, enableD2, enableKatex, enableMermaid } from 'markstream-vue'

let markdownRenderInitialized = false

function isD2EnabledByPolicy() {
  return import.meta.env.VITE_APP_ENABLE_D2 === 'true'
}

export function setupMarkdownRender() {
  if (markdownRenderInitialized) return

  markdownRenderInitialized = true
  if (isD2EnabledByPolicy()) enableD2()
  else disableD2()
  enableKatex()
  enableMermaid()
}
