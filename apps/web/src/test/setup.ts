import { afterEach } from 'vitest'

afterEach(() => {
  document.head.innerHTML = ''
  document.body.innerHTML = ''
  localStorage.clear()
  sessionStorage.clear()
})
