export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

export function isString(value: unknown): value is string {
  return typeof value === 'string'
}

export function isNotEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean'
}

export function isFunction<TArgs extends unknown[] = unknown[], TResult = unknown>(
  value: unknown,
): value is (...args: TArgs) => TResult {
  return typeof value === 'function'
}
