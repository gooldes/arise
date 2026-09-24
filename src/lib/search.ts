import MiniSearch from 'minisearch'
import { articleBySlug, articles } from '../data'
import type { Article } from '../types'
import { normalize, processTerm, tokenize } from './ru'

export interface SearchHit {
  article: Article
  score: number
}

let index: MiniSearch | null = null

// Индекс строится лениво — при первом поиске, чтобы не тормозить старт.
function getIndex(): MiniSearch {
  if (index) return index
  index = new MiniSearch({
    idField: 'slug',
    fields: ['title', 'tags', 'summary', 'text'],
    tokenize,
    processTerm: (t) => processTerm(t) ?? false,
    extractField: (doc, field) => {
      const v = (doc as Record<string, unknown>)[field]
      return Array.isArray(v) ? v.join(' ') : String(v ?? '')
    },
  })
  index.addAll(articles)
  return index
}

const OPTIONS = {
  prefix: true,
  fuzzy: (term: string) => (term.length >= 5 ? 0.2 : false),
  boost: { title: 5, tags: 3, summary: 2 },
}

export function search(query: string): SearchHit[] {
  if (!query.trim()) return []
  const idx = getIndex()
  let res = idx.search(query, { ...OPTIONS, combineWith: 'AND' })
  if (!res.length) res = idx.search(query, { ...OPTIONS, combineWith: 'OR' })
  return res.flatMap((r) => {
    const article = articleBySlug.get(r.id as string)
    return article ? [{ article, score: r.score }] : []
  })
}

/** Основы слов запроса — для подсветки и сниппетов */
export function queryStems(query: string): string[] {
  return tokenize(query)
    .map(processTerm)
    .filter((t): t is string => !!t && t.length >= 2)
}

/** Фрагмент текста вокруг первого совпадения */
export function snippet(text: string, stems: string[], radius = 70): string {
  const lower = normalize(text)
  let pos = -1
  for (const s of stems) {
    const i = lower.indexOf(s)
    if (i !== -1 && (pos === -1 || i < pos)) pos = i
  }
  if (pos === -1) return text.slice(0, radius * 2) + (text.length > radius * 2 ? '…' : '')
  let start = Math.max(0, pos - radius)
  let end = Math.min(text.length, pos + radius * 1.5)
  if (start > 0) start = text.indexOf(' ', start) + 1 || start
  if (end < text.length) end = text.lastIndexOf(' ', end) || end
  return (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '')
}

/** Разбивает строку на части для подсветки: [текст, совпадение, текст, ...] */
export function highlightParts(text: string, stems: string[]): { text: string; hit: boolean }[] {
  if (!stems.length) return [{ text, hit: false }]
  const lower = normalize(text)
  const ranges: [number, number][] = []
  for (const s of stems) {
    let i = lower.indexOf(s)
    while (i !== -1) {
      // подсвечиваем до конца слова
      let end = i + s.length
      while (end < lower.length && /[\p{L}\p{N}]/u.test(lower[end])) end++
      ranges.push([i, end])
      i = lower.indexOf(s, end)
    }
  }
  if (!ranges.length) return [{ text, hit: false }]
  ranges.sort((a, b) => a[0] - b[0])
  const parts: { text: string; hit: boolean }[] = []
  let cursor = 0
  for (const [s, e] of ranges) {
    if (s < cursor) continue
    if (s > cursor) parts.push({ text: text.slice(cursor, s), hit: false })
    parts.push({ text: text.slice(s, e), hit: true })
    cursor = e
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor), hit: false })
  return parts
}
