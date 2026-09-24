// Проверка калькуляторов: node --experimental-strip-types scripts/check-calc.ts content/articles/calc/beam-load.md
// Печатает ошибки и результаты при значениях по умолчанию.
import fs from 'node:fs'
import { formatNumber, parseCalc, runCalc } from '../src/lib/calc.ts'

let failed = false
for (const file of process.argv.slice(2)) {
  const src = fs.readFileSync(file, 'utf8')
  for (const m of src.matchAll(/^```calc([^\n]*)\n([\s\S]*?)^```[ \t]*$/gm)) {
    const errors: string[] = []
    const spec = parseCalc(m[1], m[2], errors)
    console.log(`\n${file} — ${spec.title}`)
    if (errors.length) {
      failed = true
      errors.forEach((e) => console.log('  ОШИБКА:', e))
      continue
    }
    const { results, warnings } = runCalc(spec, Object.fromEntries(spec.inputs.map((i) => [i.id, i.value])))
    spec.inputs.forEach((i) => console.log(`  ${i.label} = ${i.value}`))
    spec.outputs.forEach((o) => console.log(`  → ${o.label}: ${formatNumber(results[o.id])}`))
    warnings.forEach((w) => console.log(`  ⚠ ${w}`))
  }
}
process.exit(failed ? 1 : 0)
