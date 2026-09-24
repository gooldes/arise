// Калькуляторы в статьях: блок ```calc в Markdown.
//
// ```calc title="Объём бетона"
// L: Длина ленты, м = 30
// wood: Порода = 1 [Сосна=1; Дуб=1.3]
// ---
// V: Объём бетона, м³ = L*b*h*1.05
// ! V > 10: Больше 10 м³ — вручную не замесить, делите на захватки
// # Коэффициент 1,05 — запас на потери.
// ```
//
// До «---» — поля ввода (число или выбор из списка), после — результаты и предупреждения.
// Формулы: + - * / ^, скобки, сравнения (< > <= >= == !=), функции ниже, константа pi.
// Здесь только разбор и вычисление — без eval, чтобы работало и в сборке, и в браузере.

export interface CalcInput {
  id: string
  label: string
  value: number
  options?: { label: string; value: number }[]
}
export interface CalcOutput {
  id: string
  label: string
  expr: string
}
export interface CalcWarning {
  when: string
  text: string
}
export interface CalcSpec {
  title: string
  inputs: CalcInput[]
  outputs: CalcOutput[]
  warnings: CalcWarning[]
  notes: string[]
}

const FUNCS: Record<string, (...a: number[]) => number> = {
  sqrt: Math.sqrt,
  abs: Math.abs,
  min: Math.min,
  max: Math.max,
  ceil: Math.ceil,
  floor: Math.floor,
  round: (x, d = 0) => Math.round(x * 10 ** d) / 10 ** d,
  pow: Math.pow,
  ln: Math.log,
  log10: Math.log10,
  exp: Math.exp,
  // тригонометрия в градусах — так привычнее для уклонов и углов
  sin: (d) => Math.sin((d * Math.PI) / 180),
  cos: (d) => Math.cos((d * Math.PI) / 180),
  tan: (d) => Math.tan((d * Math.PI) / 180),
  atan: (x) => (Math.atan(x) * 180) / Math.PI,
  asin: (x) => (Math.asin(x) * 180) / Math.PI,
  acos: (x) => (Math.acos(x) * 180) / Math.PI,
  if: (c, a, b) => (c ? a : b),
}

type Node =
  | { t: 'num'; v: number }
  | { t: 'var'; name: string }
  | { t: 'un'; op: string; a: Node }
  | { t: 'bin'; op: string; a: Node; b: Node }
  | { t: 'call'; fn: string; args: Node[] }

const TOKEN = /\s*(?:(\d+(?:\.\d+)?(?:e[+-]?\d+)?)|([A-Za-z_][A-Za-z0-9_]*)|(<=|>=|==|!=|&&|\|\||[-+*/^(),<>!]))/y

function tokenize(src: string): string[] {
  const out: string[] = []
  TOKEN.lastIndex = 0
  while (TOKEN.lastIndex < src.length) {
    if (/^\s*$/.test(src.slice(TOKEN.lastIndex))) break
    const at = TOKEN.lastIndex
    const m = TOKEN.exec(src)
    if (!m) throw new Error(`непонятный символ «${src.slice(at).trim()[0]}»`)
    out.push(m[1] ?? m[2] ?? m[3])
  }
  return out
}

