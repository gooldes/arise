import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks'
import { ArticleList } from '../components/ArticleList'
import { FamilyBar, applyFamily } from '../components/FamilyBar'
import { Header } from '../components/Header'
import { Icon } from '../components/Icon'
import { lightbox } from '../components/Lightbox'
import { openTerm } from '../components/TermSheet'
import { Toc } from '../components/Toc'
import { articleBySlug, articlesIn, categoryById } from '../data'
import { hydrateCalcs } from '../lib/calc'
import { to } from '../lib/router'
import { navType, replaceHash } from '../lib/nav'
import { checklists, family, favorites, markRecent, readPositions, toggleFavorite } from '../lib/user'
import { NotFound } from './NotFound'

const URGENCY_LABEL = { critical: 'Экстренно', important: 'Важно', normal: '' }

export function ArticlePage({ slug, list = false }: { slug: string; list?: boolean }) {
  const article = articleBySlug.get(slug)
  // «Только список»: из статьи остаются заголовки, чек-листы и таблицы — без пояснений
  const canList = !!article && (article.checklistSize > 0 || article.hasSupplies)
  const [listMode, setListMode] = useState(list && canList)
  const switchMode = (next: boolean) => {
    setListMode(next)
    replaceHash(next ? to.list(slug) : to.article(slug))
  }
  const isFav = favorites.use().includes(slug)
  const fam = family.use()
  const checked = checklists.use()[slug] ?? []
  const proseRef = useRef<HTMLDivElement>(null)
  const [proseEl, setProseEl] = useState<HTMLElement | null>(null)
  useEffect(() => setProseEl(proseRef.current), [slug])

  // «Продолжить с места»: при новом открытии статьи, где раньше дочитали до середины
  const [resumeY, setResumeY] = useState<number | null>(() => {
    const y = readPositions.get()[slug]
    return navType() === 'push' && !list && y && y > 600 ? y : null
  })
  useEffect(() => {
    let lastY = scrollY
    let timer = 0
    const save = () => {
      const nearEnd = lastY + innerHeight > document.documentElement.scrollHeight - 400
      const all = { ...readPositions.get() }
      if (nearEnd || lastY < 300) delete all[slug]
      else all[slug] = Math.round(lastY)
      // храним последние 60 статей
      const keys = Object.keys(all)
      if (keys.length > 60) delete all[keys[0]]
      readPositions.set(all)
    }
    const onScroll = () => {
      lastY = scrollY
      if (lastY > 300) setResumeY(null)
      clearTimeout(timer)
      timer = window.setTimeout(save, 800)
    }
    addEventListener('scroll', onScroll, { passive: true })
    return () => {
      removeEventListener('scroll', onScroll)
      clearTimeout(timer)
      save() // уходим со статьи — запоминаем, где остановились
    }
  }, [slug])

  // Таблицы запасов: колонка «Семья» пересчитывается под выбранный состав (до отрисовки — без мелькания)
  useLayoutEffect(() => {
    if (proseRef.current) applyFamily(proseRef.current, fam.adults, fam.children)
  }, [slug, fam.adults, fam.children])

  // Галочки чек-листов: восстановить сохранённое состояние
  useLayoutEffect(() => {
    proseRef.current?.querySelectorAll<HTMLInputElement>('input.check').forEach((box) => {
      box.checked = checked.includes(Number(box.dataset.i))
      box.closest('li, tr')?.classList.toggle('is-checked', box.checked)
    })
  }, [slug, checked])

  // Калькуляторы ```calc — пересчёт при вводе
  useEffect(() => (proseRef.current ? hydrateCalcs(proseRef.current) : undefined), [slug])

  useLayoutEffect(() => {
    const root = proseRef.current
    if (root) filterForList(root, listMode)
  }, [slug, listMode])

  useEffect(() => {
    if (article) markRecent(article.slug)
  }, [slug])

  if (!article) return <NotFound />
  const category = categoryById.get(article.category)
  const related = article.related.flatMap((s) => articleBySlug.get(s) ?? [])
  const shown = new Set([slug, ...article.related])
  const more = articlesIn(article.category)
    .filter((a) => !shown.has(a.slug) && (!article.section || a.section === article.section))
    .slice(0, 5)

  // Термины в тексте — кнопки с data-term (размечаются при сборке)
  function onProseClick(e: MouseEvent) {
    const target = e.target as HTMLElement
    if (target instanceof HTMLInputElement && target.classList.contains('check')) {
      const i = Number(target.dataset.i)
      const next = target.checked ? [...new Set([...checked, i])] : checked.filter((x) => x !== i)
      checklists.set({ ...checklists.get(), [slug]: next })
      return
    }
    if (target instanceof HTMLImageElement) {
      lightbox.set({ src: target.src, caption: target.closest('figure')?.querySelector('figcaption')?.textContent ?? undefined })
      return
    }
    const el = target.closest<HTMLElement>('.term')
    if (el?.dataset.term) openTerm(el.dataset.term, slug)
  }

  return (
    <>
      <Header
        title={category?.title ?? ''}
        back={listMode ? to.lists() : to.category(article.category)}
        actions={
          <button
            class={`icon-btn${isFav ? ' is-fav' : ''}`}
            onClick={() => toggleFavorite(slug)}
            aria-label={isFav ? 'Убрать из избранного' : 'В избранное'}
            aria-pressed={isFav}
          >
            <Icon name="star" filled={isFav} />
          </button>
        }
      />
      <main class="page">
        <article class="article">
          <div class="article__badges">
            {article.urgency !== 'normal' && (
              <span class={`badge badge--${article.urgency}`}>{URGENCY_LABEL[article.urgency]}</span>
            )}
            {article.section && <span class="article__section">{article.section}</span>}
            {article.draft && <span class="badge badge--muted">черновик</span>}
          </div>
          {resumeY !== null && !listMode && (
            <div class="resume-chip">
              <button
                class="resume-chip__go"
                onClick={() => {
                  scrollTo({ top: resumeY, behavior: 'smooth' })
                  setResumeY(null)
                }}
              >
                ↓ Продолжить с места, где остановились
              </button>
              <button class="icon-btn icon-btn--small" onClick={() => setResumeY(null)} aria-label="Скрыть">
                <Icon name="close" size={16} />
              </button>
            </div>
          )}
          <h1 class="article__title">{article.title}</h1>
          {canList && (
            <div class="segmented segmented--2" role="group" aria-label="Вид">
              <button class={listMode ? '' : 'is-active'} aria-pressed={!listMode} onClick={() => switchMode(false)}>
                Статья
              </button>
              <button class={listMode ? 'is-active' : ''} aria-pressed={listMode} onClick={() => switchMode(true)}>
                Только список
              </button>
            </div>
          )}
          {!listMode && article.quick && article.quick.length > 0 && (
            <section class="quick-box" aria-label="Что делать сейчас">
              <p class="quick-box__title">⚡ Сделайте сейчас</p>
              <ol class="quick-box__list">
                {article.quick.map((q, i) => (
                  <li key={i} dangerouslySetInnerHTML={{ __html: q }} />
                ))}
              </ol>
              <p class="quick-box__more">Подробности и объяснения — ниже ↓</p>
            </section>
          )}
          {article.latin && <p class="article__latin">{article.latin}</p>}
          {!listMode && article.image && (
            <figure class="article__hero">
              <img
                src={article.image}
                alt={article.title}
                onClick={() => lightbox.set({ src: article.image!, caption: article.imageCredit })}
              />
              {article.imageCredit && <figcaption>{article.imageCredit}</figcaption>}
            </figure>
          )}
          {article.summary && <p class="article__lead">{article.summary}</p>}
          {article.hasSupplies && <FamilyBar />}
          {article.checklistSize > 0 && (
            <div class="checklist-progress">
              <span>
                Отмечено: <b>{checked.length}</b> из {article.checklistSize}
              </span>
              <progress max={article.checklistSize} value={checked.length} />
              {checked.length > 0 && (
                <button
                  class="btn btn--ghost btn--small"
                  onClick={() => {
                    if (confirm('Снять все отметки в этом руководстве?')) checklists.set({ ...checklists.get(), [slug]: [] })
                  }}
                >
                  Сбросить
                </button>
              )}
            </div>
          )}
          <div class={`prose${listMode ? ' prose--list' : ''}`} ref={proseRef} onClick={onProseClick} dangerouslySetInnerHTML={{ __html: article.html }} />

          {listMode && (
            <button class="btn btn--ghost" onClick={() => { switchMode(false); scrollTo(0, 0) }}>
              Показать всю статью с пояснениями
            </button>
          )}
          {!listMode && article.tags.length > 0 && (
            <div class="chips">
              {article.tags.map((t) => (
                <a key={t} class="chip" href={to.search(t)}>
                  #{t}
                </a>
              ))}
            </div>
          )}
          {article.updated && <p class="article__updated">Обновлено: {article.updated}</p>}
        </article>

        {!listMode && <Toc root={proseEl} slug={slug} />}

        {!listMode && related.length > 0 && (
          <section class="section">
            <h2 class="section__title">Связанные статьи</h2>
            <ArticleList articles={related} showCategory />
          </section>
        )}

        {!listMode && more.length > 0 && (
          <section class="section">
            <h2 class="section__title">Ещё в разделе «{article.section ?? category?.title}»</h2>
            <ArticleList articles={more} />
          </section>
        )}
      </main>
    </>
  )
}

/** Скрыть всё, кроме заголовков, чек-листов и таблиц; заголовки без списков под ними — тоже */
function filterForList(root: HTMLElement, on: boolean) {
  const blocks = Array.from(root.children) as HTMLElement[]
  const isHeading = (el: Element) => /^H[2-4]$/.test(el.tagName)
  const level = (el: Element) => Number(el.tagName[1])
  for (const el of blocks) {
    el.hidden = on && !isHeading(el) && !(el.querySelector('input.check') || el.matches('.table-wrap, .supplies'))
  }
  if (!on) return
  blocks.forEach((el, i) => {
    if (!isHeading(el)) return
    let hasContent = false
    for (let j = i + 1; j < blocks.length; j++) {
      const next = blocks[j]
      if (isHeading(next) && level(next) <= level(el)) break
      if (!isHeading(next) && !next.hidden) {
        hasContent = true
        break
      }
    }
    el.hidden = !hasContent
  })
}
