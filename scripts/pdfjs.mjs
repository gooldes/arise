// Копирует pdf.js в public/pdfjs — просмотрщик книг на телефоне (Android не показывает PDF сам).
// Если книг нет — удаляет, чтобы не раздувать офлайн-пакет.
import fs from 'node:fs'
import path from 'node:path'

const SRC = 'node_modules/pdfjs-dist'
const OUT = 'public/pdfjs'
const books = fs.existsSync('content/books/books.json') ? JSON.parse(fs.readFileSync('content/books/books.json', 'utf8')) : []

if (!books.length) {
  fs.rmSync(OUT, { recursive: true, force: true })
  process.exit(0)
}

const version = JSON.parse(fs.readFileSync(path.join(SRC, 'package.json'), 'utf8')).version
const stamp = path.join(OUT, '.version')
if (fs.existsSync(stamp) && fs.readFileSync(stamp, 'utf8') === version) process.exit(0)

fs.rmSync(OUT, { recursive: true, force: true })
fs.mkdirSync(OUT, { recursive: true })
for (const f of ['build/pdf.min.mjs', 'build/pdf.worker.min.mjs']) fs.copyFileSync(path.join(SRC, f), path.join(OUT, path.basename(f)))
for (const dir of ['cmaps', 'standard_fonts', 'wasm']) fs.cpSync(path.join(SRC, dir), path.join(OUT, dir), { recursive: true })
fs.writeFileSync(stamp, version)
console.log(`pdfjs: скопирован pdf.js ${version}`)
