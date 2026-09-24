import { useState } from 'preact/hooks'
import { Header } from '../components/Header'
import { Icon } from '../components/Icon'
import { createStore } from '../lib/store'
import { to } from '../lib/router'

// Медкарта семьи хранится только на этом устройстве (localStorage) — никуда не отправляется.
interface Member {
  id: string
  name: string
  birthYear?: number
  weight?: number
  blood?: string
  allergies?: string
  conditions?: string
  medicines?: string
  notes?: string
}

export const medcard = createStore<Member[]>([], 'medcard')

const BLOOD = ['', 'O(I) Rh+', 'O(I) Rh−', 'A(II) Rh+', 'A(II) Rh−', 'B(III) Rh+', 'B(III) Rh−', 'AB(IV) Rh+', 'AB(IV) Rh−']

const round = (n: number, step: number) => Math.round(n / step) * step
const fmt = (n: number) => n.toLocaleString('ru-RU', { maximumFractionDigits: 1 })
const fmt2 = (n: number) => n.toLocaleString('ru-RU', { maximumFractionDigits: 2 })

/** Расчёт доз — те же правила, что в статье «Дозирование лекарств» */
function Doses({ weight, ageYears }: { weight: number; ageYears?: number }) {
  const infant = ageYears !== undefined && ageYears < 0.25
  const paraMg = infant ? round(10 * weight, 5) : Math.min(round(15 * weight, 5), 1000)
  const paraMax = infant ? `не чаще чем через 8 часов, не больше 3 раз в сутки` : `не чаще чем через 4–6 часов, не больше 4 раз в сутки (всего до ${fmt(Math.min(60 * weight, 4000))} мг)`
  const ibuAllowed = weight > 5 && !infant
  const ibuMg = Math.min(round(10 * weight, 5), 400)
  const ors4h = round(75 * weight, 10)
  const orsSevere = round(20 * weight, 10)
  const perStool = ageYears === undefined ? null : ageYears < 2 ? '50–100 мл' : ageYears <= 10 ? '100–200 мл' : 'сколько хочет (обычно 200–400 мл)'

  return (
    <div class="doses">
      <div class="doses__row">
        <p class="doses__name">Парацетамол (жар, боль)</p>
        <p>
          <b>{fmt(paraMg)} мг</b> на приём
          {weight < 40 && <> = <b>{fmt(round(paraMg / 24, 0.5))} мл</b> сиропа 120 мг/5 мл</>}
          {weight >= 20 && <> {weight < 40 ? 'или' : '='} {fmt(round(paraMg / 50, 0.5))} мл сиропа 250 мг/5 мл</>}
          {weight >= 33 && <> или {paraMg >= 1000 ? '2 таблетки' : paraMg >= 500 ? '1 таблетка' : '½ таблетки'} 500 мг</>}
        </p>
        <p class="doses__note">{paraMax}.</p>
      </div>
      <div class="doses__row">
        <p class="doses__name">Ибупрофен (жар, боль, воспаление)</p>
        {ibuAllowed ? (
          <>
            <p>
              До <b>{fmt(ibuMg)} мг</b> на приём (можно меньше: 5–10 мг/кг) = <b>{fmt(round(ibuMg / 20, 0.5))} мл</b> сиропа 100 мг/5 мл
              {weight >= 20 && <> или {ibuMg >= 400 ? '2 таблетки' : ibuMg >= 200 ? '1 таблетка' : '½ таблетки'} 200 мг</>}
            </p>
            <p class="doses__note">
              Не чаще чем через 6–8 часов, не больше 3 раз в сутки (всего до {fmt(Math.min(30 * weight, 1200))} мг). Нельзя при
              обезвоживании, рвоте и поносе, ветрянке, язве, кровотечении.
            </p>
          </>
        ) : (
          <p class="doses__note">Нельзя: только с 3 месяцев и при весе больше 5 кг.</p>
        )}
      </div>
      <div class="doses__row">
        <p class="doses__name">Раствор для питья (ОРС) при поносе и обезвоживании</p>
        <p>
          Умеренное обезвоживание: <b>{fmt(ors4h)} мл за 4 часа</b> (75 мл/кг), маленькими глотками.
        </p>
        <p>
          Тяжёлое, если может глотать и помощи нет: <b>{fmt(orsSevere)} мл в час</b> (20 мл/кг) в течение 6 часов.
        </p>
        {perStool && <p>После каждого жидкого стула: {perStool}.</p>}
        <p class="doses__note">Рецепт: 1 л кипячёной воды + 6 ровных чайных ложек сахара + ½ ровной чайной ложки соли.</p>
      </div>
      <div class="doses__row">
        <p class="doses__name">Амоксициллин (пневмония, отит, ангина — см. «Антибиотики»)</p>
        {(() => {
          const stdMg = Math.min(round(25 * weight, 25), 1000)
          const highMg = Math.min(round(45 * weight, 25), 1000)
          return (
            <>
              <p>
                Обычная доза 25 мг/кг 2 раза в день: <b>{fmt(stdMg)} мг</b> = <b>{fmt(round(stdMg / 50, 0.5))} мл</b> суспензии 250 мг/5 мл
                {weight < 20 && <> ({fmt(round(stdMg / 25, 0.5))} мл суспензии 125 мг/5 мл)</>}
              </p>
              <p>
                Высокая доза 45 мг/кг 2 раза в день (тяжёлая пневмония, отит): <b>{fmt(highMg)} мг</b> = <b>{fmt(round(highMg / 50, 0.5))} мл</b> суспензии 250 мг/5 мл
              </p>
              <p class="doses__note">Курс 5 дней (ангина 10). Не при аллергии на пенициллины. Порошок разводят кипячёной водой по метке на флаконе.</p>
            </>
          )
        })()}
      </div>
      <div class="doses__row">
        <p class="doses__name">Адреналин при анафилаксии (см. «Анафилаксия»)</p>
        {(() => {
          const ml = ageYears !== undefined && ageYears < 6 ? 0.15 : ageYears !== undefined && ageYears < 12 ? 0.3 : weight < 25 ? 0.15 : weight < 40 ? 0.3 : 0.5
          const byWeight = Math.min(round(0.01 * weight, 0.01), ml)
          const dose = Math.min(ml, Math.max(byWeight, 0.1))
          return (
            <>
              <p>
                Ампула 1 мг/мл (0,1 %), в мышцу бедра: <b>{fmt2(dose)} мл</b> = <b>{Math.round(dose * 100)} делений</b> инсулинового шприца U-100
              </p>
              <p>
                Автоинъектор: <b>{dose >= 0.3 ? '0,3 мг' : '0,15 мг'}</b>. Нет улучшения через 5 минут — повторить.
              </p>
              <p class="doses__note">Только в мышцу, никогда в вену. Расчёт: 0,01 мл/кг, но не больше 0,15 мл до 6 лет, 0,3 мл в 6–12 лет, 0,5 мл старше 12.</p>
            </>
          )
        })()}
      </div>
      <div class="doses__row">
        <p class="doses__name">Диазепам при судорогах дольше 5 минут (в прямую кишку)</p>
        <p>
          <b>{fmt(Math.min(round(0.5 * weight, 1), 20))} мг</b> (0,5 мг/кг, не больше 20 мг){ageYears !== undefined && ageYears >= 18 && <> — взрослым 20 мг</>}
        </p>
        <p class="doses__note">Повторить один раз через 10 минут половиной дозы, если приступ продолжается. Не давать, если дыхание реже 10 в минуту. См. «Судороги».</p>
      </div>
      <div class="doses__row">
        <p class="doses__name">Йодид калия при радиационной аварии (только по объявлению властей)</p>
        <p>
          {ageYears === undefined
            ? 'Укажите возраст: доза зависит от него, а не от веса.'
            : ageYears < 1 / 12
              ? <><b>16 мг</b> = ⅛ таблетки 125–130 мг — растворить: таблетка + 20 мл воды + 20 мл молока/сока, дать 5 мл</>
              : ageYears < 3
                ? <><b>32 мг</b> = ¼ таблетки (10 мл раствора из таблетки в 40 мл жидкости)</>
                : ageYears <= 12
                  ? <><b>65 мг</b> = ½ таблетки</>
                  : ageYears > 40
                    ? <>Старше 40 лет обычно <b>не принимают</b> (только при объявленной очень высокой дозе — 1 таблетка)</>
                    : <><b>130 мг</b> = 1 таблетка 125–130 мг</>}
        </p>
        <p class="doses__note">Один раз; повтор только по официальному указанию. Беременным и кормящим — 1 таблетка однократно в любом возрасте. Не йодная настойка и не «Йодомарин». См. «Йодная профилактика».</p>
      </div>
      <p class="doses__warn">
        Проверяйте по статьям <a href={to.article('drug-dosing')}>«Дозирование лекарств»</a>, <a href={to.article('antibiotics')}>«Антибиотики»</a>, <a href={to.article('anaphylaxis')}>«Анафилаксия»</a>, <a href={to.article('seizures')}>«Судороги»</a>, <a href={to.article('potassium-iodide')}>«Йодная профилактика»</a> и инструкции к препарату.
        Жидкость отмеряйте шприцем. Детям до 3 месяцев с температурой — это <a href={to.article('child-illness')}>тревожный признак</a>.
      </p>
    </div>
  )
}

