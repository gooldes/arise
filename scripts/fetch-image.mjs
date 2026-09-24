// Скачивает картинку с Wikimedia Commons для карточки справочника и печатает подпись.
//   node scripts/fetch-image.mjs <slug> "<Commons file name | ru-wiki article title>"
// Примеры:
//   node scripts/fetch-image.mjs nettle "File:Urtica dioica10 ies.jpg"
//   node scripts/fetch-image.mjs nettle "wiki:Крапива двудомная"     (главная картинка статьи ру-Википедии)
// Берёт только свободные лицензии (Public domain, CC0, CC BY, CC BY-SA). Сохраняет content/images/<slug>.jpg
// (900 px по ширине) и дописывает подпись в content/images/credits.json.
import fs from 'node:fs'
import path from 'node:path'

const [slug, source] = process.argv.slice(2)
if (!slug || !source) {
  console.error('usage: node scripts/fetch-image.mjs <slug> "File:Name.jpg" | "wiki:Название статьи"')
  process.exit(1)
}
const UA = { 'User-Agent': 'AriseOfflineHandbook/1.0 (non-commercial offline survival handbook)' }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
// Wikimedia ограничивает частоту запросов (429) — ждём и повторяем
async function politeFetch(url) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const r = await fetch(url, { headers: UA })
    if (r.status !== 429 && r.status !== 503) return r
    const wait = Number(r.headers.get('retry-after')) * 1000 || 5000 * 2 ** attempt
    console.error(`429/503, жду ${Math.round(wait / 1000)} с…`)
    await sleep(wait)
  }
  throw new Error('Wikimedia: слишком много запросов, попробуйте позже')
}
const api = async (host, params) => {
  const url = `https://${host}/w/api.php?` + new URLSearchParams({ format: 'json', ...params })
  const r = await politeFetch(url)
  if (!r.ok) throw new Error(`${host} ${r.status}`)
  return r.json()
}

let file = source
if (source.startsWith('wiki:')) {
  const d = await api('ru.wikipedia.org', { action: 'query', prop: 'pageimages', piprop: 'name', redirects: '1', titles: source.slice(5) })
  const page = Object.values(d.query.pages)[0]
  if (!page.pageimage) throw new Error('У статьи нет главной картинки')
  file = 'File:' + page.pageimage
}
if (!file.startsWith('File:')) file = 'File:' + file

const d = await api('commons.wikimedia.org', { action: 'query', titles: file, prop: 'imageinfo', iiprop: 'url|extmetadata|mime', iiurlwidth: '900' })
const page = Object.values(d.query.pages)[0]
const info = page.imageinfo?.[0]
if (!info) throw new Error(`Файл не найден на Commons: ${file}`)
const meta = info.extmetadata ?? {}
const strip = (s = '') => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
const license = strip(meta.LicenseShortName?.value)
const artist = strip(meta.Artist?.value) || 'неизвестен'
if (!/^(public domain|pd|cc0|cc by(-sa)?( \d(\.\d)?)?)/i.test(license) || /nc|nd/i.test(license.replace(/^cc by-sa/i, ''))) {
  throw new Error(`Несвободная лицензия «${license}» — выберите другой файл`)
}
if (!/image\/(jpeg|png|webp)/.test(info.mime)) throw new Error(`Неподдерживаемый формат ${info.mime}`)

const img = await politeFetch(info.thumburl || info.url)
if (!img.ok) throw new Error(`download ${img.status}`)
const out = path.join('content/images', `${slug}.jpg`)
fs.mkdirSync('content/images', { recursive: true })
fs.writeFileSync(out, Buffer.from(await img.arrayBuffer()))

const shortArtist = artist.replace(/^This (picture|image).*?by (using )?/i, '').split(/[,;(]| by using /)[0].trim().slice(0, 60) || 'неизвестен'
const credit = `Фото: ${shortArtist}, ${license}, Wikimedia Commons`
const creditsFile = 'content/images/credits.json'
const credits = fs.existsSync(creditsFile) ? JSON.parse(fs.readFileSync(creditsFile, 'utf8')) : {}
credits[slug] = { file: page.title, credit, license, artist, source: info.descriptionurl }
fs.writeFileSync(creditsFile, JSON.stringify(credits, null, 2))
console.log(JSON.stringify({ saved: out, file: page.title, credit }))
