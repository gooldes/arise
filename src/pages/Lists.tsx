import { Header } from '../components/Header'
import { Icon } from '../components/Icon'
import { articleBySlug, articles } from '../data'
import { LIST_GROUPS } from '../lib/lists'
import { to } from '../lib/router'
import { checklists } from '../lib/user'
import type { Article } from '../types'

const hasList = (a: Article) => a.checklistSize > 0

export function Lists() {
  const checked = checklists.use()
  const listed = new Set(LIST_GROUPS.flatMap((g) => g.items.map((i) => i.slug)))
  // Остальные статьи с заметными чек-листами — хозяйство, оружие и т.п.
  const other = articles.filter((a) => !listed.has(a.slug) && a.checklistSize >= 5)

  const row = (a: Article, where?: string) => {
    const done = (checked[a.slug] ?? []).length
    return (
      <li key={a.slug}>
        <a class="list-row" href={to.list(a.slug)}>
          <span class="list-row__body">
            <span class="list-row__title">{a.title}</span>
            {where && <span class="list-row__summary">{where}</span>}
            <span class="list-progress">
              <progress max={a.checklistSize} value={done} />
              <span>
                {done} / {a.checklistSize}
              </span>
            </span>
          </span>
          <Icon name="chevron" size={18} />
        </a>
      </li>
    )
  }

  return (
    <>
      <Header title="Списки: что взять и куда" />
      <main class="page">
        <p class="page-intro">
          Только списки, без лишнего текста. Отмечайте, что уже собрано, — отметки сохраняются на устройстве и
          совпадают с отметками в статьях.
        </p>
        {LIST_GROUPS.map((g) => {
          const items = g.items.flatMap((i) => {
            const a = articleBySlug.get(i.slug)
            return a && hasList(a) ? [{ a, where: i.where }] : []
          })
          if (!items.length) return null
          return (
            <section class="section" key={g.title}>
              <h2 class="section__title">
                <span aria-hidden="true">{g.icon}</span> {g.title}
              </h2>
              <ul class="list">{items.map(({ a, where }) => row(a, where))}</ul>
            </section>
          )
        })}
        {other.length > 0 && (
          <section class="section">
            <h2 class="section__title">Другие списки</h2>
            <ul class="list">{other.map((a) => row(a, a.section))}</ul>
          </section>
        )}
      </main>
    </>
  )
}