export function DoseCalculator() {
  const [weight, setWeight] = useState('')
  const [age, setAge] = useState('')
  const w = Number(weight.replace(',', '.'))
  const a = age === '' ? undefined : Number(age.replace(',', '.'))
  return (
    <div class="card">
      <div class="form-row">
        <label>
          Вес, кг
          <input inputMode="decimal" value={weight} onInput={(e) => setWeight(e.currentTarget.value)} placeholder="например 14" />
        </label>
        <label>
          Возраст, лет
          <input inputMode="decimal" value={age} onInput={(e) => setAge(e.currentTarget.value)} placeholder="0,5 = полгода" />
        </label>
      </div>
      {w > 0 && w < 200 ? <Doses weight={w} ageYears={a} /> : <p class="muted">Введите вес — появятся дозы.</p>}
    </div>
  )
}

function MemberForm({ member, onSave, onCancel }: { member: Member; onSave: (m: Member) => void; onCancel: () => void }) {
  const [m, setM] = useState(member)
  const field = (key: keyof Member, label: string, opts: { area?: boolean; num?: boolean; ph?: string } = {}) => (
    <label class="form-field">
      {label}
      {opts.area ? (
        <textarea rows={2} value={(m[key] as string) ?? ''} placeholder={opts.ph} onInput={(e) => setM({ ...m, [key]: e.currentTarget.value })} />
      ) : (
        <input
          inputMode={opts.num ? 'decimal' : undefined}
          value={m[key] === undefined ? '' : String(m[key])}
          placeholder={opts.ph}
          onInput={(e) => {
            const v = e.currentTarget.value
            setM({ ...m, [key]: opts.num ? (v === '' ? undefined : Number(v.replace(',', '.'))) : v })
          }}
        />
      )}
    </label>
  )
  return (
    <div class="card member-form">
      {field('name', 'Имя', { ph: 'Мама, Саша…' })}
      <div class="form-row">
        {field('birthYear', 'Год рождения', { num: true, ph: '2019' })}
        {field('weight', 'Вес, кг', { num: true, ph: '18' })}
      </div>
      <label class="form-field">
        Группа крови
        <select value={m.blood ?? ''} onChange={(e) => setM({ ...m, blood: e.currentTarget.value })}>
          {BLOOD.map((b) => (
            <option key={b} value={b}>
              {b || 'не знаю'}
            </option>
          ))}
        </select>
      </label>
      {field('allergies', 'Аллергии (лекарства, еда, укусы)', { area: true })}
      {field('conditions', 'Хронические болезни', { area: true })}
      {field('medicines', 'Постоянные лекарства и дозы', { area: true })}
      {field('notes', 'Прививки, операции, другое', { area: true })}
      <div class="form-actions">
        <button class="btn" onClick={() => m.name.trim() && onSave(m)} disabled={!m.name.trim()}>
          Сохранить
        </button>
        <button class="btn btn--ghost" onClick={onCancel}>
          Отмена
        </button>
      </div>
    </div>
  )
}

