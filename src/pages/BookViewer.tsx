import { useEffect, useRef, useState } from 'preact/hooks'
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist'
import { Empty } from '../components/ArticleList'
import { Header } from '../components/Header'
import { Icon } from '../components/Icon'
import { bookById } from '../data'
import { isFileMode } from '../lib/offline'
import { openPdf } from '../lib/pdf'
import { to } from '../lib/router'
import { createStore } from '../lib/store'
import { NotFound } from './NotFound'

const ZOOMS = [1, 1.5, 2, 3]
const lastPages = createStore<Record<string, number>>({}, 'bookPages')

interface Rendered {
  cancelled: boolean
  task?: RenderTask
}

export function BookViewer({ id, page }: { id: string; page?: number }) {
  const book = bookById.get(id)
  const pagesRef = useRef<HTMLDivElement>(null)
  const docRef = useRef<PDFDocumentProxy | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [numPages, setNumPages] = useState(0)
  const [ratio, setRatio] = useState(1.414)
  const [zoomIdx, setZoomIdx] = useState(0)
  const [current, setCurrent] = useState(page ?? lastPages.get()[id] ?? 1)
  const currentRef = useRef(current)
  currentRef.current = current

  // Загрузка документа
  useEffect(() => {
    if (!book || isFileMode) return
    let cancelled = false
    let task: Awaited<ReturnType<typeof openPdf>> | undefined
    setStatus('loading')
    openPdf(book.file)
      .then(async (t) => {
        task = t
        if (cancelled) return t.destroy()
        const doc = await t.promise
        if (cancelled) return
        docRef.current = doc
        const first = await doc.getPage(1)
        const vp = first.getViewport({ scale: 1 })
        setRatio(vp.height / vp.width)
        setNumPages(doc.numPages)
        setStatus('ready')
      })
      .catch((e) => {
        console.error(e)
        if (!cancelled) setStatus('error')
      })
    return () => {
      cancelled = true
      task?.destroy()
      docRef.current = null
    }
  }, [id])

  // Рендер только видимых страниц (±1.5 экрана) — иначе телефон упрётся в память
  useEffect(() => {
    const doc = docRef.current
    const container = pagesRef.current
    if (status !== 'ready' || !doc || !container) return
    const rendered = new Map<number, Rendered>()
    const els = Array.from(container.querySelectorAll<HTMLElement>('.pdf-page'))

    async function render(el: HTMLElement, n: number) {
      if (rendered.has(n)) return
      const entry: Rendered = { cancelled: false }
      rendered.set(n, entry)
      try {
        const pdfPage = await doc!.getPage(n)
        if (entry.cancelled) return
        const base = pdfPage.getViewport({ scale: 1 })
        el.style.aspectRatio = `${base.width} / ${base.height}`
        const dpr = Math.min(devicePixelRatio || 1, 2)
        const viewport = pdfPage.getViewport({ scale: (el.clientWidth / base.width) * dpr })
        const canvas = document.createElement('canvas')
        canvas.width = Math.floor(viewport.width)
        canvas.height = Math.floor(viewport.height)
        entry.task = pdfPage.render({ canvas, canvasContext: canvas.getContext('2d')!, viewport })
        await entry.task.promise
        if (!entry.cancelled) el.replaceChildren(canvas)
      } catch {
        rendered.delete(n)
      }
    }

    function release(el: HTMLElement, n: number) {
      const entry = rendered.get(n)
      if (!entry) return
      entry.cancelled = true
      entry.task?.cancel()
      rendered.delete(n)
      const canvas = el.querySelector('canvas')
      if (canvas) canvas.width = canvas.height = 0
      el.replaceChildren(pageLabel(n))
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const el = e.target as HTMLElement
          const n = Number(el.dataset.page)
          if (e.isIntersecting) render(el, n)
          else release(el, n)
        }
      },
      { rootMargin: '150% 0px' },
    )
    els.forEach((el) => io.observe(el))

    // текущая страница — по положению прокрутки
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const mid = innerHeight / 3
        let n = 1
        for (const el of els) {
          if (el.getBoundingClientRect().top > mid) break
          n = Number(el.dataset.page)
        }
        if (n !== currentRef.current) {
          setCurrent(n)
          lastPages.set({ ...lastPages.get(), [id]: n })
        }
      })
    }
    addEventListener('scroll', onScroll, { passive: true })

    return () => {
      io.disconnect()
      removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
      rendered.forEach((entry) => {
        entry.cancelled = true
        entry.task?.cancel()
      })
    }
  }, [status, zoomIdx, numPages])

  // Переход на нужную страницу после загрузки и смены масштаба
  useEffect(() => {
    if (status === 'ready') goTo(currentRef.current, 'auto')
  }, [status, zoomIdx])

  function goTo(n: number, behavior: ScrollBehavior = 'smooth') {
    const target = Math.max(1, Math.min(numPages || 1, n))
    const el = pagesRef.current?.querySelector<HTMLElement>(`[data-page="${target}"]`)
    if (!el) return
    const top = el.getBoundingClientRect().top + scrollY - 64
    scrollTo({ top, behavior })
    setCurrent(target)
  }

  if (!book) return <NotFound />

  if (isFileMode)
    return (
      <>
        <Header title={book.title} back={to.books()} />
        <main class="page">
          <Empty title="Откройте PDF напрямую">
            <a href={`books/${book.file}`} target="_blank" rel="noopener">
              Открыть «{book.title}»
            </a>
          </Empty>
        </main>
      </>
    )

  return (
    <>
      <Header
        title={book.title}
        back={to.books()}
        actions={
          <div class="zoom-controls">
            <button
              class="icon-btn icon-btn--small"
              onClick={() => setZoomIdx((i) => Math.max(0, i - 1))}
              disabled={zoomIdx === 0}
              aria-label="Уменьшить"
            >
              <Icon name="minus" size={20} />
            </button>
            <button
              class="icon-btn icon-btn--small"
              onClick={() => setZoomIdx((i) => Math.min(ZOOMS.length - 1, i + 1))}
              disabled={zoomIdx === ZOOMS.length - 1}
              aria-label="Увеличить"
            >
              <Icon name="plus" size={20} />
            </button>
          </div>
        }
      />
      <main class="pdf-viewer">
        {status === 'loading' && <p class="pdf-status">Открываю книгу…</p>}
        {status === 'error' && (
          <Empty title="Не удалось открыть книгу">
            Файл ещё не скачан для офлайна или повреждён.{' '}
            <a href={`books/${book.file}`} target="_blank" rel="noopener">
              Открыть PDF напрямую
            </a>
          </Empty>
        )}
        {status === 'ready' && (
          <div class="pdf-scroll">
            <div class="pdf-pages" ref={pagesRef} style={{ width: `${ZOOMS[zoomIdx] * 100}%` }}>
              {Array.from({ length: numPages }, (_, i) => (
                <div
                  key={`${zoomIdx}-${i}`}
                  class="pdf-page"
                  data-page={i + 1}
                  style={{ aspectRatio: `1 / ${ratio}` }}
                  ref={(el) => {
                    if (el && !el.firstChild) el.append(pageLabel(i + 1))
                  }}
                />
              ))}
            </div>
          </div>
        )}
        {status === 'ready' && (
          <button
            class="pdf-pager"
            onClick={() => {
              const v = prompt(`Перейти на страницу (1–${numPages})`, String(current))
              if (v && Number(v) > 0) goTo(Number(v))
            }}
          >
            {current} / {numPages}
          </button>
        )}
      </main>
    </>
  )
}

function pageLabel(n: number) {
  const span = document.createElement('span')
  span.className = 'pdf-page__label'
  span.textContent = String(n)
  return span
}
