import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import { Marked } from 'marked'
import type { Plugin } from 'vite'
import { normalize, processTerm, stem, tokenize } from '../src/lib/ru.ts'
import type { Article, Book, Category, Term, Urgency } from '../src/types.ts'

const VIRTUAL_ID = 'virtual:content'
const RESOLVED_ID = '\0' + VIRTUAL_ID
const CONTENT_DIR = path.resolve('content')
const ARTICLES_DIR = path.join(CONTENT_DIR, 'articles')
const IMAGES_DIR = path.join(CONTENT_DIR, 'images')
const GLOSSARY_DIR = path.join(CONTENT_DIR, 'glossary')
const BOOKS_JSON = path.join(CONTENT_DIR, 'books', 'books.json')
const PUBLIC_BOOKS = path.resolve('public/books')
const URGENCIES: Urgency[] = ['critical', 'important', 'normal']
const MAX_RELATED = 6

const CALLOUTS: Record<string, string> = {
  DANGER: 'Опасно',
  WARNING: 'Внимание',
  NOTE: 'Важно знать',
  TIP: 'Совет',
}

function walk(dir: string, ext: string): string[] {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name)
    return e.isDirectory() ? walk(p, ext) : e.name.endsWith(ext) ? [p] : []
  })
}

function readJson<T>(file: string, problems: string[]): T | undefined {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')) as T
  } catch (e) {
    problems.push(`${path.relative(CONTENT_DIR, file)}: некорректный JSON (${(e as Error).message})`)
  }
}

/** Картинки: `![](name.png)` → `img/name.webp` (конвертирует scripts/images.mjs), svg остаётся svg. */
function imageHref(href: string, file: string, problems: string[]): string {
  if (/^(https?:|data:)/.test(href)) {
    problems.push(`${file}: внешняя картинка ${href} не будет доступна офлайн`)
    return href
  }
  const base = path.basename(href)
  const ext = path.extname(base).toLowerCase()
  const name = base.slice(0, base.length - ext.length)
  if (!fs.existsSync(path.join(IMAGES_DIR, base))) problems.push(`${file}: нет картинки content/images/${base}`)
  return ext === '.svg' ? `img/${name}.svg` : `img/${name}.webp`
}

