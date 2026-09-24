// Отчёт о покрытии контента: чего не хватает по плану, короткие статьи, статьи без ссылок.
// npm run content:report
import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'

const plan = fs.readFileSync('content/PLAN.md', 'utf8')
const planned = new Map()
let cat = ''
for (const line of plan.split('\n')) {
  const c = /^## (\S+)/.exec(line)
  if (c) cat = c[1]
  const a = /^- (\S+) — (.+)$/.exec(line)
  if (a) planned.set(a[1], { category: cat, title: a[2] })
}

function walk(dir) {
  return fs.existsSync(dir)
    ? fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
        const p = path.join(dir, e.name)
        return e.isDirectory() ? walk(p) : p.endsWith('.md') ? [p] : []
      })
    : []
}

const written = new Map()
for (const f of walk('content/articles')) {
  const src = fs.readFileSync(f, 'utf8')
  let data = {}
  let body = src
  try {
    ;({ data, content: body } = matter(src))
  } catch {}
  const slug = path.basename(f, '.md')
  written.set(slug, {
    file: f,
    words: body.split(/\s+/).filter(Boolean).length,
    links: (body.match(/\]\((?![a-z]+:)[^)]+\)/g) ?? []).length,
    draft: !!data.draft,
  })
}

const glossaryCount = fs.existsSync('content/glossary')
  ? fs.readdirSync('content/glossary').filter((f) => f.endsWith('.json')).reduce((n, f) => {
      try {
        return n + JSON.parse(fs.readFileSync(path.join('content/glossary', f), 'utf8')).length
      } catch {
        return n
      }
    }, 0)
  : 0

const missing = [...planned].filter(([slug]) => !written.has(slug))
const extra = [...written.keys()].filter((s) => !planned.has(s))
const short = [...written].filter(([, w]) => w.words < 250)
const noLinks = [...written].filter(([, w]) => w.links === 0)
const drafts = [...written].filter(([, w]) => w.draft)
const totalWords = [...written.values()].reduce((n, w) => n + w.words, 0)

console.log(`Статей: ${written.size} из ${planned.size} по плану · ${totalWords.toLocaleString('ru')} слов · терминов в словаре: ${glossaryCount}`)
const byCat = {}
for (const [slug, p] of planned) {
  byCat[p.category] ??= { done: 0, total: 0 }
  byCat[p.category].total++
  if (written.has(slug)) byCat[p.category].done++
}
for (const [c, v] of Object.entries(byCat)) console.log(`  ${c.padEnd(14)} ${v.done}/${v.total}${v.done === v.total ? ' ✓' : ''}`)
if (missing.length) console.log(`\nНе написаны (${missing.length}):\n  ${missing.map(([s, p]) => `${p.category}/${s}`).join('\n  ')}`)
if (extra.length) console.log(`\nВне плана: ${extra.join(', ')}`)
if (short.length) console.log(`\nКороче 250 слов: ${short.map(([s, w]) => `${s} (${w.words})`).join(', ')}`)
if (noLinks.length) console.log(`\nБез ссылок на другие статьи: ${noLinks.map(([s]) => s).join(', ')}`)
if (drafts.length) console.log(`\nЧерновики: ${drafts.map(([s]) => s).join(', ')}`)
