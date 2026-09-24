import { useEffect, useState } from 'preact/hooks'
import { articleBySlug, bookById, categoryById } from '../data'
import { canGoBack, previousHash } from '../lib/nav'
import { parseHash } from '../lib/router'
import { Icon } from './Icon'

/** Подпись для экрана, куда вернёт «назад» */
function describe(hash: string): string | null {
  const r = parseHash(hash)
  switch (r.name) {
    case 'article':
      return articleBySlug.get(r.slug)?.title ?? null
    case 'search':
      return r.q ? `поиску «${r.q}»` : 'поиску'
    case 'category':
      return categoryById.get(r.id)?.title ?? null
    case 'book':
      return bookById.get(r.id)?.title ?? null
    case 'glossary':
      return 'словарю'
    default:
      return null
  }
}

/**
 * Плашка «← Вернуться к …» — видна, когда в статью или книгу пришли по ссылке
 * из другой статьи, поиска или книги. Возвращает на то же место прокрутки.
 */
export function BackPill({ hash }: { hash: string }) {
  // прячется при чтении вниз, появляется при прокрутке вверх — не закрывает текст
  const [hidden, setHidden] = useState(false)
  useEffect(() => {
    let last = scrollY
    const onScroll = () => {
      const d = scrollY - last
      if (Math.abs(d) < 12) return
      setHidden(d > 0 && scrollY > 200)
      last = scrollY
    }
    setHidden(false)
    addEventListener('scroll', onScroll, { passive: true })
    return () => removeEventListener('scroll', onScroll)
  }, [hash])

  const here = parseHash(hash).name
  if (!canGoBack() || (here !== 'article' && here !== 'book')) return null
  const prev = previousHash()
  if (!prev) return null
  const prevRoute = parseHash(prev).name
  if (!['article', 'search', 'book', 'glossary'].includes(prevRoute)) return null
  const label = describe(prev)
  if (!label) return null
  const isArticle = prevRoute === 'article' || prevRoute === 'book'
  return (
    <button class={`back-pill${hidden ? ' is-hidden' : ''}`} onClick={() => history.back()}>
      <Icon name="back" size={18} />
      <span>
        Вернуться к {isArticle ? `«${label}»` : label}
      </span>
    </button>
  )
}
