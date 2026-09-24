// Генерирует PNG-иконки из public/icons/icon.svg (нужны Android и iOS).
import fs from 'node:fs'
import sharp from 'sharp'

const SRC = 'public/icons/icon.svg'
const OUT = 'public/icons'
const srcTime = fs.statSync(SRC).mtimeMs

const targets = [
  { file: 'icon-192.png', size: 192 },
  { file: 'icon-512.png', size: 512 },
  { file: 'apple-touch-icon.png', size: 180 },
  { file: 'icon-maskable-512.png', size: 512, padding: 0.12 },
]

for (const t of targets) {
  const out = `${OUT}/${t.file}`
  if (fs.existsSync(out) && fs.statSync(out).mtimeMs > srcTime) continue
  const inner = Math.round(t.size * (1 - 2 * (t.padding ?? 0)))
  let img = sharp(SRC, { density: 300 }).resize(inner, inner)
  if (t.padding) {
    const pad = Math.round((t.size - inner) / 2)
    img = img.extend({ top: pad, bottom: t.size - inner - pad, left: pad, right: t.size - inner - pad, background: '#16181a' })
  }
  await img.png({ compressionLevel: 9 }).toFile(out)
  console.log(`icons: ${out}`)
}
