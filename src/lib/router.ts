import { useEffect, useState } from 'preact/hooks'

// Hash-роутинг: работает и на сервере, и при открытии index.html с диска (file://).
export type Route =
  | { name: 'home' }
  | { name: 'category'; id: string }
  | { name: 'article'; slug: string; list?: boolean }
  | { name: 'lists' }
  | { name: 'search'; q: string }
  | { name: 'sos' }
  | { name: 'favorites' }
  | { name: 'settings' }
  | { name: 'glossary' }
  | { name: 'medcard' }
  | { name: 'books' }
  | { name: 'book'; id: string; page?: number }
  | { name: 'notfound' }

export function parseHash(hash: string): Route {
  const [path, query = ''] = hash.replace(/^#\/?/, '').split('?')
  const parts = path.split('/').filter(Boolean).map(safeDecode)
  switch (parts[0]) {
    case undefined:
      return { name: 'home' }
    case 'c':
      return parts[1] ? { name: 'category', id: parts[1] } : { name: 'notfound' }
    case 'a':
      return parts[1] ? { name: 'article', slug: parts[1] } : { name: 'notfound' }
    case 'l':
      return parts[1] ? { name: 'article', slug: parts[1], list: true } : { name: 'lists' }
    case 'lists':
      return { name: 'lists' }
    case 'search':
      return { name: 'search', q: new URLSearchParams(query).get('q') ?? '' }
    case 'sos':
      return { name: 'sos' }
    case 'fav':
      return { name: 'favorites' }
    case 'settings':
      return { name: 'settings' }
    case 'glossary':
      return { name: 'glossary' }
    case 'medcard':
      return { name: 'medcard' }
    case 'books':
      return { name: 'books' }
    case 'book': {
      const page = Number(new URLSearchParams(query).get('p'))
      return parts[1] ? { name: 'book', id: parts[1], page: page > 0 ? page : undefined } : { name: 'notfound' }
    }
    default:
      return { name: 'notfound' }
  }
}

function safeDecode(s: string) {
  try {
    return decodeURIComponent(s)
  } catch {
    return s
  }
}

export const to = {
  home: () => '#/',
  category: (id: string) => `#/c/${encodeURIComponent(id)}`,
  article: (slug: string) => `#/a/${encodeURIComponent(slug)}`,
  list: (slug: string) => `#/l/${encodeURIComponent(slug)}`,
  lists: () => '#/lists',
  search: (q = '') => (q ? `#/search?q=${encodeURIComponent(q)}` : '#/search'),
  sos: () => '#/sos',
  favorites: () => '#/fav',
  settings: () => '#/settings',
  glossary: () => '#/glossary',
  medcard: () => '#/medcard',
  books: () => '#/books',
  book: (id: string, page?: number) => `#/book/${encodeURIComponent(id)}${page ? `?p=${page}` : ''}`,
}

export function useHash(): string {
  const [hash, setHash] = useState(location.hash)
  useEffect(() => {
    const onChange = () => setHash(location.hash)
    addEventListener('hashchange', onChange)
    onChange() // хеш мог смениться до подписки
    return () => removeEventListener('hashchange', onChange)
  }, [])
  return hash
}