function htmlToText(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

/** Галочки в строках обычных таблиц (таблицы запасов `supplies` не трогаем) */
function checkableTableRows(html: string): string {
  return html.replace(/<table>([\s\S]*?)<\/table>/g, (table) =>
    table.replace(/<tbody>([\s\S]*?)<\/tbody>/, (tbody) =>
      tbody.replace(/<tr>([\s\S]*?)<\/tr>/g, (row, cells: string) => {
        const tds = cells.match(/<td[^>]*>[\s\S]*?<\/td>/g) ?? []
        const first = tds[0] ?? ''
        const restEmpty = tds.slice(1).every((td) => htmlToText(td) === '')
        const isGroupTitle = restEmpty && /^<td[^>]*>\s*<strong>[\s\S]*<\/strong>\s*<\/td>$/.test(first)
        if (htmlToText(first) === '' || isGroupTitle) return row
        return `<tr class="check-row">${cells.replace(/<td([^>]*)>/, '<td$1><input disabled="" type="checkbox"> ')}</tr>`
      }),
    ),
  )
}

/** gray-matter + автоисправление частой ошибки: двоеточие в незакавыченном title/summary */
function parseFrontmatter(src: string, rel: string, problems: string[]) {
  try {
    return matter(src)
  } catch {
    const fixed = src.replace(/^(title|summary|section):[ \t]*(?!["'])(.*:.*)$/gm, (_m, key: string, value: string) =>
      `${key}: ${JSON.stringify(value.trim())}`,
    )
    try {
      return matter(fixed)
    } catch (e) {
      problems.push(`${rel}: ошибка во frontmatter (${(e as Error).message.split('\n')[0]})`)
    }
  }
}

// ---------- Таблицы запасов с пересчётом на семью ----------
//
// ```supplies days=14 title="Еда на 2 недели"
// Вода питьевая | л | 3 | 2
// Котелок 2–3 л | шт | 0 | 0 | 1
// ```
// Колонки: что | единица | на взрослого | на ребёнка | [на всю семью сверху].
// Взрослый/ребёнок умножаются на days (если указано); последняя колонка — фиксированно на семью.

const fmtNum = (n: number) =>
  Number.isInteger(n) ? String(n) : n.toLocaleString('ru-RU', { maximumFractionDigits: n < 10 ? 2 : 1 })

function renderSupplies(md: string, rel: string, problems: string[]): string {
  return md.replace(/^```supplies([^\n]*)\n([\s\S]*?)^```[ \t]*$/gm, (_m, args: string, body: string) => {
    const days = Number(/days=(\d+(?:\.\d+)?)/.exec(args)?.[1] ?? 1)
    const title = /title="([^"]*)"/.exec(args)?.[1]
    const rows = body
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((line) => {
        const cells = line.split('|').map((c) => c.trim())
        const [name, unit, a, c, f] = cells
        const num = (v?: string) => (v ? Number(v.replace(',', '.')) : 0)
        if (cells.length < 4 || [a, c].some((v) => Number.isNaN(num(v))) || Number.isNaN(num(f))) {
          problems.push(`${rel}: неверная строка supplies «${line}»`)
          return ''
        }
        const adult = num(a) * days
        const child = num(c) * days
        const fixed = num(f)
        const cell = (v: number) => (v ? `${fmtNum(v)} ${unit}` : '—')
        const fam = adult * 2 + child * 2 + fixed
        return (
          `<tr><td>${name}</td><td>${cell(adult)}</td><td>${cell(child)}</td>` +
          `<td class="fam" data-a="${adult}" data-c="${child}" data-f="${fixed}" data-u="${unit}">${fmtNum(fam)} ${unit}</td></tr>`
        )
      })
      .join('')
    const caption = [title, days > 1 ? `из расчёта на ${fmtNum(days)} ${days % 10 === 1 && days % 100 !== 11 ? 'день' : days % 10 >= 2 && days % 10 <= 4 && (days % 100 < 12 || days % 100 > 14) ? 'дня' : 'дней'}` : '']
      .filter(Boolean)
      .join(' — ')
    return (
      `\n<div class="supplies">${caption ? `<p class="supplies__title">${caption}</p>` : ''}` +
      `<div class="table-wrap"><table class="supplies-table"><thead><tr><th>Что</th><th>Взрослый</th><th>Ребёнок</th>` +
      `<th class="fam-h">Семья 2+2</th></tr></thead><tbody>${rows}</tbody></table></div></div>\n`
    )
  })
}

// ---------- Словарь терминов ----------

interface RawTerm {
  term: string
  forms?: string[]
  definition: string
  article?: string
  /** только перечисленные формы, без поиска по основе */
  exact?: boolean
}

interface TermMatcher {
  terms: Term[]
  formToId: Map<string, string>
  /** Основы однословных терминов (≥5 букв) — ловят формы, которые автор не перечислил */
  stems: { stem: string; id: string }[]
  regex: RegExp | null
}

function loadGlossary(problems: string[]): TermMatcher {
  const byKey = new Map<string, { term: Term; forms: Set<string>; exact: boolean }>()
  for (const file of walk(GLOSSARY_DIR, '.json').sort()) {
    const list = readJson<RawTerm[]>(file, problems)
    if (!Array.isArray(list)) continue
    for (const raw of list) {
      if (!raw?.term || !raw.definition) {
        problems.push(`${path.relative(CONTENT_DIR, file)}: термин без term/definition`)
        continue
      }
      const key = normalize(raw.term.trim())
      const forms = [raw.term, ...(raw.forms ?? [])].map((f) => normalize(f.trim())).filter((f) => f.length >= 3)
      const existing = byKey.get(key)
      if (existing) {
        // один термин из разных файлов: объединяем формы, берём первое определение
        forms.forEach((f) => existing.forms.add(f))
        existing.exact ||= Boolean(raw.exact)
        existing.term.article ??= raw.article
        continue
      }
      byKey.set(key, {
        term: { id: '', term: raw.term.trim(), definition: raw.definition.trim(), article: raw.article || undefined },
        forms: new Set(forms),
        exact: Boolean(raw.exact),
      })
    }
  }

  const entries = [...byKey.values()].sort((a, b) => a.term.term.localeCompare(b.term.term, 'ru'))
  const terms: Term[] = []
  const formToId = new Map<string, string>()
  // exact: true — только перечисленные формы, без поиска по основе («постав» не должен ловить «поставьте»)
  const exactIds = new Set<string>()
  entries.forEach(({ term, forms, exact }, i) => {
    term.id = `t${i}`
    if (exact) exactIds.add(term.id)
    terms.push(term)
    for (const f of forms) if (!formToId.has(f)) formToId.set(f, term.id)
  })

  const stems: { stem: string; id: string }[] = []
  const seenStems = new Set<string>()
  for (const [form, id] of formToId) {
    if (/\s/.test(form) || form.length < 6 || exactIds.has(id)) continue
    const st = stem(form)
    if (st.length < 5 || seenStems.has(st)) continue
    seenStems.add(st)
    stems.push({ stem: st, id })
  }
  stems.sort((a, b) => b.stem.length - a.stem.length)

  const escape = (f: string) => f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/е/g, '[её]').replace(/\s+/g, '\\s+')
  const alternatives = [
    ...[...formToId.keys()].sort((a, b) => b.length - a.length).map(escape),
    ...stems.map((s) => `${escape(s.stem)}\\p{L}{0,4}`),
  ]
  const regex = alternatives.length
    ? new RegExp(`(?<![\\p{L}\\p{N}])(?:${alternatives.join('|')})(?![\\p{L}\\p{N}])`, 'giu')
    : null
  return { terms, formToId, stems, regex }
}

