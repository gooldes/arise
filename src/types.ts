export type Urgency = 'critical' | 'important' | 'normal'

export interface Category {
  id: string
  title: string
  icon: string
  description: string
  /** Порядок подразделов; у небольших категорий подразделов нет */
  sections?: string[]
}

export interface Article {
  slug: string
  title: string
  category: string
  section?: string
  /** Латинское название (для карточек справочника видов) */
  latin?: string
  /** «Сделайте сейчас»: 3–7 коротких шагов для экстренных статей (HTML, уже со ссылками) */
  quick?: string[]
  /** Главная картинка: img/<name>.webp — миниатюра в списках и крупно вверху статьи */
  image?: string
  /** Подпись к главной картинке (автор, лицензия) */
  imageCredit?: string
  summary: string
  tags: string[]
  urgency: Urgency
  /** Показывать на экране SOS */
  sos: boolean
  order: number
  draft: boolean
  updated?: string
  /** В статье есть таблицы запасов с пересчётом на семью */
  hasSupplies: boolean
  /** Количество пунктов чек-листа (галочки) */
  checklistSize: number
  /** Связанные статьи: заданные вручную + подобранные автоматически */
  related: string[]
  /** Готовый HTML (markdown рендерится на этапе сборки, термины уже размечены) */
  html: string
  /** Плоский текст для поиска и сниппетов */
  text: string
}

export interface Term {
  id: string
  term: string
  definition: string
  article?: string
}

export interface Book {
  id: string
  file: string
  title: string
  author: string
  year?: number
  description: string
  category: string
  license: string
  source?: string
  pages?: number
  sizeMb: number
  /** Есть ли извлечённый текст для поиска по книге */
  searchable: boolean
}
