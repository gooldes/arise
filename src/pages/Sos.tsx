import { useMemo, useState } from 'preact/hooks'
import { Empty } from '../components/ArticleList'
import { Header } from '../components/Header'
import { Icon } from '../components/Icon'
import { articleBySlug, sosArticles } from '../data'
import { normalize } from '../lib/ru'
import { to } from '../lib/router'
import type { Article } from '../types'

const PHONES: [string, string][] = [
  ['112', 'Единый номер экстренных служб'],
  ['101', 'Пожарные и спасатели (МЧС)'],
  ['102', 'Милиция'],
  ['103', 'Скорая помощь'],
  ['104', 'Аварийная газовая служба'],
  ['8-801-100-16-11', 'Детская телефонная линия (бесплатно, круглосуточно)'],
]

// Группы «от симптома»: человек в панике ищет не раздел справочника, а «что случилось»
const GROUPS: [string, string[]][] = [
  ['С чего начать', ['primary-assessment', 'recovery-position', 'danger-signs']],
  ['Не дышит, без сознания, сердце', ['cpr-adult', 'cpr-child', 'choking', 'drowning', 'heart-attack', 'stroke', 'asthma-attack', 'seizures', 'hypoglycemia', 'shock']],
  ['Кровь и травмы', ['severe-bleeding', 'internal-bleeding', 'amputation', 'chest-injury', 'abdominal-injury', 'head-injury', 'spinal-injury', 'fractures', 'crush-syndrome', 'eye-injury']],
  ['Ожоги, холод, жара, ток', ['burns', 'hypothermia', 'frostbite', 'heat-stroke', 'electric-shock', 'fire-extinguishing']],
  ['Отравления и укусы', ['poisoning', 'methanol-antifreeze', 'carbon-monoxide', 'anaphylaxis', 'snake-bite', 'animal-bites']],
  ['Беременность, роды, дети', ['pregnancy-bleeding', 'childbirth']],
  ['Психика', ['mental-crisis']],
]
const slugGroup = new Map(GROUPS.flatMap(([g, slugs]) => slugs.map((s) => [s, g] as const)))
const groupOrder = new Map(GROUPS.map(([g], i) => [g, i]))

function groupOf(a: Article): string {
  return slugGroup.get(a.slug) ?? (a.category === 'first-aid' || a.category === 'medicine' ? 'Другое' : 'ЧС и опасности')
}

export function Sos() {
  const firstHours = articleBySlug.get('first-hours')
  const [q, setQ] = useState('')

  const groups = useMemo(() => {
    const needle = normalize(q.trim())
    const list = needle
      ? sosArticles.filter((a) => normalize(`${a.title} ${a.summary} ${a.tags.join(' ')}`).includes(needle))
      : sosArticles
    const map = new Map<string, Article[]>()
    for (const a of list) map.set(groupOf(a), [...(map.get(groupOf(a)) ?? []), a])
    const rank = (g: string) => groupOrder.get(g) ?? (g === 'ЧС и опасности' ? 90 : 99)
    // внутри группы — в порядке списка GROUPS (самое срочное выше)
    const pos = (a: Article) => GROUPS.flatMap(([, s]) => s).indexOf(a.slug)
    return [...map.entries()]
      .sort((a, b) => rank(a[0]) - rank(b[0]))
      .map(([g, items]) => [g, items.sort((x, y) => (pos(x) < 0 ? 999 : pos(x)) - (pos(y) < 0 ? 999 : pos(y)))] as [string, Article[]])
  }, [q])

  return (
    <>
      <Header title="Экстренная помощь" tone="danger" />
      <main class="page">
        <div class="sos-steps">
          <p class="sos-steps__title">Сначала</p>
          <ol>
            <li>Убедитесь, что опасность не угрожает вам самим.</li>
            <li>Если есть связь — вызовите помощь (номера ниже).</li>
            <li>Найдите инструкцию ниже — вверху каждой статьи шаги «Сделайте сейчас».</li>
          </ol>
        </div>

        <section class="phones" aria-label="Важные номера">
          <p class="phones__title">Важные номера (Беларусь)</p>
          <ul>
            {PHONES.map(([num, label]) => (
              <li key={num}>
                <a href={`tel:${num.replace(/[^0-9+]/g, '')}`}>{num}</a>
                <span>{label}</span>
              </li>
            ))}
          </ul>
          <p class="phones__note">С мобильного без денег на счету обычно дозванивается 112.</p>
        </section>

        {firstHours && (
          <a class="guide-cta" href={to.article(firstHours.slug)}>
            <span>
              <small>ЧС, а не травма? Не понимаете, что делать?</small>
              {firstHours.title}
            </span>
            <Icon name="chevron" />
          </a>
        )}

        <div class="search-box search-box--inline sos-filter">
          <Icon name="search" size={20} />
          <input
            type="search"
            placeholder="Что случилось: ожог, не дышит, укус…"
            value={q}
            onInput={(e) => setQ(e.currentTarget.value)}
            aria-label="Найти экстренную инструкцию"
          />
        </div>

        {groups.length ? (
          groups.map(([title, items]) => (
            <section key={title} class="section">
              <h2 class="section__title">{title}</h2>
              <div class="sos-grid">
                {items.map((a) => (
                  <a key={a.slug} class={`sos-btn sos-btn--${a.urgency}`} href={to.article(a.slug)}>
                    <span class="sos-btn__title">{a.title}</span>
                    {a.summary && <span class="sos-btn__text">{a.summary}</span>}
                  </a>
                ))}
              </div>
            </section>
          ))
        ) : q ? (
          <Empty title="Среди экстренных не нашлось">
            <a href={to.search(q)}>Искать «{q}» по всему справочнику</a>
          </Empty>
        ) : (
          <Empty title="Экстренные инструкции ещё не добавлены" />
        )}
      </main>
    </>
  )
}
