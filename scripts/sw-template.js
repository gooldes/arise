// Сгенерировано scripts/postbuild.mjs — не редактировать dist/sw.js вручную.
const VERSION = '__VERSION__'
const FILES = __FILES__
const CACHE = 'arise-' + VERSION

// Установка: скачиваем ВСЁ. addAll атомарен — либо весь контент в кэше, либо установка не удалась.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(FILES.map((f) => new Request(f, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('arise-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

// Cache-first: сеть нужна только если файла почему-то нет в кэше.
self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const hit = await cache.match(req, { ignoreSearch: true })
      if (hit) return hit
      if (req.mode === 'navigate') {
        const shell = await cache.match('./index.html')
        if (shell) return shell
      }
      return fetch(req)
    }),
  )
})

self.addEventListener('message', async (event) => {
  if (event.data?.type !== 'status') return
  const cache = await caches.open(CACHE)
  const cached = (await cache.keys()).length
  event.ports[0]?.postMessage({ version: VERSION, total: FILES.length, cached })
})
