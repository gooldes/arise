import { useEffect, useState } from 'preact/hooks'
import { Icon } from './Icon'

interface Heading {
  id: string
  text: string
}

/**
 * Оглавление длинной статьи: плавающая кнопка → шторка со списком разделов.
 * Переход внутри статьи не меняет адрес — «назад» по-прежнему ведёт туда, откуда пришли.
 */
export function Toc({ root, slug }: { root: HTMLElement | null; slug: string }) {
  const [headings, setHeadings] = useState<Heading[]>([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState<string | null>(null)

  useEffect(() => {
    if (!root) return
    const hs = Array.from(root.querySelectorAll<HTMLElement>('h2[id]')).map((h) => ({ id: h.id, text: h.textContent ?? '' }))
    setHeadings(hs)
    setOpen(false)
  }, [root, slug])

  useEffect(() => {
    if (!open || !root) return
    // текущий раздел — последний заголовок выше середины экрана
    let cur: string | null = null
    for (const h of headings) {
      const el = root.querySelector(`#${h.id}`)
      if (el && el.getBoundingClientRect().top < innerHeight / 3) cur = h.id
    }
    setActive(cur)
    const close = () => setOpen(false)
    addEventListener('hashchange', close)
    return () => removeEventListener('hashchange', close)
  }, [open])

  if (headings.length < 4) return null

  return (
    <>
      <button class="toc-fab" onClick={() => setOpen(true)} aria-label="Содержание статьи">
        <Icon name="glossary" size={20} />
      </button>
      {open && (
        <div class="sheet-backdrop" onClick={() => setOpen(false)}>
          <div class="sheet" role="dialog" aria-label="Содержание" onClick={(e) => e.stopPropagation()}>
            <div class="sheet__grip" aria-hidden="true" />
            <div class="sheet__head">
              <h2 class="sheet__title">Содержание</h2>
              <button class="icon-btn icon-btn--small" onClick={() => setOpen(false)} aria-label="Закрыть">
                <Icon name="close" size={20} />
              </button>
            </div>
            <ol class="toc-list">
              {headings.map((h) => (
                <li key={h.id}>
                  <button
                    class={h.id === active ? 'is-active' : ''}
                    onClick={() => {
                      setOpen(false)
                      root?.querySelector(`#${h.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    }}
                  >
                    {h.text}
                  </button>
                </li>
              ))}
              <li>
                <button
                  onClick={() => {
                    setOpen(false)
                    scrollTo({ top: 0, behavior: 'smooth' })
                  }}
                >
                  ↑ В начало статьи
                </button>
              </li>
            </ol>
          </div>
        </div>
      )}
    </>
  )
}
