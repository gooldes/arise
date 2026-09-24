import { ArticleList, Empty } from '../components/ArticleList'
import { Header } from '../components/Header'
import { articleBySlug } from '../data'
import { favorites } from '../lib/user'

export function Favorites() {
  const list = favorites.use().flatMap((s) => articleBySlug.get(s) ?? [])
  return (
    <>
      <Header title="Избранное" />
      <main class="page">
        {list.length ? (
          <ArticleList articles={list} showCategory />
        ) : (
          <Empty title="Здесь пока пусто">Нажмите ☆ в статье, чтобы сохранить её сюда для быстрого доступа.</Empty>
        )}
      </main>
    </>
  )
}