const SKIP_TAGS = /^(a|h[1-6]|code|pre|button|mark|th)$/

/** Размечает первое вхождение каждого термина в тексте статьи (кроме ссылок, заголовков, кода). */
function annotateTerms(html: string, matcher: TermMatcher, used: Set<string>): string {
  if (!matcher.regex) return html
  let skipDepth = 0
  return html.replace(/(<[^>]+>)|([^<]+)/g, (_m, tag: string | undefined, text: string | undefined) => {
    if (tag) {
      const name = /^<\/?([a-zA-Z0-9]+)/.exec(tag)?.[1]?.toLowerCase()
      if (name && SKIP_TAGS.test(name)) {
        if (tag.startsWith('</')) skipDepth = Math.max(0, skipDepth - 1)
        else if (!tag.endsWith('/>')) skipDepth++
      }
      return tag
    }
    if (!text || skipDepth > 0) return text ?? ''
    return text.replace(matcher.regex!, (word) => {
      const w = normalize(word).replace(/\s+/g, ' ')
      const id = matcher.formToId.get(w) ?? matcher.stems.find((s) => w.startsWith(s.stem))?.id
      if (!id || used.has(id)) return word
      used.add(id)
      return `<button type="button" class="term" data-term="${id}">${word}</button>`
    })
  })
}

// ---------- Связанные статьи ----------

function termVector(a: Article): Map<string, number> {
  const weighted = [
    [a.title, 3],
    [a.tags.join(' '), 3],
    [a.summary, 2],
    [a.text, 1],
  ] as const
  const tf = new Map<string, number>()
  for (const [s, w] of weighted) {
    for (const tok of tokenize(s)) {
      const t = processTerm(tok)
      if (!t || t.length < 3 || /^\d+$/.test(t)) continue
      tf.set(t, (tf.get(t) ?? 0) + w)
    }
  }
  return tf
}

function computeRelated(articles: Article[], explicit: Map<string, string[]>, links: Map<string, Set<string>>) {
  const vectors = articles.map(termVector)
  const df = new Map<string, number>()
  for (const v of vectors) for (const t of v.keys()) df.set(t, (df.get(t) ?? 0) + 1)
  const n = articles.length
  const tfidf = vectors.map((v) => {
    const out = new Map<string, number>()
    let norm = 0
    for (const [t, f] of v) {
      const w = (1 + Math.log(f)) * Math.log(n / (df.get(t) ?? 1))
      if (w <= 0) continue
      out.set(t, w)
      norm += w * w
    }
    norm = Math.sqrt(norm) || 1
    for (const [t, w] of out) out.set(t, w / norm)
    return out
  })

  articles.forEach((a, i) => {
    const manual = explicit.get(a.slug) ?? []
    const scored: { slug: string; score: number }[] = []
    articles.forEach((b, j) => {
      if (i === j || manual.includes(b.slug)) return
      let cos = 0
      const [small, big] = tfidf[i].size < tfidf[j].size ? [tfidf[i], tfidf[j]] : [tfidf[j], tfidf[i]]
      for (const [t, w] of small) cos += w * (big.get(t) ?? 0)
      const sharedTags = a.tags.filter((t) => b.tags.includes(t)).length
      const linked = links.get(a.slug)?.has(b.slug) || links.get(b.slug)?.has(a.slug)
      const score = cos * 10 + sharedTags * 1.5 + (linked ? 2 : 0) + (a.section && a.section === b.section ? 0.5 : 0)
      if (score >= 1.5) scored.push({ slug: b.slug, score })
    })
    scored.sort((x, y) => y.score - x.score)
    a.related = [...manual, ...scored.map((s) => s.slug)].slice(0, Math.max(MAX_RELATED, manual.length))
  })
}

// ---------- Книги ----------

