import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { ArticleList, Empty } from '../components/ArticleList'
import { Icon } from '../components/Icon'
import { openTerm } from '../components/TermSheet'
import { books, categories, glossary, popularTags } from '../data'
import { bookSearchAvailable, searchBooks, type BookHit } from '../lib/bookSearch'
import { normalize } from '../lib/ru'
import { highlightParts, queryStems, search, snippet } from '../lib/search'
import { replaceHash } from '../lib/nav'
import { to } from '../lib/router'

export function Search({ initialQuery }: { initialQuery: string }) {
  const [query, setQuery] = useState(initialQuery)
  const inputRef = useRef<HTMLInputElement>(null)

  // Ссылки вида #/search?q=тег меняют запрос
  useEffect(() => setQuery(initialQuery), [initialQuery])
  useEffect(() => {
    if (!initialQuery) inputRef.current?.focus()
  }, [])

  const hits = useMemo(() => search(query), [query])
  const stems = useMemo(() => queryStems(query), [query])
  const terms = useMemo(() => matchTerms(query, stems), [query])
  const bookTitles = useMemo(() => matchBooks(stems), [query])
  const bookHits = useBookHits(query)

  function update(q: string) {
    setQuery(q)
    // replaceState — не засоряем историю каждой буквой
    replaceHash(to.search(q))
  }

  const nothing = !hits.length && !terms.length && !bookTitles.length && bookHits.state !== 'loading' && !bookHits.hits.length

  return (
    <>
      <header class="search-header">
        <form
          class="search-box"
          role="search"
          onSubmit={(e) => {
            e.preventDefault()
            inputRef.current?.blur()
          }}
        >
          <Icon name="search" size={20} />
          <input
            ref={inputRef}
            type="search"
            enterKeyHint="search"
            placeholder="Что случилось? Что нужно сделать?"
            value={query}
            onInput={(e) => update(e.currentTarget.value)}
            autoComplete="off"
            autoCorrect="off"
            spellcheck={false}
            aria-label="Поиск по справочнику"
          />
          {query && (
            <button
              type="button"
              class="icon-btn icon-btn--small"
              onClick={() => {
                update('')
                inputRef.current?.focus()
              }}
              aria-label="Очистить"
            >
              <Icon name="close" size={18} />
            </button>
          )}
        </form>
      </header>

      <main class="page">
        {!query.trim() ? (
          <>
            {popularTags.length > 0 && (
              <section class="section">
                <h2 class="section__title">Частые темы</h2>
                <div class="chips">
                  {popularTags.map((t) => (
                    <button key={t} class="chip" onClick={() => update(t)}>
                      {t}
                    </button>
                  ))}
                </div>
              </section>
            )}
            <section class="section">
              <h2 class="section__title">Разделы</h2>
              <div class="chips">
                {categories.map((c) => (
                  <a key={c.id} class="chip" href={to.category(c.id)}>
                    {c.icon} {c.title}
                  </a>
                ))}
              </div>
            </section>
          </>
        ) : (
          <>
            {terms.length > 0 && (
              <section class="section">
                <h2 class="section__title">Термины</h2>
                <div class="chips">
                  {terms.map((t) => (
                    <button key={t.id} class="chip chip--term" onClick={() => openTerm(t.id)}>
                      {t.term}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {hits.length > 0 && (
              <section class="section">
                <h2 class="section__title">Статьи · {hits.length}</h2>
                <ArticleList
                  articles={hits.map((h) => h.article)}
                  showCategory
                  renderSummary={(a) => <Highlight text={snippet(a.text, stems)} stems={stems} />}
                />
              </section>
            )}

            {bookTitles.length > 0 && (
              <section class="section">
                <h2 class="section__title">Книги</h2>
                <ul class="list">
                  {bookTitles.map((b) => (
                    <li key={b.id}>
                      <a class="list-row" href={to.book(b.id)}>
                        <Icon name="book" size={20} />
                        <span class="list-row__body">
                          <span class="list-row__title">{b.title}</span>
                          <span class="list-row__summary">{b.description}</span>
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {(bookHits.state === 'loading' || bookHits.hits.length > 0) && (
              <section class="section">
                <h2 class="section__title">В тексте книг{bookHits.hits.length ? ` · ${bookHits.hits.length}` : ''}</h2>
                {bookHits.state === 'loading' && !bookHits.hits.length ? (
                  <p class="section__hint">Ищу в книгах…</p>
                ) : (
                  <ul class="list">
                    {bookHits.hits.map((h) => (
                      <li key={`${h.book.id}-${h.page}`}>
                        <a class="list-row" href={to.book(h.book.id, h.page)}>
                          <Icon name="book" size={20} />
                          <span class="list-row__body">
                            <span class="list-row__meta">
                              {h.book.title} · стр. {h.page}
                            </span>
                            <span class="list-row__summary">
                              <Highlight text={h.snippet} stems={stems} />
                            </span>
                          </span>
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}

            {nothing && (
              <Empty title="Ничего не найдено">
                Попробуйте другое слово или короче: «ожог» вместо «ожоги второй степени».
              </Empty>
            )}
          </>
        )}
      </main>
    </>
  )
}

function matchTerms(query: string, stems: string[]) {
  const q = normalize(query.trim())
  if (q.length < 3) return []
  return glossary
    .filter((t) => {
      const name = normalize(t.term)
      return name.includes(q) || (stems.length > 0 && stems.every((s) => s.length >= 3 && name.includes(s)))
    })
    .slice(0, 8)
}

function matchBooks(stems: string[]) {
  if (!stems.length) return []
  return books.filter((b) => {
    const hay = normalize(`${b.title} ${b.description} ${b.author}`)
    return stems.every((s) => hay.includes(s))
  })
}

function useBookHits(query: string) {
  const [state, setState] = useState<{ state: 'idle' | 'loading' | 'done'; hits: BookHit[] }>({ state: 'idle', hits: [] })
  useEffect(() => {
    if (!bookSearchAvailable || query.trim().length < 3) {
      setState({ state: 'idle', hits: [] })
      return
    }
    let alive = true
    setState((s) => ({ state: 'loading', hits: s.hits }))
    // ждём паузу в наборе — поиск по книгам тяжелее
    const timer = setTimeout(() => {
      searchBooks(query)
        .then((hits) => alive && setState({ state: 'done', hits }))
        .catch(() => alive && setState({ state: 'done', hits: [] }))
    }, 350)
    return () => {
      alive = false
      clearTimeout(timer)
    }
  }, [query])
  return state
}

function Highlight({ text, stems }: { text: string; stems: string[] }) {
  return <>{highlightParts(text, stems).map((p, i) => (p.hit ? <mark key={i}>{p.text}</mark> : p.text))}</>
}
