import { useEffect, useReducer } from 'preact/hooks'

const PREFIX = 'arise:'

// localStorage может быть недоступен (приватный режим, file:// в некоторых браузерах) —
// приложение обязано работать и без него.
function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (raw == null) return fallback
    const parsed = JSON.parse(raw) as T
    // новые поля настроек получают значения по умолчанию
    const isObj = (v: unknown) => typeof v === 'object' && v !== null && !Array.isArray(v)
    return isObj(fallback) && isObj(parsed) ? { ...fallback, ...parsed } : parsed
  } catch {
    return fallback
  }
}

function save(key: string, value: unknown) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    /* нет хранилища — живём в памяти */
  }
}

export interface Store<T> {
  get(): T
  set(value: T): void
  subscribe(fn: () => void): () => void
  use(): T
}

export function createStore<T>(value: T, persistKey?: string): Store<T> {
  if (persistKey) value = load(persistKey, value)
  const subs = new Set<() => void>()
  const store: Store<T> = {
    get: () => value,
    set(next) {
      value = next
      if (persistKey) save(persistKey, next)
      subs.forEach((fn) => fn())
    },
    subscribe(fn) {
      subs.add(fn)
      return () => subs.delete(fn)
    },
    use() {
      const [, rerender] = useReducer((n: number, _: void) => n + 1, 0)
      useEffect(() => store.subscribe(() => rerender()), [])
      return value
    },
  }
  return store
}
