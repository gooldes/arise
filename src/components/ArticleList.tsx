import type { ComponentChildren } from 'preact'
import { categoryById } from '../data'
import { to } from '../lib/router'
import type { Article } from '../types'
import { Icon } from './Icon'

interface Props {
  articles: Article[]
  showCategory?: boolean
  renderSummary?: (a: Article) => ComponentChildren
}

export function ArticleList({ articles, showCategory, renderSummary }: Props) {
  return (
    <ul class="list">
      {articles.map((a) => (
        <li key={a.slug}>
          <a class="list-row" href={to.article(a.slug)}>
            {a.image ? (
              <img class="list-row__thumb" src={a.image} alt="" loading="lazy" decoding="async" />
            ) : (
              <span class={`urgency-dot urgency-dot--${a.urgency}`} aria-hidden="true" />
            )}
            <span class="list-row__body">
              <span class="list-row__title">
                {a.title}
                {a.draft && <span class="badge badge--muted">черновик</span>}
              </span>
              {a.latin && <span class="list-row__latin">{a.latin}</span>}
              {showCategory && <span class="list-row__meta">{categoryById.get(a.category)?.title}</span>}
              {(renderSummary ? renderSummary(a) : a.summary) && (
                <span class="list-row__summary">{renderSummary ? renderSummary(a) : a.summary}</span>
              )}
            </span>
            <Icon name="chevron" size={18} />
          </a>
        </li>
      ))}
    </ul>
  )
}

export function Empty({ title, children }: { title: string; children?: ComponentChildren }) {
  return (
    <div class="empty">
      <p class="empty__title">{title}</p>
      {children && <p class="empty__text">{children}</p>}
    </div>
  )
}
