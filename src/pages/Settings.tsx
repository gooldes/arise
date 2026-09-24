import { useEffect, useState } from 'preact/hooks'
import { FamilyBar } from '../components/FamilyBar'
import { Header } from '../components/Header'
import { to } from '../lib/router'
import { Icon } from '../components/Icon'
import { articles } from '../data'
import {
  getOfflineStatus,
  installPrompt,
  isFileMode,
  isIOS,
  isStandalone,
  type OfflineStatus,
} from '../lib/offline'
import { FONT_SCALES, favorites, recent, settings, type Theme } from '../lib/user'

const THEMES: { id: Theme; label: string }[] = [
  { id: 'auto', label: 'Авто' },
  { id: 'light', label: 'Светлая' },
  { id: 'dark', label: 'Тёмная' },
  { id: 'night', label: 'Ночная' },
]

export function Settings() {
  const s = settings.use()
  const prompt = installPrompt.use()
  const [status, setStatus] = useState<OfflineStatus | null>(null)

  useEffect(() => {
    let alive = true
    const check = () => getOfflineStatus().then((st) => alive && setStatus(st))
    check()
    // пока идёт первая загрузка — обновляем прогресс
    const timer = setInterval(check, 2000)
    return () => {
      alive = false
      clearInterval(timer)
    }
  }, [])

  const scaleIdx = FONT_SCALES.indexOf(s.fontScale)
  const setScale = (i: number) =>
    settings.set({ ...s, fontScale: FONT_SCALES[Math.max(0, Math.min(FONT_SCALES.length - 1, i))] })

  return (
    <>
      <Header title="Настройки" />
      <main class="page">
        <section class="section">
          <h2 class="section__title">Офлайн-доступ</h2>
          <OfflineCard status={status} />
        </section>

        {!isStandalone && !isFileMode && (
          <section class="section">
            <h2 class="section__title">Установка на телефон</h2>
            <div class="card">
              {prompt ? (
                <>
                  <p>Установите приложение — оно появится на главном экране и будет открываться без интернета.</p>
                  <button
                    class="btn"
                    onClick={async () => {
                      await prompt.prompt()
                      installPrompt.set(null)
                    }}
                  >
                    <Icon name="download" size={20} /> Установить
                  </button>
                </>
              ) : isIOS ? (
                <ol class="steps">
                  <li>Откройте эту страницу в Safari.</li>
                  <li>Нажмите «Поделиться» (квадрат со стрелкой).</li>
                  <li>Выберите «На экран “Домой”».</li>
                </ol>
              ) : (
                <ol class="steps">
                  <li>Откройте меню браузера (⋮).</li>
                  <li>Выберите «Установить приложение» или «Добавить на главный экран».</li>
                </ol>
              )}
            </div>
          </section>
        )}

        <section class="section">
          <h2 class="section__title">Здоровье семьи</h2>
          <a class="card card--row card--link" href={to.medcard()}>
            <span>
              <b>Медкарта семьи и калькулятор доз</b>
              <small class="muted">Вес, аллергии, болезни, лекарства — и дозы по весу</small>
            </span>
            <Icon name="chevron" size={18} />
          </a>
        </section>

        <section class="section">
          <h2 class="section__title">Состав семьи</h2>
          <FamilyBar />
        </section>

        <section class="section">
          <h2 class="section__title">Тема</h2>
          <div class="segmented" role="radiogroup" aria-label="Тема">
            {THEMES.map((t) => (
              <button
                key={t.id}
                role="radio"
                aria-checked={s.theme === t.id}
                class={s.theme === t.id ? 'is-active' : ''}
                onClick={() => settings.set({ ...s, theme: t.id })}
              >
                {t.label}
              </button>
            ))}
          </div>
          <p class="section__hint">«Ночная» — красный на чёрном: не слепит в темноте и экономит заряд.</p>
        </section>

        <section class="section">
          <h2 class="section__title">Размер текста</h2>
          <div class="stepper">
            <button class="btn btn--ghost" onClick={() => setScale(scaleIdx - 1)} disabled={scaleIdx <= 0} aria-label="Меньше">
              A−
            </button>
            <span class="stepper__value">{Math.round(s.fontScale * 100)}%</span>
            <button
              class="btn btn--ghost"
              onClick={() => setScale(scaleIdx + 1)}
              disabled={scaleIdx >= FONT_SCALES.length - 1}
              aria-label="Больше"
            >
              A+
            </button>
          </div>
        </section>

        <section class="section">
          <h2 class="section__title">Данные</h2>
          <div class="card card--row">
            <span>Очистить историю и избранное</span>
            <button
              class="btn btn--ghost btn--small"
              onClick={() => {
                if (confirm('Удалить историю просмотров и избранное?')) {
                  recent.set([])
                  favorites.set([])
                }
              }}
            >
              Очистить
            </button>
          </div>
        </section>

        <section class="section">
          <h2 class="section__title">О справочнике</h2>
          <div class="card about">
            <p>
              Статей: <b>{articles.length}</b> · Сборка: {new Date(__BUILD_DATE__).toLocaleDateString('ru-RU')}
            </p>
            <p class="about__disclaimer">
              Справочник не заменяет профессиональную медицинскую помощь. Если есть возможность обратиться к врачу или
              спасателям — сделайте это.
            </p>
          </div>
        </section>
      </main>
    </>
  )
}

function OfflineCard({ status }: { status: OfflineStatus | null }) {
  if (!status) return <div class="card">Проверяю…</div>
  const { state } = status
  if (state === 'ready')
    return (
      <div class="card card--ok">
        <p class="status-line">
          <Icon name="check" size={20} /> Всё скачано — работает без интернета
        </p>
        <p class="muted">
          Файлов: {status.cached} из {status.total}
          {status.usageMb ? ` · занято ≈ ${status.usageMb.toFixed(1)} МБ` : ''}
          {status.persisted ? ' · защищено от автоудаления' : ''}
        </p>
      </div>
    )
  if (state === 'downloading')
    return (
      <div class="card card--warn">
        <p class="status-line">Скачиваю контент для офлайна…</p>
        {status.total ? (
          <progress max={status.total} value={status.cached} />
        ) : (
          <p class="muted">Не закрывайте страницу, пока загрузка не завершится.</p>
        )}
      </div>
    )
  if (state === 'file')
    return (
      <div class="card card--ok">
        <p class="status-line">
          <Icon name="check" size={20} /> Открыто из файла — весь контент уже на устройстве
        </p>
      </div>
    )
  if (state === 'dev') return <div class="card">Режим разработки: офлайн-кэш включается только в сборке.</div>
  return (
    <div class="card card--warn">
      <p class="status-line">Браузер не поддерживает офлайн-режим</p>
      <p class="muted">Откройте справочник в Chrome или Safari последней версии.</p>
    </div>
  )
}
