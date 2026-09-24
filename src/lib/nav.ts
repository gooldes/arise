// История переходов внутри приложения: куда вернётся «назад» и на какое место прокрутки.
//
// Каждой записи истории браузера присваивается номер (history.state.i). По номеру храним
// адрес экрана и позицию прокрутки — поэтому одна и та же статья, открытая дважды,
// восстанавливается на своём месте, а «назад» всегда ведёт туда, откуда пришли.

const STORE_KEY = 'arise:nav'

interface NavState {
  hashes: string[]
  scroll: Record<number, number>
}

function loadState(): NavState {
  try {
    const raw = sessionStorage.getItem(STORE_KEY)
    if (raw) return JSON.parse(raw) as NavState
  } catch {
    /* нет sessionStorage — работаем в памяти */
  }
  return { hashes: [], scroll: {} }
}

const state = loadState()
let saveTimer = 0
function persist() {
  clearTimeout(saveTimer)
  saveTimer = window.setTimeout(() => {
    try {
      sessionStorage.setItem(STORE_KEY, JSON.stringify(state))
    } catch {
      /* ignore */
    }
  }, 200)
}

const indexOf = (s: unknown) => (s && typeof (s as { i?: unknown }).i === 'number' ? (s as { i: number }).i : null)

let current = 0
/** Как попали на текущий экран: 'push' — по ссылке, 'pop' — кнопкой «назад/вперёд» */
let lastType: 'push' | 'pop' = 'push'

export function initNav() {
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
  const i = indexOf(history.state)
  if (i === null) {
    history.replaceState({ i: 0 }, '')
    current = 0
    state.hashes = [location.hash]
    state.scroll = {}
  } else {
    current = i
    state.hashes[i] = location.hash
    lastType = 'pop' // перезагрузка страницы — вернуть на место
  }
  persist()

  // В фазе захвата — раньше, чем экран узнает о смене адреса
  addEventListener(
    'hashchange',
    () => {
      const i = indexOf(history.state)
      if (i === null) {
        // Переход по ссылке: новая запись поверх текущей, «вперёд» отбрасывается
        current = current + 1
        history.replaceState({ i: current }, '')
        state.hashes = state.hashes.slice(0, current)
        state.hashes[current] = location.hash
        delete state.scroll[current]
        lastType = 'push'
      } else {
        current = i
        state.hashes[i] = location.hash
        lastType = 'pop'
      }
      persist()
    },
    true,
  )

  let raf = 0
  addEventListener(
    'scroll',
    () => {
      // адрес уже сменился, а номер ещё не присвоен — не портим позицию прошлого экрана
      if (indexOf(history.state) !== current) return
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        state.scroll[current] = scrollY
        persist()
      })
    },
    { passive: true },
  )
}

export const navType = () => lastType
export const canGoBack = () => current > 0
export const previousHash = (): string | undefined => (current > 0 ? state.hashes[current - 1] : undefined)
export const savedScroll = (): number | undefined => state.scroll[current]

/** Замена адреса без новой записи (например, поисковый запрос) — сохраняет номер записи */
export function replaceHash(hash: string) {
  history.replaceState({ i: current }, '', hash)
  state.hashes[current] = hash
  persist()
}

/** «Назад»: по истории, если пришли из приложения, иначе — на логического родителя */
export function goBack(fallback: string) {
  if (canGoBack()) history.back()
  else location.hash = fallback
}

/**
 * Восстановить прокрутку после перехода «назад». Картинки и шрифты могут догрузиться
 * и сдвинуть текст — поэтому повторяем пару раз, пока пользователь сам не начал листать.
 */
export function restoreScroll(y: number) {
  scrollTo(0, y)
  let userScrolled = false
  const stop = () => (userScrolled = true)
  addEventListener('touchstart', stop, { once: true, passive: true })
  addEventListener('wheel', stop, { once: true, passive: true })
  for (const delay of [60, 250, 600]) {
    setTimeout(() => {
      if (!userScrolled && Math.abs(scrollY - y) > 4) scrollTo(0, y)
    }, delay)
  }
}
