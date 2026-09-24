// Лёгкий стеммер для русского: срезает типовые окончания,
// чтобы «кровотечение», «кровотечения», «кровотечении» находились одним запросом.

const ENDINGS = [
  'ениями', 'аниями', 'ениях', 'аниях', 'ением', 'анием',
  'иями', 'ями', 'ами', 'ией', 'иям', 'ием', 'иях', 'ого', 'его', 'ому', 'ему', 'ыми', 'ими',
  'ться', 'тся', 'ешь', 'ишь', 'ете', 'ите', 'ают', 'яют', 'уют', 'ует', 'ать', 'ять', 'еть', 'ить', 'уть', 'ная', 'ное', 'ные', 'ный',
  'ение', 'ания', 'ения', 'ание', 'ении', 'ании',
  'ая', 'яя', 'ое', 'ее', 'ые', 'ие', 'ый', 'ий', 'ой', 'ом', 'ем', 'ам', 'ям', 'ах', 'ях', 'ую', 'юю',
  'ов', 'ев', 'ей', 'ия', 'ье', 'ья', 'ью', 'ии', 'ию', 'ут', 'ют', 'ит', 'ет', 'ла', 'ли', 'ло',
  'а', 'я', 'о', 'е', 'ы', 'и', 'у', 'ю', 'ь', 'й',
].sort((a, b) => b.length - a.length)

const STOP_WORDS = new Set([
  'и', 'в', 'во', 'на', 'с', 'со', 'по', 'для', 'не', 'от', 'при', 'как', 'что', 'это', 'или', 'из', 'к', 'ко',
  'о', 'об', 'а', 'но', 'же', 'ли', 'бы', 'до', 'за', 'то', 'у', 'так', 'его', 'её', 'их', 'если', 'чтобы',
])

export function normalize(s: string): string {
  return s.toLowerCase().replace(/ё/g, 'е')
}

export function stem(word: string): string {
  if (word.length < 4 || !/[а-я]/.test(word)) return word
  for (const end of ENDINGS) {
    if (word.endsWith(end) && word.length - end.length >= 3) return word.slice(0, -end.length)
  }
  return word
}

export function tokenize(s: string): string[] {
  return s.split(/[^\p{L}\p{N}]+/u).filter(Boolean)
}

/** Нормализация термина для индекса и запроса; null — стоп-слово */
export function processTerm(term: string): string | null {
  const t = normalize(term)
  if (STOP_WORDS.has(t)) return null
  return stem(t)
}
