import { useEffect } from 'preact/hooks'
import { createStore } from '../lib/store'
import { Icon } from './Icon'

/** Картинка на весь экран — для опознания растений, грибов, следов */
export const lightbox = createStore<{ src: string; caption?: string } | null>(null)

export function Lightbox() {
  const img = lightbox.use()
  useEffect(() => {
    if (!img) return
    const close = () => lightbox.set(null)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    addEventListener('hashchange', close)
    addEventListener('keydown', onKey)
    return () => {
      removeEventListener('hashchange', close)
      removeEventListener('keydown', onKey)
    }
  }, [img])
  if (!img) return null
  return (
    <div class="lightbox" onClick={() => lightbox.set(null)} role="dialog" aria-modal="true">
      <button class="icon-btn lightbox__close" aria-label="Закрыть">
        <Icon name="close" />
      </button>
      <img src={img.src} alt="" />
      {img.caption && <p class="lightbox__caption">{img.caption}</p>}
    </div>
  )
}
