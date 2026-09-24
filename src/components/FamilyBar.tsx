import { family } from '../lib/user'

function Stepper({ label, value, min, onChange }: { label: string; value: number; min: number; onChange: (v: number) => void }) {
  return (
    <div class="family-stepper">
      <span class="family-stepper__label">{label}</span>
      <button class="icon-btn icon-btn--small" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label={`${label}: меньше`}>
        −
      </button>
      <span class="family-stepper__value">{value}</span>
      <button class="icon-btn icon-btn--small" onClick={() => onChange(Math.min(20, value + 1))} aria-label={`${label}: больше`}>
        +
      </button>
    </div>
  )
}

/** Состав семьи — от него пересчитываются все таблицы запасов */
export function FamilyBar() {
  const f = family.use()
  return (
    <div class="family-bar">
      <p class="family-bar__title">Расчёт на вашу семью</p>
      <div class="family-bar__row">
        <Stepper label="Взрослые" value={f.adults} min={0} onChange={(adults) => family.set({ ...f, adults })} />
        <Stepper label="Дети" value={f.children} min={0} onChange={(children) => family.set({ ...f, children })} />
      </div>
      <p class="family-bar__hint">Ребёнок — 3–12 лет. Подросток старше 12 лет считается как взрослый.</p>
    </div>
  )
}

const fmt = (n: number) =>
  Number.isInteger(n) ? String(n) : n.toLocaleString('ru-RU', { maximumFractionDigits: n < 10 ? 2 : 1 })

/** Пересчитывает колонку «Семья» во всех таблицах запасов внутри root */
export function applyFamily(root: HTMLElement, adults: number, children: number) {
  root.querySelectorAll<HTMLElement>('.fam-h').forEach((th) => {
    th.textContent = `Семья ${adults}+${children}`
  })
  root.querySelectorAll<HTMLElement>('td.fam').forEach((td) => {
    const { a = '0', c = '0', f = '0', u = '' } = td.dataset
    const total = Number(a) * adults + Number(c) * children + Number(f)
    td.textContent = total ? `${fmt(total)} ${u}` : '—'
  })
}
