<script lang="ts" setup>
import MdKatex from '@vscode/markdown-it-katex'
import hljs from 'highlight.js'
import MarkdownIt from 'markdown-it'
import mermaid from 'mermaid'
import { computed, nextTick, onMounted, onUnmounted, onUpdated, ref } from 'vue'
import { useBasicLayout } from '@/hooks/useBasicLayout'
import { t } from '@/locales'
import { copyToClip } from '@/utils/copy'

interface Props {
  inversion?: boolean
  error?: boolean
  text?: string
  loading?: boolean
  asRawText?: boolean
}

const props = defineProps<Props>()

const { isMobile } = useBasicLayout()

const textRef = ref<HTMLElement>()
let mermaidInitialized = false
let mermaidId = 0

function normalizeLanguage(language?: string): string {
  if (!language)
    return ''
  const normalized = language.trim().toLowerCase()
  return /^[a-z0-9+._-]{1,40}$/i.test(normalized) ? normalized : ''
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll('\'', '&#39;')
}

const mdi = new MarkdownIt({
  html: false,
  linkify: true,
  highlight(code, language) {
    const normalizedLanguage = normalizeLanguage(language)
    if (normalizedLanguage === 'mermaid')
      return `<pre><code class="language-mermaid">${escapeHtml(code)}</code></pre>`

    const validLang = !!(normalizedLanguage && hljs.getLanguage(normalizedLanguage))
    if (validLang) {
      const lang = normalizedLanguage
      return highlightBlock(hljs.highlight(code, { language: lang }).value, lang)
    }
    return highlightBlock(hljs.highlightAuto(code).value, '')
  },
})

function applySafeLinkAttributes(md: MarkdownIt) {
  const defaultRender = md.renderer.rules.link_open

  md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
    tokens[idx].attrSet('target', '_blank')
    tokens[idx].attrSet('rel', 'noopener noreferrer nofollow')

    if (defaultRender)
      return defaultRender(tokens, idx, options, env, self)

    return self.renderToken(tokens, idx, options)
  }
}

mdi.validateLink = (url: string) => {
  const trimmed = url.trim()
  if (!trimmed)
    return false

  if (/^(?:#|\/|\.\/|\.\.\/)/.test(trimmed))
    return true

  try {
    const parsed = new URL(trimmed, 'https://localhost')
    return ['http:', 'https:', 'mailto:', 'tel:'].includes(parsed.protocol)
  }
  catch {
    return false
  }
}

applySafeLinkAttributes(mdi)
mdi.use(MdKatex)

const wrapClass = computed(() => {
  return [
    'message-bubble',
    props.inversion ? 'message-bubble--user' : 'message-bubble--assistant',
    isMobile.value ? 'message-bubble--mobile' : 'message-bubble--desktop',
    { 'message-bubble--error': props.error },
  ]
})

const text = computed(() => {
  const value = props.text ?? ''
  if (!props.asRawText) {
    // 对数学公式进行处理，自动添加 $$ 符号
    const escapedText = escapeBrackets(escapeDollarNumber(value))
    return mdi.render(escapedText)
  }
  return value
})

function highlightBlock(str: string, lang?: string) {
  const safeLang = normalizeLanguage(lang)
  const safeLabel = escapeHtml(t('chat.copyCode'))
  const langClass = safeLang ? ` ${safeLang}` : ''
  const langText = safeLang ? escapeHtml(safeLang) : ''

  return `<pre class="code-block-wrapper"><div class="code-block-header"><span class="code-block-header__lang">${langText}</span><span class="code-block-header__copy">${safeLabel}</span></div><code class="hljs code-block-body${langClass}">${str}</code></pre>`
}

function handleTextClick(event: MouseEvent) {
  const target = event.target
  if (!(target instanceof Element))
    return

  const copyBtn = target.closest('.code-block-header__copy')
  if (!copyBtn || !textRef.value?.contains(copyBtn))
    return

  const code = copyBtn.parentElement?.nextElementSibling?.textContent
  if (!code)
    return

  copyToClip(code).then(() => {
    copyBtn.textContent = t('chat.copied')
    setTimeout(() => {
      copyBtn.textContent = t('chat.copyCode')
    }, 1000)
  })
}

function escapeDollarNumber(text: string) {
  let escapedText = ''

  for (let i = 0; i < text.length; i += 1) {
    let char = text[i]
    const nextChar = text[i + 1] || ' '

    if (char === '$' && nextChar >= '0' && nextChar <= '9')
      char = '\\$'

    escapedText += char
  }

  return escapedText
}

function escapeBrackets(text: string) {
  const pattern = /(```[\s\S]*?```|`.*?`)|\\\[([\s\S]*?[^\\])\\\]|\\\((.*?)\\\)/g
  return text.replace(pattern, (match, codeBlock, squareBracket, roundBracket) => {
    if (codeBlock)
      return codeBlock
    else if (squareBracket)
      return `$$${squareBracket}$$`
    else if (roundBracket)
      return `$${roundBracket}$`
    return match
  })
}

function ensureMermaidInitialized() {
  if (mermaidInitialized)
    return

  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    suppressErrorRendering: true,
  })
  mermaidInitialized = true
}

async function renderMermaidDiagrams() {
  if (props.asRawText || props.inversion)
    return

  const root = textRef.value
  if (!root)
    return

  const mermaidBlocks = Array.from(root.querySelectorAll<HTMLElement>('pre > code.language-mermaid'))
  if (mermaidBlocks.length === 0)
    return

  ensureMermaidInitialized()

  for (const block of mermaidBlocks) {
    const pre = block.parentElement
    const source = block.textContent?.trim()
    if (!(pre instanceof HTMLElement) || !source)
      continue

    try {
      const { svg } = await mermaid.render(`mermaid-${++mermaidId}`, source)
      const container = document.createElement('div')
      container.className = 'mermaid-container'
      container.innerHTML = svg
      pre.replaceWith(container)
    }
    catch {
      // Keep the source block when mermaid parsing fails.
    }
  }
}

onMounted(() => {
  textRef.value?.addEventListener('click', handleTextClick)
  void nextTick(() => renderMermaidDiagrams())
})

onUpdated(() => {
  void renderMermaidDiagrams()
})

onUnmounted(() => {
  textRef.value?.removeEventListener('click', handleTextClick)
})
</script>

<template>
  <div :class="wrapClass">
    <div ref="textRef" class="leading-relaxed break-words">
      <div v-if="!inversion">
        <div v-if="!asRawText" class="markdown-body" :class="{ 'markdown-body-generate': loading }" v-html="text" />
        <div v-else class="whitespace-pre-wrap" v-text="text" />
      </div>
      <div v-else class="whitespace-pre-wrap" v-text="text" />
    </div>
  </div>
</template>

<style lang="less">
@import url(./style.less);
</style>
