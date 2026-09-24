import { ArticleList, Empty } from '../components/ArticleList'
import { Header } from '../components/Header'
import { articlesIn, categoryById } from '../data'
import { to } from '../lib/router'
import type { Article } from '../types'
import { NotFound } from './NotFound'

export function Category({ id }: { id: string }) {
  const category = categoryById.get(id)
  if (!category) return <NotFound />
  const list = articlesIn(id)

  const groups: { title?: string; items: Article[] }[] = category.sections
    ? [
        ...category.sections.map((title) => ({ title, items: list.filter((a) => a.section === title) })),
        { title: 'Другое', items: list.filter((a) => !a.section || !category.sections!.includes(a.section)) },
      ].filter((g) => g.items.length)
    : [{ items: list }]

  return (
    <>
      <Header title={category.title} back={to.home()} />
      <main class="page">
        <div class="cat-intro">
          <span class="cat-intro__icon" aria-hidden="true">
            {category.icon}
          </span>
          <p>{category.description}</p>
        </div>

        {groups.length > 1 && (
          <nav class="chips section-nav" aria-label="Подразделы">
            {groups.map((g, i) => (
              <a key={g.title} class="chip" href={`#sec-${i}`} onClick={(e) => { e.preventDefault(); document.getElementById(`sec-${i}`)?.scrollIntoView({ behavior: 'smooth' }) }}>
                {g.title}
              </a>
            ))}
          </nav>
        )}

        {list.length ? (
          groups.map((g, i) => (
            <section key={g.title ?? 'all'} class="section" id={`sec-${i}`}>
              {g.title && <h2 class="section__title">{g.title}</h2>}
              <ArticleList articles={g.items} />
            </section>
          ))
        ) : (
          <Empty title="Раздел пока пуст">Инструкции появятся в следующих обновлениях.</Empty>
        )}
      </main>
    </>
  )
}
