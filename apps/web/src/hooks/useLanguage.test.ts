import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { setLocaleMock } = vi.hoisted(() => ({
  setLocaleMock: vi.fn(),
}))

vi.mock('@/locales', async importOriginal => {
  const actual = await importOriginal<typeof import('@/locales')>()
  return {
    ...actual,
    setLocale: setLocaleMock,
  }
})

describe('useLanguage', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    setLocaleMock.mockReset()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('keeps the computed locale pure and syncs i18n via watch', async () => {
    const { useAppStore } = await import('@/store/modules/app')
    const { useLanguage } = await import('./useLanguage')
    const store = useAppStore()
    const { language } = useLanguage()

    await vi.waitFor(() => {
      expect(language.value?.name).toBeTypeOf('string')
    })

    expect(setLocaleMock).toHaveBeenCalledTimes(1)
    expect(setLocaleMock).toHaveBeenCalledWith(store.language)

    expect(language.value).toBeDefined()
    expect(setLocaleMock).toHaveBeenCalledTimes(1)

    const nextLanguage = store.language === 'en-US' ? 'zh-CN' : 'en-US'
    store.setLanguage(nextLanguage)
    await nextTick()
    await vi.waitFor(() => {
      expect(language.value?.name).toBeTypeOf('string')
    })

    expect(setLocaleMock).toHaveBeenCalledTimes(2)
    expect(setLocaleMock).toHaveBeenLastCalledWith(nextLanguage)
  })
})
