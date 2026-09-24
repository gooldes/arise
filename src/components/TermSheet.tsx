import { useEffect } from 'preact/hooks'
import { articleBySlug, termById } from '../data'
import { createStore } from '../lib/store'
import { to } from '../lib/router'
import { Icon } from './Icon'

/** Открытый термин (id) — показывается нижней шторкой поверх любого экрана */
export const activeTerm = createStore<{ id: string; fromSlug?: string } | null>(null)

export function openTerm(id: string, fromSlug?: string) {
  activeTerm.set({ id, fromSlug })
}

export function TermSheet() {
  const state = activeTerm.use()
  const term = state ? termById.get(state.id) : undefined

  useEffect(() => {
    if (!term) return
    const close = () => activeTerm.set(null)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    addEventListener('hashchange', close)
    addEventListener('keydown', onKey)
    return () => {
      removeEventListener('hashchange', close)
      removeEventListener('keydown', onKey)
    }
  }, [term])

  if (!term) return null
  const article = term.article && term.article !== state?.fromSlug ? articleBySlug.get(term.article) : undefined

  return (
    <div class="sheet-backdrop" onClick={() => activeTerm.set(null)}>
      <div class="sheet" role="dialog" aria-modal="true" aria-label={term.term} onClick={(e) => e.stopPropagation()}>
        <div class="sheet__grip" aria-hidden="true" />
        <div class="sheet__head">
          <h2 class="sheet__title">{term.term}</h2>
          <button class="icon-btn icon-btn--small" onClick={() => activeTerm.set(null)} aria-label="Закрыть">
            <Icon name="close" size={20} />
          </button>
        </div>
        <p class="sheet__text">{term.definition}</p>
        {article && (
          <a class="sheet__link" href={to.article(article.slug)}>
            <span>
              <small>Подробнее в статье</small>
              {article.title}
            </span>
            <Icon name="chevron" size={18} />
          </a>
        )}
      </div>
    </div>
  )
}
