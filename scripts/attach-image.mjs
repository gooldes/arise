// Прописывает image и image_credit в карточку по данным content/images/credits.json
//   node scripts/attach-image.mjs <slug> [<slug> …]
import fs from 'node:fs'
import { globSync } from 'node:fs'
const credits = JSON.parse(fs.readFileSync('content/images/credits.json', 'utf8'))
for (const slug of process.argv.slice(2)) {
  const [file] = globSync(`content/articles/*/${slug}.md`)
  if (!file || !credits[slug]) {
    console.error(`${slug}: нет карточки или записи в credits.json`)
    continue
  }
  let src = fs.readFileSync(file, 'utf8')
  src = src.replace(/^image:.*\n/m, '').replace(/^image_credit:.*\n/m, '')
  src = src.replace(/^(summary:.*\n)/m, `$1image: ${slug}.jpg\nimage_credit: ${JSON.stringify(credits[slug].credit)}\n`)
  fs.writeFileSync(file, src)
  console.log(`${slug}: ${credits[slug].credit}`)
}
