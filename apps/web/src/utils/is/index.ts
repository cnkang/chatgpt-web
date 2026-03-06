export function isNumber(value: unknown): value is number {
  return Object.prototype.toString.call(value) === '[object Number]'
}

export function isString(value: unknown): value is string {
  return Object.prototype.toString.call(value) === '[object String]'
}

export function isBoolean(value: unknown): value is boolean {
  return Object.prototype.toString.call(value) === '[object Boolean]'
}

export function isNull(value: unknown): value is null {
  return Object.prototype.toString.call(value) === '[object Null]'
}

export function isUndefined(value: unknown): value is undefined {
  return Object.prototype.toString.call(value) === '[object Undefined]'
}

export function isObject(value: unknown): value is object {
  return Object.prototype.toString.call(value) === '[object Object]'
}

export function isArray<T = unknown>(value: unknown): value is T[] {
  return Object.prototype.toString.call(value) === '[object Array]'
}

export function isFunction(value: unknown): value is (...args: unknown[]) => unknown {
  return Object.prototype.toString.call(value) === '[object Function]'
}

export function isDate(value: unknown): value is Date {
  return Object.prototype.toString.call(value) === '[object Date]'
}

export function isRegExp(value: unknown): value is RegExp {
  return Object.prototype.toString.call(value) === '[object RegExp]'
}

export function isPromise<T = unknown>(value: unknown): value is Promise<T> {
  return Object.prototype.toString.call(value) === '[object Promise]'
}

export function isSet<T = unknown>(value: unknown): value is Set<T> {
  return Object.prototype.toString.call(value) === '[object Set]'
}

export function isMap<K = unknown, V = unknown>(value: unknown): value is Map<K, V> {
  return Object.prototype.toString.call(value) === '[object Map]'
}

export function isFile(value: unknown): value is File {
  return Object.prototype.toString.call(value) === '[object File]'
}
