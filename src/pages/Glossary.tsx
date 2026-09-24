import { useMemo, useState } from 'preact/hooks'
import { Empty } from '../components/ArticleList'
import { Header } from '../components/Header'
import { Icon } from '../components/Icon'
import { articleBySlug, glossary } from '../data'
import { normalize } from '../lib/ru'
import { to } from '../lib/router'

export function Glossary() {
  const [filter, setFilter] = useState('')
  const q = normalize(filter.trim())

  const list = useMemo(
    () => (q ? glossary.filter((t) => normalize(t.term).includes(q) || normalize(t.definition).includes(q)) : glossary),
    [q],
  )
  const groups = useMemo(() => {
    const map = new Map<string, typeof glossary>()
    for (const t of list) {
      const letter = t.term[0].toUpperCase()
      map.set(letter, [...(map.get(letter) ?? []), t])
    }
    return [...map.entries()]
  }, [list])

  return (
    <>
      <Header title="Словарь терминов" back={to.home()} />
      <main class="page">
        <div class="search-box search-box--inline">
          <Icon name="search" size={20} />
          <input
            type="search"
            placeholder={`Найти среди ${glossary.length} терминов`}
            value={filter}
            onInput={(e) => setFilter(e.currentTarget.value)}
            aria-label="Фильтр терминов"
          />
        </div>

        {!q && groups.length > 1 && (
          <nav class="letters" aria-label="Буквы">
            {groups.map(([letter]) => (
              <button key={letter} onClick={() => document.getElementById(`l-${letter}`)?.scrollIntoView()}>
                {letter}
              </button>
            ))}
          </nav>
        )}

        {groups.length ? (
          groups.map(([letter, terms]) => (
            <section key={letter} class="section" id={`l-${letter}`}>
              <h2 class="section__title">{letter}</h2>
              <dl class="glossary">
                {terms.map((t) => {
                  const article = t.article ? articleBySlug.get(t.article) : undefined
                  return (
                    <div key={t.id} class="glossary__item">
                      <dt>{t.term}</dt>
                      <dd>
                        {t.definition}
                        {article && (
                          <a class="glossary__link" href={to.article(article.slug)}>
                            → {article.title}
                          </a>
                        )}
                      </dd>
                    </div>
                  )
                })}
              </dl>
            </section>
          ))
        ) : (
          <Empty title="Термин не найден" />
        )}
      </main>
    </>
  )
}
