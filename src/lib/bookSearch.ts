import { books } from '../data'
import type { Book } from '../types'
import { assetUrl } from './pdf'
import { normalize } from './ru'
import { queryStems, snippet } from './search'

export interface BookHit {
  book: Book
  page: number
  snippet: string
  score: number
}

const cache = new Map<string, Promise<{ pages: string[]; lower: string[] }>>()

function loadPages(book: Book) {
  let p = cache.get(book.id)
  if (!p) {
    p = fetch(assetUrl(`books/${book.id}.pages.json`))
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status))
        return r.json() as Promise<string[]>
      })
      .then((pages) => ({ pages, lower: pages.map(normalize) }))
    p.catch(() => cache.delete(book.id))
    cache.set(book.id, p)
  }
  return p
}

export const bookSearchAvailable = /^https?:$/.test(location.protocol) && books.some((b) => b.searchable)

/** Полнотекстовый поиск по страницам книг: страница подходит, если на ней есть все слова запроса */
export async function searchBooks(query: string, limit = 40, perBook = 8): Promise<BookHit[]> {
  const stems = queryStems(query).filter((s) => s.length >= 3)
  if (!stems.length) return []
  const hits: BookHit[] = []
  await Promise.all(
    books
      .filter((b) => b.searchable)
      .map(async (book) => {
        const { pages, lower } = await loadPages(book)
        const bookHits: BookHit[] = []
        lower.forEach((text, i) => {
          let score = 0
          for (const s of stems) {
            let count = 0
            let pos = text.indexOf(s)
            while (pos !== -1 && count < 20) {
              count++
              pos = text.indexOf(s, pos + s.length)
            }
            if (!count) return
            score += Math.log(1 + count)
          }
          bookHits.push({ book, page: i + 1, score, snippet: '' })
        })
        bookHits.sort((a, b) => b.score - a.score)
        for (const h of bookHits.slice(0, perBook)) {
          h.snippet = snippet(pages[h.page - 1], stems, 80)
          hits.push(h)
        }
      }),
  )
  return hits.sort((a, b) => b.score - a.score).slice(0, limit)
}
