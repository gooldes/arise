// pdf.js грузится лениво из public/pdfjs — только когда открывают книгу.
type PdfJs = typeof import('pdfjs-dist')

export const assetUrl = (p: string) => new URL(p, document.baseURI).href

let loading: Promise<PdfJs> | null = null

export function loadPdfjs(): Promise<PdfJs> {
  loading ??= import(/* @vite-ignore */ assetUrl('pdfjs/pdf.min.mjs')).then((m: PdfJs) => {
    m.GlobalWorkerOptions.workerSrc = assetUrl('pdfjs/pdf.worker.min.mjs')
    return m
  })
  loading.catch(() => (loading = null))
  return loading
}

/** Возвращает задачу загрузки: task.promise — документ, task.destroy() — освободить воркер и память */
export async function openPdf(file: string) {
  const pdfjs = await loadPdfjs()
  return pdfjs.getDocument({
    url: assetUrl(`books/${file}`),
    cMapUrl: assetUrl('pdfjs/cmaps/'),
    cMapPacked: true,
    standardFontDataUrl: assetUrl('pdfjs/standard_fonts/'),
    wasmUrl: assetUrl('pdfjs/wasm/'),
  })
}
