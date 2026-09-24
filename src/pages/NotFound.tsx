import { Empty } from '../components/ArticleList'
import { Header } from '../components/Header'
import { to } from '../lib/router'

export function NotFound() {
  return (
    <>
      <Header title="Не найдено" back={to.home()} />
      <main class="page">
        <Empty title="Такой страницы нет">
          <a href={to.home()}>На главную</a>
        </Empty>
      </main>
    </>
  )
}
