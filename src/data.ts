import { articles as rawArticles, books, categories, glossary } from 'virtual:content'
import type { Article } from './types'

export { books, categories, glossary }

function htmlToText(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

export const articles: Article[] = rawArticles.map((a) => ({ ...a, text: htmlToText(a.html) }))

export const categoryById = new Map(categories.map((c) => [c.id, c]))
export const articleBySlug = new Map(articles.map((a) => [a.slug, a]))
export const termById = new Map(glossary.map((t) => [t.id, t]))
export const bookById = new Map(books.map((b) => [b.id, b]))

export function articlesIn(categoryId: string): Article[] {
  return articles.filter((a) => a.category === categoryId)
}

export const sosArticles = articles.filter((a) => a.sos)

/** Самые частые теги — подсказки на пустом экране поиска */
export const popularTags: string[] = (() => {
  const freq = new Map<string, number>()
  for (const a of articles) for (const t of a.tags) freq.set(t, (freq.get(t) ?? 0) + 1)
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 16)
    .map(([t]) => t)
})()