/** Разбор выражения в дерево; бросает ошибку с понятным текстом */
export function parseExpr(src: string): Node {
  const tk = tokenize(src)
  let i = 0
  const peek = () => tk[i]
  const take = (s?: string) => {
    const t = tk[i++]
    if (s && t !== s) throw new Error(`ожидалось «${s}», а стоит «${t ?? 'конец'}»`)
    return t
  }
  const LEVELS = [['||'], ['&&'], ['==', '!='], ['<', '>', '<=', '>='], ['+', '-'], ['*', '/']]
  function level(n: number): Node {
    if (n === LEVELS.length) return unary()
    let a = level(n + 1)
    while (LEVELS[n].includes(peek())) {
      const op = take()
      a = { t: 'bin', op, a, b: level(n + 1) }
    }
    return a
  }
  function unary(): Node {
    if (peek() === '-' || peek() === '+' || peek() === '!') {
      const op = take()
      return { t: 'un', op, a: unary() }
    }
    return power()
  }
  function power(): Node {
    const base = atom()
    if (peek() === '^') {
      take()
      return { t: 'bin', op: '^', a: base, b: unary() }
    }
    return base
  }
  function atom(): Node {
    const t = take()
    if (t === undefined) throw new Error('выражение оборвано')
    if (t === '(') {
      const e = level(0)
      take(')')
      return e
    }
    if (/^\d/.test(t)) return { t: 'num', v: Number(t) }
    if (/^[A-Za-z_]/.test(t)) {
      if (peek() === '(') {
        if (!FUNCS[t]) throw new Error(`нет функции ${t}()`)
        take('(')
        const args: Node[] = []
        if (peek() !== ')') {
          args.push(level(0))
          while (peek() === ',') {
            take()
            args.push(level(0))
          }
        }
        take(')')
        return { t: 'call', fn: t, args }
      }
      return { t: 'var', name: t }
    }
    throw new Error(`лишний знак «${t}»`)
  }
  const tree = level(0)
  if (i < tk.length) throw new Error(`лишнее в конце: «${tk.slice(i).join(' ')}»`)
  return tree
}

export function evalExpr(n: Node, vars: Record<string, number>): number {
  switch (n.t) {
    case 'num':
      return n.v
    case 'var':
      if (n.name === 'pi') return Math.PI
      return vars[n.name] ?? NaN
    case 'un': {
      const a = evalExpr(n.a, vars)
      return n.op === '-' ? -a : n.op === '!' ? Number(!a) : a
    }
    case 'call':
      return FUNCS[n.fn](...n.args.map((x) => evalExpr(x, vars)))
    case 'bin': {
      const a = evalExpr(n.a, vars)
      const b = evalExpr(n.b, vars)
      switch (n.op) {
        case '+': return a + b
        case '-': return a - b
        case '*': return a * b
        case '/': return a / b
        case '^': return a ** b
        case '<': return Number(a < b)
        case '>': return Number(a > b)
        case '<=': return Number(a <= b)
        case '>=': return Number(a >= b)
        case '==': return Number(a === b)
        case '!=': return Number(a !== b)
        case '&&': return Number(Boolean(a) && Boolean(b))
        case '||': return Number(Boolean(a) || Boolean(b))
      }
    }
  }
  return NaN
}

function varsOf(n: Node, acc = new Set<string>()): Set<string> {
  if (n.t === 'var' && n.name !== 'pi') acc.add(n.name)
  if (n.t === 'un') varsOf(n.a, acc)
  if (n.t === 'bin') (varsOf(n.a, acc), varsOf(n.b, acc))
  if (n.t === 'call') n.args.forEach((x) => varsOf(x, acc))
  return acc
}

const ID = /^[A-Za-z_][A-Za-z0-9_]*$/

