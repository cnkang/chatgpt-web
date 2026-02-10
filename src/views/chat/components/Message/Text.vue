<script lang="ts" setup>
import MdKatex from '@vscode/markdown-it-katex'
import hljs from 'highlight.js'
import MarkdownIt from 'markdown-it'
import MdLinkAttributes from 'markdown-it-link-attributes'
import MdMermaid from 'mermaid-it-markdown'
import { computed, onMounted, onUnmounted, ref } from 'vue'
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
    const validLang = !!(normalizedLanguage && hljs.getLanguage(normalizedLanguage))
    if (validLang) {
      const lang = normalizedLanguage
      return highlightBlock(hljs.highlight(code, { language: lang }).value, lang)
    }
    return highlightBlock(hljs.highlightAuto(code).value, '')
  },
})

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

mdi.use(MdLinkAttributes, { attrs: { target: '_blank', rel: 'noopener noreferrer nofollow' } }).use(MdKatex).use(MdMermaid)

const wrapClass = computed(() => {
  return [
    'text-wrap',
    'min-w-[20px]',
    'rounded-md',
    isMobile.value ? 'p-2' : 'px-3 py-2',
    props.inversion ? 'bg-[#d2f9d1]' : 'bg-[#f4f6f8]',
    props.inversion ? 'dark:bg-[#a1dc95]' : 'dark:bg-[#1e1e20]',
    props.inversion ? 'message-request' : 'message-reply',
    { 'text-red-500': props.error },
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

onMounted(() => {
  textRef.value?.addEventListener('click', handleTextClick)
})

onUnmounted(() => {
  textRef.value?.removeEventListener('click', handleTextClick)
})
</script>

<template>
  <div class="text-black" :class="wrapClass">
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
