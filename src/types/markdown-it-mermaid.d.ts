declare module '@md-reader/markdown-it-mermaid' {
  import type MarkdownIt from 'markdown-it'

  interface MermaidOptions {
    theme?: string
    themeVariables?: Record<string, any>
    [key: string]: any
  }

  declare const plugin: (md: MarkdownIt, options?: MermaidOptions) => void
  export = plugin
}
