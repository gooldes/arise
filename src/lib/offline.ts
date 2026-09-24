import { createStore } from './store'

export const isFileMode = location.protocol === 'file:'
export const swSupported = 'serviceWorker' in navigator && /^https?:$/.test(location.protocol)

export const isStandalone =
  matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true

export const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/** Событие установки PWA (Chrome/Android) — появляется, когда браузер готов предложить установку */
export const installPrompt = createStore<InstallPromptEvent | null>(null)
export const updateReady = createStore(false)

export function registerServiceWorker() {
  addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    installPrompt.set(e as InstallPromptEvent)
  })
  addEventListener('appinstalled', () => installPrompt.set(null))

  if (!swSupported || import.meta.env.DEV) return
  const hadController = !!navigator.serviceWorker.controller
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController) updateReady.set(true)
  })
  addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((err) => console.warn('SW не зарегистрирован', err))
    // Просим браузер не удалять кэш при нехватке места
    navigator.storage?.persist?.().catch(() => {})
  })
}

export interface OfflineStatus {
  state: 'ready' | 'downloading' | 'file' | 'dev' | 'unsupported' | 'error'
  cached?: number
  total?: number
  version?: string
  persisted?: boolean
  usageMb?: number
}

export async function getOfflineStatus(): Promise<OfflineStatus> {
  if (isFileMode) return { state: 'file' }
  if (import.meta.env.DEV) return { state: 'dev' }
  if (!swSupported) return { state: 'unsupported' }
  try {
    const reg = await navigator.serviceWorker.getRegistration()
    const persisted = await navigator.storage?.persisted?.().catch(() => false)
    const estimate = await navigator.storage?.estimate?.().catch(() => undefined)
    const usageMb = estimate?.usage ? estimate.usage / 1024 / 1024 : undefined
    if (!reg?.active) return { state: 'downloading', persisted, usageMb }
    const info = await askWorker(reg.active)
    return {
      state: info.cached >= info.total ? 'ready' : 'downloading',
      ...info,
      persisted,
      usageMb,
    }
  } catch {
    return { state: 'error' }
  }
}

function askWorker(worker: ServiceWorker): Promise<{ cached: number; total: number; version: string }> {
  return new Promise((resolve, reject) => {
    const channel = new MessageChannel()
    const timer = setTimeout(() => reject(new Error('timeout')), 3000)
    channel.port1.onmessage = (e) => {
      clearTimeout(timer)
      resolve(e.data)
    }
    worker.postMessage({ type: 'status' }, [channel.port2])
  })
}
