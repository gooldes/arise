import type { Route } from '../lib/router'
import { to } from '../lib/router'
import { Icon, type IconName } from './Icon'

const TABS: { href: string; label: string; icon: IconName; match: Route['name'][]; sos?: boolean }[] = [
  { href: to.home(), label: 'Главная', icon: 'home', match: ['home', 'category', 'article', 'glossary', 'books', 'book', 'medcard', 'settings'] },
  { href: to.search(), label: 'Поиск', icon: 'search', match: ['search'] },
  { href: to.sos(), label: 'SOS', icon: 'sos', match: ['sos'], sos: true },
  { href: to.lists(), label: 'Списки', icon: 'list', match: ['lists'] },
  { href: to.favorites(), label: 'Избранное', icon: 'star', match: ['favorites'] },
]

export function TabBar({ route }: { route: Route }) {
  return (
    <nav class="tabbar" aria-label="Основная навигация">
      {TABS.map((t) => {
        const isList = route.name === 'article' && route.list
        const active = isList ? t.href === to.lists() : t.match.includes(route.name)
        return (
          <a
            key={t.href}
            href={t.href}
            class={`tabbar__item${active ? ' is-active' : ''}${t.sos ? ' tabbar__item--sos' : ''}`}
            aria-current={active ? 'page' : undefined}
          >
            <Icon name={t.icon} size={t.sos ? 26 : 22} />
            <span>{t.label}</span>
          </a>
        )
      })}
    </nav>
  )
}
