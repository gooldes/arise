// После vite build:
//  1. генерирует dist/sw.js со списком ВСЕХ файлов для офлайн-кэша;
//  2. проверяет лимит размера;
//  3. собирает release/arise/ и release/arise-offline.zip (открывается двойным кликом по index.html).
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const DIST = 'dist'
const RELEASE = 'release'
const WARN_MB = 100
const MAX_MB = 150

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name)
    return e.isDirectory() ? walk(p) : [p]
  })
}

const files = walk(DIST)
  .filter((f) => !f.endsWith('sw.js') && !path.basename(f).startsWith('.'))
  .sort()

const hash = crypto.createHash('sha256')
let total = 0
for (const f of files) {
  const buf = fs.readFileSync(f)
  total += buf.length
  hash.update(f).update(buf)
}
const version = hash.digest('hex').slice(0, 12)
const urls = ['./', ...files.map((f) => './' + path.relative(DIST, f).split(path.sep).join('/'))]

const sw = fs
  .readFileSync('scripts/sw-template.js', 'utf8')
  .replace('__VERSION__', version)
  .replace('__FILES__', JSON.stringify(urls, null, 2))
fs.writeFileSync(path.join(DIST, 'sw.js'), sw)

const mb = total / 1024 / 1024
const byKind = {}
for (const f of files) {
  const kind = path.relative(DIST, f).split(path.sep)[0].replace(/\..*$/, '') || 'root'
  byKind[kind] = (byKind[kind] ?? 0) + fs.statSync(f).size
}
console.log(`\nОфлайн-пакет: ${files.length} файлов, ${mb.toFixed(2)} МБ, версия ${version}`)
for (const [k, v] of Object.entries(byKind)) console.log(`  ${k.padEnd(12)} ${(v / 1024).toFixed(0)} КБ`)
if (mb > MAX_MB) {
  console.error(`\n✖ Превышен жёсткий лимит ${MAX_MB} МБ`)
  process.exit(1)
}
if (mb > WARN_MB) console.warn(`\n⚠ Больше целевых ${WARN_MB} МБ — пора сжимать картинки`)

// release/arise — папка для открытия на компьютере, release/arise-offline.zip — для пересылки
const appDir = path.join(RELEASE, 'arise')
fs.rmSync(appDir, { recursive: true, force: true })
fs.mkdirSync(RELEASE, { recursive: true })
fs.cpSync(DIST, appDir, { recursive: true })
fs.writeFileSync(
  path.join(appDir, 'КАК-ОТКРЫТЬ.txt'),
  [
    'Arise — офлайн-справочник по выживанию',
    '',
    'Компьютер: распакуйте архив и откройте файл index.html в любом браузере',
    '(Chrome, Firefox, Edge, Safari). Интернет не нужен.',
    '',
    'Телефон: удобнее всего установить приложение с сайта, где оно размещено,',
    '(меню браузера → «Добавить на главный экран») — после первого открытия',
    'весь контент сохраняется на телефоне и работает без интернета.',
    '',
  ].join('\n'),
)

const zipPath = path.join(RELEASE, 'arise-offline.zip')
fs.rmSync(zipPath, { force: true })
try {
  execFileSync('zip', ['-rq9', 'arise-offline.zip', 'arise'], { cwd: RELEASE })
  console.log(`\nГотово: ${appDir}/index.html и ${zipPath} (${(fs.statSync(zipPath).size / 1024 / 1024).toFixed(2)} МБ)`)
} catch {
  console.warn(`\n⚠ Утилита zip не найдена — архив не создан, папка готова: ${appDir}`)
}
