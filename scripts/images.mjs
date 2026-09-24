// Конвертирует content/images/* → public/img/*.webp (макс. 1200px по ширине).
// SVG копируются как есть — для схем это самый компактный формат.
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const SRC = 'content/images'
const OUT = 'public/img'
const MAX_WIDTH = 900
const QUALITY = 62
const RASTER = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.tif', '.tiff', '.avif'])

fs.mkdirSync(OUT, { recursive: true })
const sources = fs.existsSync(SRC) ? fs.readdirSync(SRC).filter((f) => !f.startsWith('.')) : []
const expected = new Set()
let saved = 0

for (const file of sources) {
  const ext = path.extname(file).toLowerCase()
  const name = path.basename(file, path.extname(file))
  const src = path.join(SRC, file)
  if (ext === '.svg') {
    const out = path.join(OUT, `${name}.svg`)
    expected.add(path.basename(out))
    fs.copyFileSync(src, out)
    continue
  }
  if (!RASTER.has(ext)) {
    console.warn(`images: пропущен ${file} (неподдерживаемый формат)`)
    continue
  }
  const out = path.join(OUT, `${name}.webp`)
  expected.add(path.basename(out))
  if (fs.existsSync(out) && fs.statSync(out).mtimeMs > fs.statSync(src).mtimeMs) continue
  await sharp(src)
    .rotate()
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: QUALITY, effort: 6 })
    .toFile(out)
  const before = fs.statSync(src).size
  const after = fs.statSync(out).size
  saved += before - after
  console.log(`images: ${file} → ${path.basename(out)} (${kb(before)} → ${kb(after)})`)
}

// Удаляем устаревшие файлы, чтобы не раздувать офлайн-кэш
for (const f of fs.readdirSync(OUT)) {
  if (!f.startsWith('.') && !expected.has(f)) {
    fs.rmSync(path.join(OUT, f))
    console.log(`images: удалён устаревший ${f}`)
  }
}
if (saved > 0) console.log(`images: сэкономлено ${kb(saved)}`)

function kb(n) {
  return `${(n / 1024).toFixed(0)} КБ`
}
