import { nextTick, useTemplateRef, type ShallowRef } from 'vue'

type ScrollElement = HTMLDivElement
type TemplateElementRef<T> = Readonly<ShallowRef<T | null>>

interface ScrollReturn {
  scrollRef: TemplateElementRef<ScrollElement>
  scrollToBottom: () => Promise<void>
  scrollToTop: () => Promise<void>
  scrollToBottomIfAtBottom: () => Promise<void>
}

export function useScroll(refKey = 'scrollRef'): ScrollReturn {
  const scrollRef = useTemplateRef<ScrollElement>(refKey)

  const scrollToBottom = async () => {
    await nextTick()
    if (scrollRef.value)
      scrollRef.value.scrollTop = scrollRef.value.scrollHeight
  }

  const scrollToTop = async () => {
    await nextTick()
    if (scrollRef.value)
      scrollRef.value.scrollTop = 0
  }

  const scrollToBottomIfAtBottom = async () => {
    await nextTick()
    if (scrollRef.value) {
      const threshold = 100 // Threshold, indicating the distance threshold to the bottom of the scroll bar.
      const distanceToBottom = scrollRef.value.scrollHeight - scrollRef.value.scrollTop - scrollRef.value.clientHeight
      if (distanceToBottom <= threshold)
        scrollRef.value.scrollTop = scrollRef.value.scrollHeight
    }
  }

  return {
    scrollRef,
    scrollToBottom,
    scrollToTop,
    scrollToBottomIfAtBottom,
  }
}
