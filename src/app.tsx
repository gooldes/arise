import { useLayoutEffect } from 'preact/hooks'
import { BackPill } from './components/BackPill'
import { Lightbox } from './components/Lightbox'
import { TabBar } from './components/TabBar'
import { TermSheet } from './components/TermSheet'
import { UpdateBanner } from './components/UpdateBanner'
import { navType, restoreScroll, savedScroll } from './lib/nav'
import { parseHash, useHash } from './lib/router'
import { ArticlePage } from './pages/Article'
import { BookViewer } from './pages/BookViewer'
import { Books } from './pages/Books'
import { Category } from './pages/Category'
import { Favorites } from './pages/Favorites'
import { Glossary } from './pages/Glossary'
import { Medcard } from './pages/Medcard'
import { Home } from './pages/Home'
import { Lists } from './pages/Lists'
import { NotFound } from './pages/NotFound'
import { Search } from './pages/Search'
import { Settings } from './pages/Settings'
import { Sos } from './pages/Sos'


export function App() {
  const hash = useHash()
  const route = parseHash(hash)
  const key = hash.split('?')[0]

  // «Назад» — на то же место, где читали; переход по ссылке — в начало экрана
  useLayoutEffect(() => {
    const y = savedScroll()
    if (navType() === 'pop' && y) restoreScroll(y)
    else if (route.name !== 'book') scrollTo(0, 0)
  }, [key])

  return (
    <div class="app">
      {route.name === 'home' && <Home />}
      {route.name === 'category' && <Category id={route.id} />}
      {route.name === 'article' && <ArticlePage slug={route.slug} list={route.list} key={route.slug} />}
      {route.name === 'lists' && <Lists />}
      {route.name === 'search' && <Search initialQuery={route.q} />}
      {route.name === 'sos' && <Sos />}
      {route.name === 'favorites' && <Favorites />}
      {route.name === 'settings' && <Settings />}
      {route.name === 'glossary' && <Glossary />}
      {route.name === 'medcard' && <Medcard />}
      {route.name === 'books' && <Books />}
      {route.name === 'book' && <BookViewer id={route.id} page={route.page} key={route.id + (route.page ?? '')} />}
      {route.name === 'notfound' && <NotFound />}
      <BackPill hash={hash} />
      <TermSheet />
      <Lightbox />
      <UpdateBanner />
      <TabBar route={route} />
    </div>
  )
}
