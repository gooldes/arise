declare const __BUILD_DATE__: string

declare module 'virtual:content' {
  export const categories: import('./types').Category[]
  export const articles: Omit<import('./types').Article, 'text'>[]
  export const glossary: import('./types').Term[]
  export const books: import('./types').Book[]
}
