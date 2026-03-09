<script setup lang="ts">
import MarkdownRender from 'markstream-vue'
import { setupMarkdownRender } from './setupMarkdown'

interface Props {
  content: string
  final: boolean
  loading?: boolean
}

defineProps<Props>()

setupMarkdownRender()
</script>

<template>
  <MarkdownRender
    class="markdown-body"
    :class="{ 'markdown-body-generate': loading }"
    :content="content"
    :final="final"
  />
</template>
