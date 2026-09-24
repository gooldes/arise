import type { ComponentChildren } from 'preact'
import { goBack } from '../lib/nav'
import { Icon } from './Icon'

interface Props {
  title: string
  back?: string
  actions?: ComponentChildren
  tone?: 'default' | 'danger'
}

export function Header({ title, back, actions, tone = 'default' }: Props) {
  return (
    <header class={`app-header${tone === 'danger' ? ' app-header--danger' : ''}`}>
      {back ? (
        <a
          class="icon-btn"
          href={back}
          aria-label="Назад"
          onClick={(e) => {
            e.preventDefault()
            goBack(back)
          }}
        >
          <Icon name="back" />
        </a>
      ) : (
        <span class="app-header__spacer" />
      )}
      <h1 class="app-header__title">{title}</h1>
      <div class="app-header__actions">{actions}</div>
    </header>
  )
}