/** Разбор блока ```calc; ошибки складываются в errors (сборка их показывает) */
export function parseCalc(args: string, body: string, errors: string[]): CalcSpec {
  const title = /title="([^"]*)"/.exec(args)?.[1] ?? 'Калькулятор'
  const spec: CalcSpec = { title, inputs: [], outputs: [], warnings: [], notes: [] }
  const known = new Set<string>()
  let part: 'in' | 'out' = 'in'
  const check = (expr: string, where: string) => {
    try {
      for (const v of varsOf(parseExpr(expr))) if (!known.has(v)) errors.push(`${where}: неизвестная переменная «${v}»`)
    } catch (e) {
      errors.push(`${where}: ${(e as Error).message}`)
    }
  }
  for (const raw of body.split('\n')) {
    const line = raw.trim()
    if (!line) continue
    if (line === '---') {
      part = 'out'
      continue
    }
    if (line.startsWith('#')) {
      spec.notes.push(line.replace(/^#\s*/, ''))
      continue
    }
    if (line.startsWith('!')) {
      const m = /^!\s*(.+?):\s+(.+)$/.exec(line)
      if (!m) {
        errors.push(`calc «${title}»: предупреждение без «условие: текст» — ${line}`)
        continue
      }
      check(m[1], `calc «${title}», условие «${m[1]}»`)
      spec.warnings.push({ when: m[1], text: m[2] })
      continue
    }
    // id: Подпись = значение/формула  (в подписи не должно быть « = »)
    const m = /^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.+?)\s+=\s+(.+)$/.exec(line)
    if (!m) {
      errors.push(`calc «${title}»: не понял строку «${line}» (нужно «id: Подпись = значение»)`)
      continue
    }
    const [, id, label, rest] = m
    if (!ID.test(id) || known.has(id) || FUNCS[id] || id === 'pi') {
      errors.push(`calc «${title}»: имя «${id}» занято или недопустимо`)
      continue
    }
    if (part === 'in') {
      const opt = /^(-?\d+(?:\.\d+)?)\s*(?:\[(.+)\])?$/.exec(rest)
      if (!opt) {
        errors.push(`calc «${title}»: у поля «${id}» значение должно быть числом (дробь через точку)`)
        continue
      }
      const input: CalcInput = { id, label, value: Number(opt[1]) }
      if (opt[2]) {
        input.options = opt[2].split(';').map((o) => {
          const [l, v] = o.split('=').map((s) => s.trim())
          if (!l || v === undefined || isNaN(Number(v))) errors.push(`calc «${title}»: вариант «${o.trim()}» — нужно «Название=число»`)
          return { label: l ?? '', value: Number(v) }
        })
        if (!input.options.some((o) => o.value === input.value))
          errors.push(`calc «${title}»: значение по умолчанию поля «${id}» не совпадает ни с одним вариантом`)
      }
      spec.inputs.push(input)
    } else {
      check(rest, `calc «${title}», результат «${id}»`)
      spec.outputs.push({ id, label, expr: rest })
    }
    known.add(id)
  }
  if (!spec.inputs.length || !spec.outputs.length) errors.push(`calc «${title}»: нужны и поля, и результаты (разделитель ---)`)
  return spec
}

/** Посчитать все результаты по введённым значениям */
export function runCalc(spec: CalcSpec, values: Record<string, number>) {
  const vars: Record<string, number> = { ...values }
  const results: Record<string, number> = {}
  for (const o of spec.outputs) {
    try {
      vars[o.id] = results[o.id] = evalExpr(parseExpr(o.expr), vars)
    } catch {
      vars[o.id] = results[o.id] = NaN
    }
  }
  const warnings = spec.warnings.filter((w) => {
    try {
      return Boolean(evalExpr(parseExpr(w.when), vars))
    } catch {
      return false
    }
  })
  return { results, warnings: warnings.map((w) => w.text) }
}

export function formatNumber(n: number): string {
  if (!isFinite(n)) return '—'
  const abs = Math.abs(n)
  const digits = abs >= 100 ? 0 : abs >= 10 ? 1 : abs >= 1 ? 2 : 3
  return n.toLocaleString('ru-RU', { maximumFractionDigits: digits })
}

/** Оживить калькуляторы, собранные при сборке в <fieldset class="calc"> */
export function hydrateCalcs(root: HTMLElement): () => void {
  const cleanups: (() => void)[] = []
  root.querySelectorAll<HTMLFieldSetElement>('fieldset.calc').forEach((box) => {
    let spec: CalcSpec
    try {
      spec = JSON.parse(box.dataset.spec ?? '')
    } catch {
      return
    }
    const update = () => {
      const values: Record<string, number> = {}
      box.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-v]').forEach((el) => {
        const v = Number(el.value.replace(',', '.').replace(/\s/g, ''))
        el.classList.toggle('is-bad', el.value.trim() === '' || isNaN(v))
        values[el.dataset.v!] = v
      })
      const { results, warnings } = runCalc(spec, values)
      box.querySelectorAll<HTMLOutputElement>('output[data-o]').forEach((out) => {
        out.textContent = formatNumber(results[out.dataset.o!])
      })
      const warn = box.querySelector<HTMLElement>('.calc__warn')
      if (warn) {
        warn.hidden = warnings.length === 0
        warn.replaceChildren(
          ...warnings.map((w) => {
            const p = document.createElement('p')
            p.textContent = `⚠️ ${w}`
            return p
          }),
        )
      }
    }
    box.addEventListener('input', update)
    box.addEventListener('change', update)
    cleanups.push(() => {
      box.removeEventListener('input', update)
      box.removeEventListener('change', update)
    })
  })
  return () => cleanups.forEach((c) => c())
}