export function Medcard() {
  const members = medcard.use()
  const [editing, setEditing] = useState<Member | null>(null)
  const [open, setOpen] = useState<string | null>(null)
  const thisYear = new Date().getFullYear()

  function save(m: Member) {
    const list = members.some((x) => x.id === m.id) ? members.map((x) => (x.id === m.id ? m : x)) : [...members, m]
    medcard.set(list)
    setEditing(null)
  }

  return (
    <>
      <Header title="Медкарта семьи" back={to.settings()} />
      <main class="page">
        <p class="section__hint">
          Хранится только на этом телефоне. Заполните заранее: в экстренной ситуации здесь будут вес для расчёта доз,
          аллергии и постоянные лекарства каждого.
        </p>

        {editing ? (
          <MemberForm member={editing} onSave={save} onCancel={() => setEditing(null)} />
        ) : (
          <>
            {members.map((m) => {
              const age = m.birthYear ? thisYear - m.birthYear : undefined
              const isOpen = open === m.id
              return (
                <div key={m.id} class="card member">
                  <button class="member__head" onClick={() => setOpen(isOpen ? null : m.id)} aria-expanded={isOpen}>
                    <span>
                      <b>{m.name}</b>
                      <small>
                        {[age !== undefined && `${age} лет`, m.weight && `${fmt(m.weight)} кг`, m.blood].filter(Boolean).join(' · ')}
                      </small>
                    </span>
                    <Icon name="chevron" size={18} />
                  </button>
                  {m.allergies && <p class="member__alert">⚠ Аллергия: {m.allergies}</p>}
                  {isOpen && (
                    <div class="member__body">
                      {m.conditions && <p><b>Болезни:</b> {m.conditions}</p>}
                      {m.medicines && <p><b>Лекарства:</b> {m.medicines}</p>}
                      {m.notes && <p><b>Другое:</b> {m.notes}</p>}
                      {m.weight ? <Doses weight={m.weight} ageYears={age} /> : <p class="muted">Укажите вес — появится расчёт доз.</p>}
                      <div class="form-actions">
                        <button class="btn btn--ghost btn--small" onClick={() => setEditing(m)}>
                          Изменить
                        </button>
                        <button
                          class="btn btn--ghost btn--small"
                          onClick={() => confirm(`Удалить «${m.name}» из медкарты?`) && medcard.set(members.filter((x) => x.id !== m.id))}
                        >
                          Удалить
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
            <button class="btn" onClick={() => setEditing({ id: String(Date.now()), name: '' })}>
              + Добавить человека
            </button>
          </>
        )}

        <section class="section">
          <h2 class="section__title">Калькулятор доз по весу</h2>
          <DoseCalculator />
        </section>
      </main>
    </>
  )
}
