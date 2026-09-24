import { Empty } from '../components/ArticleList'
import { Header } from '../components/Header'
import { Icon } from '../components/Icon'
import { books, categoryById } from '../data'
import { isFileMode } from '../lib/offline'
import { to } from '../lib/router'

export function Books() {
  const totalMb = books.reduce((n, b) => n + b.sizeMb, 0)
  return (
    <>
      <Header title="Книги" back={to.home()} />
      <main class="page">
        {books.length ? (
          <>
            <p class="section__hint">
              {books.length} книг · {totalMb.toFixed(0)} МБ · доступны без интернета. Поиск на вкладке «Поиск» ищет и
              по тексту книг.
            </p>
            <div class="book-list">
              {books.map((b) => (
                <article key={b.id} class="book-card">
                  <div class="book-card__cover" aria-hidden="true">
                    <Icon name="book" size={28} />
                  </div>
                  <div class="book-card__body">
                    <h2 class="book-card__title">{b.title}</h2>
                    <p class="book-card__meta">
                      {b.author}
                      {b.year ? `, ${b.year}` : ''}
                    </p>
                    <p class="book-card__text">{b.description}</p>
                    <p class="book-card__meta">
                      {categoryById.get(b.category)?.title ?? 'Общее'} · {b.pages ? `${b.pages} стр. · ` : ''}
                      {b.sizeMb} МБ · {b.license}
                    </p>
                    <div class="book-card__actions">
                      {isFileMode ? (
                        <a class="btn btn--small" href={`books/${b.file}`} target="_blank" rel="noopener">
                          Открыть PDF
                        </a>
                      ) : (
                        <a class="btn btn--small" href={to.book(b.id)}>
                          Читать
                        </a>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </>
        ) : (
          <Empty title="Книг пока нет">Добавьте PDF в content/books и опишите их в books.json.</Empty>
        )}
      </main>
    </>
  )
}
