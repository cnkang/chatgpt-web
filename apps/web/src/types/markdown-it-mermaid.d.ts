declare module '@md-reader/markdown-it-mermaid' {
	import type MarkdownIt from 'markdown-it'

	interface MermaidOptions {
		theme?: string
		themeVariables?: Record<string, unknown>
		[key: string]: unknown
	}

	declare const plugin: (md: MarkdownIt, options?: MermaidOptions) => void
	export = plugin
}
