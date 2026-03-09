import { defineComponent, h } from 'vue'

type D2Node = {
  code?: string
}

export default defineComponent({
  name: 'MarkstreamD2Disabled',
  props: {
    node: {
      type: Object as () => D2Node,
      default: () => ({}),
    },
  },
  setup(props) {
    return () =>
      h(
        'div',
        {
          class:
            'my-4 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-300',
        },
        [
          h('p', { class: 'font-medium' }, 'D2 diagrams are not enabled in this deployment.'),
          h(
            'p',
            { class: 'mt-1 text-xs opacity-80' },
            'Markdown, KaTeX, and Mermaid remain supported by default.',
          ),
          props.node.code
            ? h(
                'pre',
                {
                  class:
                    'mt-3 overflow-x-auto whitespace-pre-wrap rounded bg-black/5 p-3 text-xs dark:bg-white/5',
                },
                [h('code', null, props.node.code)],
              )
            : null,
        ],
      )
  },
})