function loadBooks(problems: string[]): Book[] {
  if (!fs.existsSync(BOOKS_JSON)) return []
  const raw = readJson<Omit<Book, 'sizeMb' | 'searchable'>[]>(BOOKS_JSON, problems) ?? []
  return raw.flatMap((b) => {
    const pdf = path.join(PUBLIC_BOOKS, b.file)
    if (!fs.existsSync(pdf)) {
      problems.push(`books.json: нет файла ${b.file} (запустите npm run assets)`)
      return []
    }
    return [
      {
        ...b,
        sizeMb: Math.round((fs.statSync(pdf).size / 1024 / 1024) * 10) / 10,
        searchable: fs.existsSync(path.join(PUBLIC_BOOKS, `${b.id}.pages.json`)),
      },
    ]
  })
}

// Шаги «Сделайте сейчас» — однострочный markdown: **жирный**, [ссылка](slug)
function quickMarked(rel: string, linkTargets: { file: string; slug: string }[]) {
  return new Marked({
    walkTokens(token) {
      if (token.type === 'link' && !/^([a-z]+:|#)/i.test(token.href)) {
        const target = path.basename(token.href, '.md')
        linkTargets.push({ file: `${rel} (quick)`, slug: target })
        token.href = `#/a/${encodeURIComponent(target)}`
      }
    },
  })
}

// ---------- Сборка всего контента ----------

function loadContent() {
  const problems: string[] = []
  const categories = readJson<Category[]>(path.join(CONTENT_DIR, 'categories.json'), problems) ?? []
  const categoryById = new Map(categories.map((c) => [c.id, c]))
  const files = walk(ARTICLES_DIR, '.md')
  const glossary = loadGlossary(problems)
  const articles: Article[] = []
  const explicitRelated = new Map<string, string[]>()
  const links = new Map<string, Set<string>>()
  const linkTargets: { file: string; slug: string }[] = []

  for (const file of files) {
    const rel = path.relative(CONTENT_DIR, file)
    const parsed = parseFrontmatter(fs.readFileSync(file, 'utf8'), rel, problems)
    if (!parsed) continue
    const { data, content } = parsed
    const slug: string = data.slug ?? path.basename(file, '.md')
    const category: string = data.category ?? path.basename(path.dirname(file))
    const cat = categoryById.get(category)
    if (!data.title) problems.push(`${rel}: нет title`)
    if (!cat) problems.push(`${rel}: неизвестная категория "${category}"`)
    const section = data.section ? String(data.section) : undefined
    if (cat?.sections && (!section || !cat.sections.includes(section)))
      problems.push(`${rel}: section "${section ?? ''}" не из списка разделов категории ${category}`)
    const urgency: Urgency = URGENCIES.includes(data.urgency) ? data.urgency : 'normal'
    const outLinks = new Set<string>()

    const marked = new Marked({
      gfm: true,
      walkTokens(token) {
        if (token.type === 'image') token.href = imageHref(token.href, rel, problems)
        if (token.type === 'link' && !/^([a-z]+:|#)/i.test(token.href)) {
          // [текст](slug-статьи) или [текст](../water/boil.md) → внутренняя ссылка
          const target = path.basename(token.href, '.md')
          linkTargets.push({ file: rel, slug: target })
          outLinks.add(target)
          token.href = `#/a/${encodeURIComponent(target)}`
        }
      },
    })

    let html = marked.parse(renderSupplies(content, rel, problems), { async: false })
    // ![alt](file.jpg "Автор, лицензия") → <figure> с подписью
    html = html.replace(/<p>(<img [^>]*?title="([^"]*)"[^>]*>)<\/p>/g, (_m, img: string, title: string) =>
      `<figure>${img.replace(/ title="[^"]*"/, '')}<figcaption>${title}</figcaption></figure>`,
    )
    // checktable: true — строки таблиц-списков («что взять») тоже отмечаются галочкой.
    // Строка-подзаголовок (заполнена только первая ячейка) галочки не получает.
    if (data.checktable) html = checkableTableRows(html)
    // Чек-листы «- [ ] пункт» → интерактивные галочки (состояние хранится на устройстве)
    let checklistSize = 0
    html = html.replace(/<input (?:checked="" )?disabled="" type="checkbox"(?: checked="")?>/g, () =>
      `<input type="checkbox" class="check" data-i="${checklistSize++}" aria-label="Отметить">`,
    )
    html = html
      .replace(
        /<blockquote>\s*<p>\[!(DANGER|WARNING|NOTE|TIP)\]\s*/g,
        (_, kind: string) =>
          `<blockquote class="callout callout-${kind.toLowerCase()}"><p class="callout-title">${CALLOUTS[kind]}</p><p>`,
      )
      .replace(/<img /g, '<img loading="lazy" decoding="async" ')
      .replace(/<table>/g, '<div class="table-wrap"><table>')
      .replace(/<\/table>/g, '</table></div>')
    // Якоря для оглавления: <h2 id="h-0">…
    let headingIdx = 0
    html = html.replace(/<h2>/g, () => `<h2 id="h-${headingIdx++}">`)
    const text = htmlToText(html)
    html = annotateTerms(html, glossary, new Set())

    links.set(slug, outLinks)
    const related = Array.isArray(data.related) ? data.related.map(String) : []
    explicitRelated.set(slug, related)
    related.forEach((r: string) => linkTargets.push({ file: `${rel} (related)`, slug: r }))

    articles.push({
      slug,
      title: String(data.title ?? slug),
      category,
      section,
      latin: data.latin ? String(data.latin) : undefined,
      quick: Array.isArray(data.quick)
        ? data.quick.map((q: unknown) => quickMarked(rel, linkTargets).parseInline(String(q), { async: false }) as string)
        : undefined,
      image: data.image ? imageHref(String(data.image), rel, problems) : undefined,
      imageCredit: data.image_credit ? String(data.image_credit) : undefined,
      summary: String(data.summary ?? ''),
      tags: Array.isArray(data.tags) ? data.tags.map((t: unknown) => String(t).toLowerCase()) : [],
      urgency,
      sos: Boolean(data.sos),
      order: Number(data.order ?? 100),
      draft: Boolean(data.draft),
      updated: data.updated
        ? String(data.updated instanceof Date ? data.updated.toISOString().slice(0, 10) : data.updated)
        : undefined,
      related: [],
      hasSupplies: html.includes('class="supplies"'),
      checklistSize,
      html,
      text,
    })
  }

  const slugs = new Set<string>()
  for (const a of articles) {
    if (slugs.has(a.slug)) problems.push(`дублирующийся slug "${a.slug}"`)
    slugs.add(a.slug)
  }
  for (const l of linkTargets)
    if (!slugs.has(l.slug)) problems.push(`${l.file}: ссылка на несуществующую статью "${l.slug}"`)
  for (const t of glossary.terms)
    if (t.article && !slugs.has(t.article)) {
      problems.push(`словарь: термин «${t.term}» ссылается на несуществующую статью "${t.article}"`)
      t.article = undefined
    }

  const catOrder = new Map(categories.map((c, i) => [c.id, i]))
  const sectionOrder = (a: Article) => categoryById.get(a.category)?.sections?.indexOf(a.section ?? '') ?? 0
  articles.sort(
    (a, b) =>
      (catOrder.get(a.category) ?? 999) - (catOrder.get(b.category) ?? 999) ||
      sectionOrder(a) - sectionOrder(b) ||
      a.order - b.order ||
      a.title.localeCompare(b.title, 'ru'),
  )
  computeRelated(articles, explicitRelated, links)
  const books = loadBooks(problems)
  const allFiles = [...files, ...walk(GLOSSARY_DIR, '.json'), path.join(CONTENT_DIR, 'categories.json')]
  return { categories, articles, glossary: glossary.terms, books, files: allFiles, problems }
}

export default function content(): Plugin {
  let isBuild = false
  return {
    name: 'arise-content',
    configResolved(config) {
      isBuild = config.command === 'build'
    },
    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID
    },
    load(id) {
      if (id !== RESOLVED_ID) return
      const { categories, articles, glossary, books, files, problems } = loadContent()
      files.forEach((f) => this.addWatchFile(f))
      if (problems.length) {
        const msg = `Проблемы в контенте (${problems.length}):\n  - ${problems.join('\n  - ')}`
        if (isBuild && !process.env.ARISE_ALLOW_PROBLEMS) this.error(msg)
        else this.warn(msg)
      }
      return [
        `export const categories = ${JSON.stringify(categories)};`,
        // text не отправляем в бандл — он восстанавливается из html на клиенте (минус ~40% веса)
        `export const articles = ${JSON.stringify(articles.map(({ text: _text, ...a }) => a))};`,
        `export const glossary = ${JSON.stringify(glossary)};`,
        `export const books = ${JSON.stringify(books)};`,
      ].join('\n')
    },
    handleHotUpdate({ file, server }) {
      if (!file.startsWith(CONTENT_DIR)) return
      const mod = server.moduleGraph.getModuleById(RESOLVED_ID)
      if (mod) server.moduleGraph.invalidateModule(mod)
      server.ws.send({ type: 'full-reload' })
      return []
    },
  }
}
