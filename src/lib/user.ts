import { createStore } from './store'

export type Theme = 'auto' | 'light' | 'dark' | 'night'

export interface Settings {
  theme: Theme
  fontScale: number
}

export const settings = createStore<Settings>({ theme: 'auto', fontScale: 1 }, 'settings')

/** Состав семьи для расчётов в руководствах (по умолчанию 2 взрослых + 2 ребёнка) */
export const family = createStore<{ adults: number; children: number }>({ adults: 2, children: 2 }, 'family')

/** Отмеченные пункты чек-листов: slug статьи → номера пунктов */
export const checklists = createStore<Record<string, number[]>>({}, 'checklists')
export const favorites = createStore<string[]>([], 'favorites')
export const recent = createStore<string[]>([], 'recent')

export const FONT_SCALES = [0.85, 1, 1.15, 1.3, 1.5]

export function toggleFavorite(slug: string) {
  const list = favorites.get()
  favorites.set(list.includes(slug) ? list.filter((s) => s !== slug) : [slug, ...list])
}

export function markRecent(slug: string) {
  recent.set([slug, ...recent.get().filter((s) => s !== slug)].slice(0, 12))
}

const THEME_COLORS: Record<Exclude<Theme, 'auto'>, string> = {
  light: '#f6f5f1',
  dark: '#16181a',
  night: '#000000',
}

function applySettings() {
  const { theme, fontScale } = settings.get()
  const root = document.documentElement
  if (theme === 'auto') delete root.dataset.theme
  else root.dataset.theme = theme
  root.style.setProperty('--font-scale', String(fontScale))

  const resolved = theme === 'auto' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[resolved])
}

export function initSettings() {
  applySettings()
  settings.subscribe(applySettings)
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', applySettings)
}

/** Где остановились в длинных статьях: slug → позиция прокрутки (px) */
export const readPositions = createStore<Record<string, number>>({}, 'readPos')
