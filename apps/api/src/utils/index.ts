interface SendResponseOptions<T = unknown> {
  type: 'Success' | 'Fail'
  message?: string
  data?: T
}

export function sendResponse<T>(options: SendResponseOptions<T>) {
  const payload = {
    message: options.message ?? null,
    data: options.data ?? null,
    status: options.type,
  }

  if (options.type === 'Success') {
    return Promise.resolve(payload)
  }

  const error = new Error(options.message ?? 'Failed') as Error & {
    data: T | null
    status: 'Fail'
  }
  error.data = payload.data
  error.status = 'Fail'
  return Promise.reject(error)
}
