// Книги: content/books/*.pdf → public/books/ + постраничный текст для офлайн-поиска
// (public/books/<id>.pages.json, нужен pdftotext из poppler: brew install poppler).
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const SRC = 'content/books'
const OUT = 'public/books'
const META = path.join(SRC, 'books.json')

fs.mkdirSync(OUT, { recursive: true })
const books = fs.existsSync(META) ? JSON.parse(fs.readFileSync(META, 'utf8')) : []
const expected = new Set()

let hasPdftotext = true
try {
  execFileSync('pdftotext', ['-v'], { stdio: 'ignore' })
} catch {
  hasPdftotext = false
  console.warn('books: pdftotext не найден — поиск по книгам будет недоступен (brew install poppler)')
}

for (const b of books) {
  const src = path.join(SRC, b.file)
  if (!fs.existsSync(src)) {
    console.warn(`books: нет файла ${src}`)
    continue
  }
  const out = path.join(OUT, b.file)
  expected.add(b.file)
  if (!fs.existsSync(out) || fs.statSync(out).mtimeMs < fs.statSync(src).mtimeMs) fs.copyFileSync(src, out)

  if (!hasPdftotext) continue
  const textFile = path.join(OUT, `${b.id}.pages.json`)
  expected.add(path.basename(textFile))
  if (fs.existsSync(textFile) && fs.statSync(textFile).mtimeMs > fs.statSync(src).mtimeMs) continue
  const raw = execFileSync('pdftotext', ['-enc', 'UTF-8', src, '-'], { maxBuffer: 512 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] }).toString('utf8')
  const pages = raw.split('\f').map((p) =>
    fixMojibake(p)
      .replace(/-\n(?=[а-яёa-z])/g, '') // переносы слов
      .replace(/\s+/g, ' ')
      .trim(),
  )
  if (pages.at(-1) === '') pages.pop()
  const textChars = pages.reduce((n, p) => n + p.length, 0)
  if (textChars < pages.length * 50) {
    console.warn(`books: ${b.file} — почти нет текстового слоя (скан?), поиск по книге отключён`)
    continue
  }
  fs.writeFileSync(textFile, JSON.stringify(pages))
  console.log(`books: ${b.file} — ${pages.length} стр., текст ${(fs.statSync(textFile).size / 1024).toFixed(0)} КБ`)
}

for (const f of fs.readdirSync(OUT)) {
  if (!f.startsWith('.') && !expected.has(f)) {
    fs.rmSync(path.join(OUT, f))
    console.log(`books: удалён устаревший ${f}`)
  }
}

// Некоторые старые PDF используют шрифты в кодировке Windows-1251 без таблицы Unicode:
// pdftotext отдаёт «Ïðèìå÷àíèå» вместо «Примечание». Перекодируем такие слова обратно.
function fixMojibake(text) {
  const cp1251 = new TextDecoder('windows-1251')
  return text.replace(/[\u00C0-\u00FF][\u00C0-\u00FF\u00A8\u00B8]+|(?<![\p{L}])[\u00C0-\u00FF](?![\p{L}])/gu, (run) => cp1251.decode(Uint8Array.from(run, (c) => c.charCodeAt(0))))
}
