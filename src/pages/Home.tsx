import { ArticleList } from '../components/ArticleList'
import { Icon } from '../components/Icon'
import { articleBySlug, articles, articlesIn, books, categories, glossary, sosArticles } from '../data'
import { isFileMode, isStandalone } from '../lib/offline'
import { to } from '../lib/router'
import { recent } from '../lib/user'

export function Home() {
  const recentArticles = recent.use().flatMap((s) => articleBySlug.get(s) ?? []).slice(0, 3)
  const guides = articlesIn('guides')

  return (
    <>
      <header class="home-header">
        <div>
          <p class="home-header__brand">Arise</p>
          <p class="home-header__sub">
            {articles.length} инструкций · {isFileMode || isStandalone ? 'работает офлайн' : 'офлайн-справочник'}
          </p>
        </div>
        <a class="icon-btn" href={to.settings()} aria-label="Настройки">
          <Icon name="settings" />
        </a>
      </header>

      <main class="page">
        <a class="search-trigger" href={to.search()}>
          <Icon name="search" size={20} />
          <span>Поиск по инструкциям…</span>
        </a>

        <a class="sos-card" href={to.sos()}>
          <span class="sos-card__icon">
            <Icon name="sos" size={30} />
          </span>
          <span class="sos-card__body">
            <span class="sos-card__title">Экстренная помощь</span>
            <span class="sos-card__text">
              {sosArticles.length
                ? sosArticles.slice(0, 4).map((a) => a.title).join(' · ')
                : 'Кровотечение, СЛР, ожоги'}
            </span>
          </span>
          <Icon name="chevron" />
        </a>

        {guides.length > 0 && (
          <section class="section">
            <div class="section__head">
              <h2 class="section__title">Руководства по ситуациям</h2>
              <a class="section__more" href={to.category('guides')}>
                Все {guides.length}
              </a>
            </div>
            <div class="guide-scroller">
              {guides.map((g) => (
                <a key={g.slug} class="guide-card" href={to.article(g.slug)}>
                  <span class="guide-card__section">{g.section}</span>
                  <span class="guide-card__title">{g.title}</span>
                </a>
              ))}
            </div>
          </section>
        )}

        <div class="quick-links">
          <a class="quick-link" href={to.books()}>
            <Icon name="book" />
            <span>
              Книги
              <small>{books.length ? `${books.length} PDF офлайн` : 'скоро'}</small>
            </span>
          </a>
          <a class="quick-link" href={to.medcard()}>
            <Icon name="plus" />
            <span>
              Медкарта
              <small>дозы по весу</small>
            </span>
          </a>
          <a class="quick-link" href={to.glossary()}>
            <Icon name="glossary" />
            <span>
              Словарь
              <small>{glossary.length} терминов</small>
            </span>
          </a>
        </div>

        {recentArticles.length > 0 && (
          <section class="section">
            <h2 class="section__title">Вы недавно читали</h2>
            <ArticleList articles={recentArticles} showCategory />
          </section>
        )}

        <section class="section">
          <h2 class="section__title">Разделы</h2>
          <div class="cat-grid">
            {categories.filter((c) => c.id !== 'guides').map((c) => {
              const count = articlesIn(c.id).length
              return (
                <a key={c.id} class={`cat-card${count ? '' : ' is-empty'}`} href={to.category(c.id)}>
                  <span class="cat-card__icon" aria-hidden="true">
                    {c.icon}
                  </span>
                  <span class="cat-card__title">{c.title}</span>
                  <span class="cat-card__count">{count ? `${count} ${plural(count)}` : 'скоро'}</span>
                </a>
              )
            })}
          </div>
        </section>
      </main>
    </>
  )
}

export function plural(n: number) {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return 'статья'
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 'статьи'
  return 'статей'
}
