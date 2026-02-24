import { nextTick, useTemplateRef } from 'vue'

export function useScroll() {
  const scrollRef = useTemplateRef<HTMLDivElement>('scrollRef')

  const scrollToBottom = async () => {
    await nextTick()
    if (scrollRef.value) scrollRef.value.scrollTop = scrollRef.value.scrollHeight
  }

  const scrollToTop = async () => {
    await nextTick()
    if (scrollRef.value) scrollRef.value.scrollTop = 0
  }

  const scrollToBottomIfAtBottom = async () => {
    await nextTick()
    if (scrollRef.value) {
      const threshold = 100 // Threshold, indicating the distance threshold to the bottom of the scroll bar.
      const distanceToBottom =
        scrollRef.value.scrollHeight - scrollRef.value.scrollTop - scrollRef.value.clientHeight
      if (distanceToBottom <= threshold) scrollRef.value.scrollTop = scrollRef.value.scrollHeight
    }
  }

  return {
    scrollRef,
    scrollToBottom,
    scrollToTop,
    scrollToBottomIfAtBottom,
  }
}
